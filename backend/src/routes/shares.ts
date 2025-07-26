import { Router, Request, Response } from 'express';
import { Share, ShareType, ShareVisibility, SharePermission } from '../models/Share';
import { Session } from '../models/Session';
import { Evaluation } from '../models/Evaluation';
import { authenticateToken, optionalAuth } from '../middleware';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const router = Router();

// 共有設定作成
router.post('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const {
      resourceType,
      resourceId,
      visibility,
      password,
      allowedUsers,
      permissions,
      expiresAt,
      settings
    } = req.body;

    // 必須フィールドの検証
    if (!resourceType || !resourceId) {
      return res.status(400).json({
        status: 'error',
        message: 'リソースタイプとリソースIDは必須です'
      });
    }

    if (!Object.values(ShareType).includes(resourceType)) {
      return res.status(400).json({
        status: 'error',
        message: '無効なリソースタイプです'
      });
    }

    if (!mongoose.Types.ObjectId.isValid(resourceId)) {
      return res.status(400).json({
        status: 'error',
        message: '無効なリソースIDです'
      });
    }

    // リソースの存在確認と権限チェック
    let resource;
    const userId = new mongoose.Types.ObjectId(req.user!.userId);

    switch (resourceType) {
      case ShareType.SESSION_RESULTS:
        resource = await Session.findById(resourceId);
        if (!resource) {
          return res.status(404).json({
            status: 'error',
            message: 'セッションが見つかりません'
          });
        }
        // セッション作成者のみ共有可能
        if (!resource.creatorId.equals(userId)) {
          return res.status(403).json({
            status: 'error',
            message: 'このセッションを共有する権限がありません'
          });
        }
        break;
      
      case ShareType.EVALUATION:
        resource = await Evaluation.findById(resourceId);
        if (!resource) {
          return res.status(404).json({
            status: 'error',
            message: '評価が見つかりません'
          });
        }
        // 評価者本人のみ共有可能
        if (!resource.userId.equals(userId)) {
          return res.status(403).json({
            status: 'error',
            message: 'この評価を共有する権限がありません'
          });
        }
        break;
      
      default:
        return res.status(400).json({
          status: 'error',
          message: 'サポートされていないリソースタイプです'
        });
    }

    // 既存の共有設定をチェック
    const existingShare = await Share.findOne({
      resourceType,
      resourceId: new mongoose.Types.ObjectId(resourceId),
      creatorId: userId,
      isActive: true
    });

    if (existingShare) {
      return res.status(409).json({
        status: 'error',
        message: 'このリソースは既に共有されています',
        data: { shareId: existingShare._id }
      });
    }

    // パスワードのハッシュ化
    let hashedPassword;
    if (visibility === ShareVisibility.PASSWORD_PROTECTED && password) {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    // 共有トークン生成
    const shareToken = Share.generateShareToken();

    // 共有設定作成
    const share = new Share({
      resourceType,
      resourceId: new mongoose.Types.ObjectId(resourceId),
      creatorId: userId,
      shareToken,
      visibility: visibility || ShareVisibility.PRIVATE,
      password: hashedPassword,
      allowedUsers: allowedUsers ? allowedUsers.map((id: string) => new mongoose.Types.ObjectId(id)) : [],
      permissions: permissions || [SharePermission.VIEW],
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      settings: {
        allowComments: settings?.allowComments ?? true,
        allowDownload: settings?.allowDownload ?? false,
        showEvaluatorNames: settings?.showEvaluatorNames ?? false,
        showIndividualScores: settings?.showIndividualScores ?? true
      }
    });

    await share.save();

    // 作成された共有設定を取得（パスワードは除外）
    const createdShare = await Share.findById(share._id)
      .populate('allowedUsers', 'username profile.displayName')
      .select('-password');

    const shareUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/share/${shareToken}`;

    return res.status(201).json({
      status: 'success',
      data: {
        share: createdShare,
        shareUrl
      }
    });

  } catch (error) {
    console.error('共有設定作成エラー:', error);
    return res.status(500).json({
      status: 'error',
      message: '共有設定の作成に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// 共有設定一覧取得
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { resourceType, page = 1, limit = 10 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const userId = new mongoose.Types.ObjectId(req.user!.userId);

    // フィルター条件の構築
    const filter: any = { creatorId: userId };
    if (resourceType && Object.values(ShareType).includes(resourceType as ShareType)) {
      filter.resourceType = resourceType;
    }

    // 共有設定一覧取得
    const [shares, total] = await Promise.all([
      Share.find(filter)
        .populate('allowedUsers', 'username profile.displayName')
        .populate('resourceId')
        .select('-password')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Share.countDocuments(filter)
    ]);

    // 共有URLを追加
    const sharesWithUrls = shares.map(share => ({
      ...share.toObject(),
      shareUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/share/${share.shareToken}`
    }));

    return res.json({
      status: 'success',
      data: {
        shares: sharesWithUrls,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      }
    });

  } catch (error) {
    console.error('共有設定一覧取得エラー:', error);
    return res.status(500).json({
      status: 'error',
      message: '共有設定一覧の取得に失敗しました'
    });
  }
});

// 共有設定詳細取得
router.get('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        status: 'error',
        message: '無効な共有設定IDです'
      });
    }

    const share = await Share.findById(id)
      .populate('allowedUsers', 'username profile.displayName')
      .populate('resourceId')
      .select('-password');

    if (!share) {
      return res.status(404).json({
        status: 'error',
        message: '共有設定が見つかりません'
      });
    }

    // 作成者のみアクセス可能
    if (!share.creatorId.equals(new mongoose.Types.ObjectId(req.user!.userId))) {
      return res.status(403).json({
        status: 'error',
        message: 'この共有設定にアクセスする権限がありません'
      });
    }

    const shareUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/share/${share.shareToken}`;

    return res.json({
      status: 'success',
      data: {
        ...share.toObject(),
        shareUrl
      }
    });

  } catch (error) {
    console.error('共有設定詳細取得エラー:', error);
    return res.status(500).json({
      status: 'error',
      message: '共有設定詳細の取得に失敗しました'
    });
  }
});

// 共有設定更新
router.put('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        status: 'error',
        message: '無効な共有設定IDです'
      });
    }

    const share = await Share.findById(id);
    if (!share) {
      return res.status(404).json({
        status: 'error',
        message: '共有設定が見つかりません'
      });
    }

    // 作成者のみ更新可能
    if (!share.creatorId.equals(new mongoose.Types.ObjectId(req.user!.userId))) {
      return res.status(403).json({
        status: 'error',
        message: '共有設定を更新する権限がありません'
      });
    }

    // パスワードの処理
    if (updates.password) {
      updates.password = await bcrypt.hash(updates.password, 10);
    }

    // allowedUsersの処理
    if (updates.allowedUsers) {
      updates.allowedUsers = updates.allowedUsers.map((id: string) => new mongoose.Types.ObjectId(id));
    }

    // 更新実行
    Object.assign(share, updates);
    await share.save();

    const updatedShare = await Share.findById(id)
      .populate('allowedUsers', 'username profile.displayName')
      .populate('resourceId')
      .select('-password');

    const shareUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/share/${share.shareToken}`;

    return res.json({
      status: 'success',
      data: {
        ...updatedShare!.toObject(),
        shareUrl
      }
    });

  } catch (error) {
    console.error('共有設定更新エラー:', error);
    return res.status(500).json({
      status: 'error',
      message: '共有設定の更新に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// 共有設定削除
router.delete('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        status: 'error',
        message: '無効な共有設定IDです'
      });
    }

    const share = await Share.findById(id);
    if (!share) {
      return res.status(404).json({
        status: 'error',
        message: '共有設定が見つかりません'
      });
    }

    // 作成者のみ削除可能
    if (!share.creatorId.equals(new mongoose.Types.ObjectId(req.user!.userId))) {
      return res.status(403).json({
        status: 'error',
        message: '共有設定を削除する権限がありません'
      });
    }

    await Share.findByIdAndDelete(id);

    return res.json({
      status: 'success',
      message: '共有設定が削除されました'
    });

  } catch (error) {
    console.error('共有設定削除エラー:', error);
    return res.status(500).json({
      status: 'error',
      message: '共有設定の削除に失敗しました'
    });
  }
});

// 共有コンテンツアクセス（認証不要）
router.get('/public/:token', optionalAuth, async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const { password } = req.query;

    const share = await Share.findOne({ shareToken: token, isActive: true })
      .populate('resourceId')
      .populate('creatorId', 'username profile.displayName');

    if (!share) {
      return res.status(404).json({
        status: 'error',
        message: '共有コンテンツが見つかりません'
      });
    }

    // 有効期限チェック
    if (share.isExpired()) {
      return res.status(410).json({
        status: 'error',
        message: '共有コンテンツの有効期限が切れています'
      });
    }

    // アクセス権限チェック
    const userId = req.user?.userId;
    if (!share.hasAccess(userId)) {
      return res.status(403).json({
        status: 'error',
        message: 'このコンテンツにアクセスする権限がありません'
      });
    }

    // パスワード保護の場合のパスワード確認
    if (share.visibility === ShareVisibility.PASSWORD_PROTECTED) {
      if (!password) {
        return res.status(401).json({
          status: 'error',
          message: 'パスワードが必要です',
          requiresPassword: true
        });
      }

      const shareWithPassword = await Share.findById(share._id).select('+password');
      if (!shareWithPassword?.password || !await bcrypt.compare(password as string, shareWithPassword.password)) {
        return res.status(401).json({
          status: 'error',
          message: 'パスワードが正しくありません'
        });
      }
    }

    // アクセスログ記録
    const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.get('User-Agent') || 'unknown';
    await share.logAccess(userId, ipAddress, userAgent);

    // リソースデータの取得
    let resourceData;
    switch (share.resourceType) {
      case ShareType.SESSION_RESULTS:
        // セッション結果データを取得
        const session = await Session.findById(share.resourceId)
          .populate('videoId', 'title youtubeId thumbnailUrl metadata')
          .populate('templateId')
          .populate('evaluators', 'username profile.displayName');
        
        // TODO: 評価結果データも含める
        resourceData = {
          session,
          evaluations: [], // 実際の評価データを取得
          analytics: {} // 分析データを取得
        };
        break;
      
      case ShareType.EVALUATION:
        // 個別評価データを取得
        const evaluation = await Evaluation.findById(share.resourceId)
          .populate('userId', 'username profile.displayName')
          .populate('sessionId');
        resourceData = { evaluation };
        break;
      
      default:
        resourceData = share.resourceId;
    }

    return res.json({
      status: 'success',
      data: {
        share: {
          id: share._id,
          resourceType: share.resourceType,
          visibility: share.visibility,
          permissions: share.permissions,
          settings: share.settings,
          createdAt: share.createdAt,
          expiresAt: share.expiresAt,
          creator: share.creatorId
        },
        resource: resourceData
      }
    });

  } catch (error) {
    console.error('共有コンテンツアクセスエラー:', error);
    return res.status(500).json({
      status: 'error',
      message: '共有コンテンツの取得に失敗しました'
    });
  }
});

// 共有設定の有効/無効切り替え
router.patch('/:id/toggle', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        status: 'error',
        message: '無効な共有設定IDです'
      });
    }

    const share = await Share.findById(id);
    if (!share) {
      return res.status(404).json({
        status: 'error',
        message: '共有設定が見つかりません'
      });
    }

    // 作成者のみ切り替え可能
    if (!share.creatorId.equals(new mongoose.Types.ObjectId(req.user!.userId))) {
      return res.status(403).json({
        status: 'error',
        message: '共有設定を変更する権限がありません'
      });
    }

    share.isActive = !share.isActive;
    await share.save();

    return res.json({
      status: 'success',
      data: {
        id: share._id,
        isActive: share.isActive
      }
    });

  } catch (error) {
    console.error('共有設定切り替えエラー:', error);
    return res.status(500).json({
      status: 'error',
      message: '共有設定の切り替えに失敗しました'
    });
  }
});

// 共有アクセス統計取得
router.get('/:id/analytics', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        status: 'error',
        message: '無効な共有設定IDです'
      });
    }

    const share = await Share.findById(id)
      .populate('accessLog.userId', 'username profile.displayName');

    if (!share) {
      return res.status(404).json({
        status: 'error',
        message: '共有設定が見つかりません'
      });
    }

    // 作成者のみアクセス可能
    if (!share.creatorId.equals(new mongoose.Types.ObjectId(req.user!.userId))) {
      return res.status(403).json({
        status: 'error',
        message: 'アクセス統計を確認する権限がありません'
      });
    }

    // アクセス統計の計算
    const totalAccess = share.accessLog.length;
    const uniqueUsers = new Set(
      share.accessLog
        .filter(log => log.userId)
        .map(log => log.userId!.toString())
    ).size;
    const anonymousAccess = share.accessLog.filter(log => !log.userId).length;

    // 日別アクセス数
    const dailyAccess = share.accessLog.reduce((acc, log) => {
      const date = log.accessedAt.toISOString().split('T')[0];
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // 最近のアクセス（最新10件）
    const recentAccess = share.accessLog
      .sort((a, b) => b.accessedAt.getTime() - a.accessedAt.getTime())
      .slice(0, 10);

    return res.json({
      status: 'success',
      data: {
        summary: {
          totalAccess,
          uniqueUsers,
          anonymousAccess,
          firstAccess: share.accessLog.length > 0 ? 
            Math.min(...share.accessLog.map(log => log.accessedAt.getTime())) : null,
          lastAccess: share.accessLog.length > 0 ? 
            Math.max(...share.accessLog.map(log => log.accessedAt.getTime())) : null
        },
        dailyAccess,
        recentAccess
      }
    });

  } catch (error) {
    console.error('共有アクセス統計取得エラー:', error);
    return res.status(500).json({
      status: 'error',
      message: 'アクセス統計の取得に失敗しました'
    });
  }
});

export default router;