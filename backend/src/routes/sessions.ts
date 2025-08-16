import { Router, Request, Response } from 'express';
import { Session, SessionStatus } from '../models/Session';
import { Video } from '../models/Video';
import { Template } from '../models/Template';
import { authenticateToken } from '../middleware';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { emailService } from '../services/emailService';
import { User } from '../models/User';

const router = Router();

// メール送信設定のテスト（開発環境のみ）
if (process.env.NODE_ENV === 'development') {
  router.get('/test-email', authenticateToken, async (_req: Request, res: Response) => {
    try {
      const isConnected = await emailService.testConnection();
      
      if (isConnected) {
        return res.json({
          status: 'success',
          message: 'メール送信設定は正常です'
        });
      } else {
        return res.status(500).json({
          status: 'error',
          message: 'メール送信設定に問題があります'
        });
      }
    } catch (error) {
      console.error('Email test error:', error);
      return res.status(500).json({
        status: 'error',
        message: 'メール送信テストに失敗しました'
      });
    }
  });
}

// セッション作成
router.post('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const {
      name,
      description,
      videoId,
      templateId,
      startDate,
      endDate,
      settings
    } = req.body;

    // 必須フィールドの検証
    if (!name || !videoId || !templateId) {
      return res.status(400).json({
        status: 'error',
        message: 'セッション名、動画ID、テンプレートIDは必須です'
      });
    }

    // 動画とテンプレートの存在確認
    const [video, template] = await Promise.all([
      Video.findById(videoId),
      Template.findById(templateId)
    ]);

    if (!video) {
      return res.status(404).json({
        status: 'error',
        message: '指定された動画が見つかりません'
      });
    }

    if (!template) {
      return res.status(404).json({
        status: 'error',
        message: '指定されたテンプレートが見つかりません'
      });
    }

    // セッション作成
    const session = new Session({
      name,
      description: description || '',
      videoId: new mongoose.Types.ObjectId(videoId),
      templateId: new mongoose.Types.ObjectId(templateId),
      creatorId: new mongoose.Types.ObjectId(req.user!.userId),
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      settings: {
        allowAnonymous: settings?.allowAnonymous || false,
        requireComments: settings?.requireComments || false,
        showRealTimeResults: settings?.showRealTimeResults || true,
        maxEvaluationsPerUser: settings?.maxEvaluationsPerUser || 1
      }
    });

    await session.save();

    // 作成されたセッションを関連データと共に取得
    const populatedSession = await Session.findById(session._id)
      .populate('videoId', 'title youtubeId thumbnailUrl')
      .populate('templateId', 'name description')
      .populate('creatorId', 'username email profile.displayName');

    // IDフィールドを正規化
    const normalizedSession = {
      ...populatedSession!.toObject(),
      id: (populatedSession!._id as mongoose.Types.ObjectId).toString()
    };

    return res.status(201).json({
      status: 'success',
      data: normalizedSession
    });

  } catch (error) {
    console.error('セッション作成エラー:', error);
    return res.status(500).json({
      status: 'error',
      message: 'セッションの作成に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// セッション一覧取得
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    // フィルター条件の構築
    const filter: any = {
      $or: [
        { creatorId: new mongoose.Types.ObjectId(req.user!.userId) },
        { evaluators: new mongoose.Types.ObjectId(req.user!.userId) }
      ]
    };

    if (status && Object.values(SessionStatus).includes(status as SessionStatus)) {
      filter.status = status;
    }

    // セッション一覧取得
    const [sessions, total] = await Promise.all([
      Session.find(filter)
        .populate('videoId', 'title youtubeId thumbnailUrl metadata')
        .populate('templateId', 'name description')
        .populate('creatorId', 'username profile.displayName')
        .populate('evaluators', 'username profile.displayName')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Session.countDocuments(filter)
    ]);

    // IDフィールドを正規化
    const normalizedSessions = sessions.map(session => ({
      ...session.toObject(),
      id: (session._id as mongoose.Types.ObjectId).toString()
    }));

    console.log('Session list response:', {
      sessionCount: normalizedSessions.length,
      sessionStatuses: normalizedSessions.map(s => ({ id: s.id, status: s.status }))
    });

    return res.json({
      status: 'success',
      data: {
        sessions: normalizedSessions,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      }
    });

  } catch (error) {
    console.error('セッション一覧取得エラー:', error);
    return res.status(500).json({
      status: 'error',
      message: 'セッション一覧の取得に失敗しました'
    });
  }
});

// セッション詳細取得
router.get('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    console.log('Session detail request:', { id, query: req.query });

    if (!mongoose.Types.ObjectId.isValid(id)) {
      console.log('Invalid session ID:', id);
      return res.status(400).json({
        status: 'error',
        message: '無効なセッションIDです'
      });
    }

    const session = await Session.findById(id)
      .populate('videoId', 'title youtubeId thumbnailUrl metadata')
      .populate('templateId', 'name description categories')
      .populate('creatorId', 'username email profile')
      .populate('evaluators', 'username email profile');

    if (!session) {
      return res.status(404).json({
        status: 'error',
        message: 'セッションが見つかりません'
      });
    }

    // アクセス権限の確認
    const userId = new mongoose.Types.ObjectId(req.user!.userId);
    const hasAccess = session.creatorId._id.equals(userId) || 
                     session.evaluators.some(evaluator => evaluator._id.equals(userId));

    if (!hasAccess) {
      return res.status(403).json({
        status: 'error',
        message: 'このセッションにアクセスする権限がありません'
      });
    }

    // IDフィールドを正規化（populateされたオブジェクトも含む）
    const sessionObj = session.toObject();
    const normalizedSession = {
      ...sessionObj,
      id: (session._id as mongoose.Types.ObjectId).toString(),
      // populateされた動画オブジェクトのIDも正規化
      videoId: sessionObj.videoId && typeof sessionObj.videoId === 'object' 
        ? {
            ...sessionObj.videoId,
            id: sessionObj.videoId._id?.toString() || sessionObj.videoId.id
          }
        : sessionObj.videoId,
      // populateされたテンプレートオブジェクトのIDも正規化
      templateId: sessionObj.templateId && typeof sessionObj.templateId === 'object'
        ? {
            ...sessionObj.templateId,
            id: sessionObj.templateId._id?.toString() || sessionObj.templateId.id
          }
        : sessionObj.templateId
    };

    console.log('Session detail response:', {
      sessionId: id,
      settings: normalizedSession.settings,
      hasSettings: !!normalizedSession.settings,
      videoId: normalizedSession.videoId,
      templateId: normalizedSession.templateId
    });

    return res.json({
      status: 'success',
      data: normalizedSession
    });

  } catch (error) {
    console.error('セッション詳細取得エラー:', error);
    return res.status(500).json({
      status: 'error',
      message: 'セッション詳細の取得に失敗しました'
    });
  }
});

// セッション更新
router.put('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        status: 'error',
        message: '無効なセッションIDです'
      });
    }

    const session = await Session.findById(id);
    if (!session) {
      return res.status(404).json({
        status: 'error',
        message: 'セッションが見つかりません'
      });
    }

    // 作成者のみ更新可能
    if (!session.creatorId.equals(new mongoose.Types.ObjectId(req.user!.userId))) {
      return res.status(403).json({
        status: 'error',
        message: 'セッションを更新する権限がありません'
      });
    }

    // アクティブまたは完了したセッションの制限
    if (session.status === SessionStatus.ACTIVE || session.status === SessionStatus.COMPLETED) {
      const allowedFields = ['description', 'endDate'];
      const updateFields = Object.keys(updates);
      const hasRestrictedFields = updateFields.some(field => !allowedFields.includes(field));
      
      if (hasRestrictedFields) {
        return res.status(400).json({
          status: 'error',
          message: 'アクティブまたは完了したセッションでは一部の項目のみ更新可能です'
        });
      }
    }

    // 更新実行
    Object.assign(session, updates);
    await session.save();

    const updatedSession = await Session.findById(id)
      .populate('videoId', 'title youtubeId thumbnailUrl')
      .populate('templateId', 'name description')
      .populate('creatorId', 'username profile.displayName')
      .populate('evaluators', 'username profile.displayName');

    // IDフィールドを正規化
    const normalizedSession = {
      ...updatedSession!.toObject(),
      id: (updatedSession!._id as mongoose.Types.ObjectId).toString()
    };

    return res.json({
      status: 'success',
      data: normalizedSession
    });

  } catch (error) {
    console.error('セッション更新エラー:', error);
    return res.status(500).json({
      status: 'error',
      message: 'セッションの更新に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// セッション削除
router.delete('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        status: 'error',
        message: '無効なセッションIDです'
      });
    }

    const session = await Session.findById(id);
    if (!session) {
      return res.status(404).json({
        status: 'error',
        message: 'セッションが見つかりません'
      });
    }

    // 作成者のみ削除可能
    if (!session.creatorId.equals(new mongoose.Types.ObjectId(req.user!.userId))) {
      return res.status(403).json({
        status: 'error',
        message: 'セッションを削除する権限がありません'
      });
    }

    // アクティブなセッションは削除不可
    if (session.status === SessionStatus.ACTIVE) {
      return res.status(400).json({
        status: 'error',
        message: 'アクティブなセッションは削除できません'
      });
    }

    await Session.findByIdAndDelete(id);

    return res.json({
      status: 'success',
      message: 'セッションが削除されました'
    });

  } catch (error) {
    console.error('セッション削除エラー:', error);
    return res.status(500).json({
      status: 'error',
      message: 'セッションの削除に失敗しました'
    });
  }
});

// 評価者招待
router.post('/:id/invite', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { emails, message } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        status: 'error',
        message: '無効なセッションIDです'
      });
    }

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: '招待するメールアドレスを指定してください'
      });
    }

    const session = await Session.findById(id);
    if (!session) {
      return res.status(404).json({
        status: 'error',
        message: 'セッションが見つかりません'
      });
    }

    // 作成者のみ招待可能
    if (!session.creatorId.equals(new mongoose.Types.ObjectId(req.user!.userId))) {
      return res.status(403).json({
        status: 'error',
        message: '評価者を招待する権限がありません'
      });
    }

    // 招待リンクの生成
    const inviteToken = jwt.sign(
      { sessionId: id, type: 'session-invite' },
      process.env.JWT_SECRET || 'your-secret-key-for-development-only',
      { expiresIn: '7d' }
    );

    const inviteLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/sessions/${id}/join?token=${inviteToken}`;

    // 招待者の情報を取得
    const inviter = await User.findById(req.user!.userId);
    const inviterName = inviter?.username || '管理者';

    // メール送信データの準備
    const emailData = {
      sessionName: session.name,
      sessionDescription: session.description,
      inviteLink,
      inviterName,
      customMessage: message,
      startDate: session.startDate ? new Date(session.startDate).toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }) : '',
      endDate: session.endDate ? new Date(session.endDate).toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }) : '',
    };

    // メール送信の実行
    const emailResults = await emailService.sendBulkInvitationEmails(emails, emailData);

    // 招待結果の準備
    const invitations = emails.map((email: string) => {
      const isSuccessful = emailResults.successful.includes(email);
      const failedResult = emailResults.failed.find(f => f.email === email);
      
      return {
        email,
        inviteLink,
        invitedAt: new Date(),
        status: isSuccessful ? 'sent' : 'failed',
        message: message || '',
        emailSent: isSuccessful,
        emailError: failedResult?.error
      };
    });

    // 結果の集計
    const successCount = emailResults.successful.length;
    const failedCount = emailResults.failed.length;

    let responseMessage = '';
    if (successCount > 0 && failedCount === 0) {
      responseMessage = `${successCount}名に招待メールを送信しました`;
    } else if (successCount > 0 && failedCount > 0) {
      responseMessage = `${successCount}名に招待メールを送信しました（${failedCount}名は送信に失敗）`;
    } else {
      responseMessage = '招待メールの送信に失敗しました';
    }

    return res.json({
      status: failedCount === 0 ? 'success' : 'partial_success',
      data: {
        invitations,
        message: responseMessage,
        summary: {
          total: emails.length,
          successful: successCount,
          failed: failedCount,
          failedEmails: emailResults.failed
        }
      }
    });

  } catch (error) {
    console.error('評価者招待エラー:', error);
    return res.status(500).json({
      status: 'error',
      message: '評価者の招待に失敗しました'
    });
  }
});

// 招待リンクでの参加
router.post('/:id/join', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { token, userInfo } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        status: 'error',
        message: '無効なセッションIDです'
      });
    }

    if (!token) {
      return res.status(400).json({
        status: 'error',
        message: '招待トークンが必要です'
      });
    }

    // トークンの検証
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-for-development-only') as any;
      if (decoded.type !== 'session-invite' || decoded.sessionId !== id) {
        throw new Error('無効な招待トークンです');
      }
    } catch (error) {
      return res.status(400).json({
        status: 'error',
        message: '無効または期限切れの招待トークンです'
      });
    }

    const session = await Session.findById(id);
    if (!session) {
      return res.status(404).json({
        status: 'error',
        message: 'セッションが見つかりません'
      });
    }

    // セッションがアクティブでない場合はエラー
    if (session.status !== SessionStatus.ACTIVE) {
      return res.status(400).json({
        status: 'error',
        message: 'このセッションは現在参加できません'
      });
    }

    // ユーザー情報がある場合は評価者として追加
    if (userInfo && userInfo.userId) {
      const userId = new mongoose.Types.ObjectId(userInfo.userId);
      if (!session.evaluators.includes(userId)) {
        session.evaluators.push(userId);
        await session.save();
      }
    }

    return res.json({
      status: 'success',
      data: {
        session: {
          id: session._id,
          name: session.name,
          description: session.description,
          status: session.status
        },
        message: 'セッションに参加しました'
      }
    });

  } catch (error) {
    console.error('セッション参加エラー:', error);
    return res.status(500).json({
      status: 'error',
      message: 'セッションへの参加に失敗しました'
    });
  }
});

// セッションステータス更新
router.patch('/:id/status', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    console.log('Session status update request:', {
      sessionId: id,
      newStatus: status,
      userId: req.user?.userId
    });

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        status: 'error',
        message: '無効なセッションIDです'
      });
    }

    if (!Object.values(SessionStatus).includes(status)) {
      return res.status(400).json({
        status: 'error',
        message: '無効なステータスです'
      });
    }

    const session = await Session.findById(id);
    if (!session) {
      return res.status(404).json({
        status: 'error',
        message: 'セッションが見つかりません'
      });
    }

    // 作成者のみステータス変更可能
    if (!session.creatorId.equals(new mongoose.Types.ObjectId(req.user!.userId))) {
      return res.status(403).json({
        status: 'error',
        message: 'セッションステータスを変更する権限がありません'
      });
    }

    // ステータス変更のバリデーション
    const validTransitions: Record<SessionStatus, SessionStatus[]> = {
      [SessionStatus.DRAFT]: [SessionStatus.ACTIVE, SessionStatus.ARCHIVED],
      [SessionStatus.ACTIVE]: [SessionStatus.COMPLETED, SessionStatus.ARCHIVED],
      [SessionStatus.COMPLETED]: [SessionStatus.ARCHIVED],
      [SessionStatus.ARCHIVED]: [] // アーカイブからは変更不可
    };

    if (!validTransitions[session.status].includes(status as SessionStatus)) {
      return res.status(400).json({
        status: 'error',
        message: `${session.status}から${status}への変更はできません`
      });
    }

    // アクティブにする場合の追加チェック
    if (status === SessionStatus.ACTIVE) {
      const now = new Date();
      
      // 開始日時が設定されていない、または過去の場合は現在時刻に設定
      if (!session.startDate || session.startDate < now) {
        session.startDate = new Date(now.getTime() + 1000); // 1秒後に設定
        console.log(`セッション ${id} の開始日時を現在時刻に更新しました:`, session.startDate);
      }
      
      // 評価者のチェックは一旦コメントアウト（必要に応じて後で有効化）
      // if (session.evaluators.length === 0) {
      //   return res.status(400).json({
      //     status: 'error',
      //     message: 'アクティブにするには少なくとも1人の評価者が必要です'
      //   });
      // }
    }

    // 完了にする場合の処理
    if (status === SessionStatus.COMPLETED && !session.endDate) {
      session.endDate = new Date();
    }

    session.status = status;
    
    try {
      await session.save();
    } catch (saveError: any) {
      console.error('セッション保存エラー:', saveError);
      
      // バリデーションエラーの場合
      if (saveError.name === 'ValidationError') {
        const validationErrors = Object.values(saveError.errors).map((err: any) => err.message);
        return res.status(400).json({
          status: 'error',
          message: 'セッションの保存に失敗しました',
          details: validationErrors.join(', ')
        });
      }
      
      throw saveError; // その他のエラーは上位に投げる
    }

    const updatedSession = await Session.findById(id)
      .populate('videoId', 'title youtubeId thumbnailUrl')
      .populate('templateId', 'name description')
      .populate('creatorId', 'username profile.displayName')
      .populate('evaluators', 'username profile.displayName');

    // IDフィールドを正規化
    const normalizedSession = {
      ...updatedSession!.toObject(),
      id: (updatedSession!._id as mongoose.Types.ObjectId).toString()
    };

    return res.json({
      status: 'success',
      data: normalizedSession
    });

  } catch (error) {
    console.error('セッションステータス更新エラー:', error);
    console.error('Error details:', {
      name: (error as any)?.name,
      message: (error as any)?.message,
      stack: (error as any)?.stack
    });
    return res.status(500).json({
      status: 'error',
      message: 'セッションステータスの更新に失敗しました',
      details: (error as any)?.message || 'Unknown error'
    });
  }
});

// セッション進捗状況取得
router.get('/:id/progress', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        status: 'error',
        message: '無効なセッションIDです'
      });
    }

    const session = await Session.findById(id)
      .populate('evaluators', 'username profile.displayName');

    if (!session) {
      return res.status(404).json({
        status: 'error',
        message: 'セッションが見つかりません'
      });
    }

    // アクセス権限の確認
    const userId = new mongoose.Types.ObjectId(req.user!.userId);
    const hasAccess = session.creatorId.equals(userId) || 
                     session.evaluators.some(evaluator => evaluator._id.equals(userId));

    if (!hasAccess) {
      return res.status(403).json({
        status: 'error',
        message: 'このセッションの進捗を確認する権限がありません'
      });
    }

    // TODO: 実際の評価データから進捗を計算
    // 現在は仮の進捗データを返す
    const totalEvaluators = session.evaluators.length;
    const completedEvaluations = Math.floor(totalEvaluators * 0.6); // 仮の完了数

    const progress = {
      totalEvaluators,
      completedEvaluations,
      pendingEvaluations: totalEvaluators - completedEvaluations,
      completionRate: totalEvaluators > 0 ? (completedEvaluations / totalEvaluators) * 100 : 0,
      evaluators: session.evaluators.map((evaluator: any) => ({
        id: evaluator._id,
        name: evaluator.profile?.displayName || evaluator.username,
        status: Math.random() > 0.4 ? 'completed' : 'pending', // 仮のステータス
        submittedAt: Math.random() > 0.4 ? new Date() : null
      })),
      timeRemaining: session.endDate ? Math.max(0, session.endDate.getTime() - Date.now()) : null,
      isOverdue: session.endDate ? session.endDate < new Date() : false
    };

    return res.json({
      status: 'success',
      data: progress
    });

  } catch (error) {
    console.error('セッション進捗取得エラー:', error);
    return res.status(500).json({
      status: 'error',
      message: 'セッション進捗の取得に失敗しました'
    });
  }
});

// 期限切れセッションの通知
router.get('/notifications/overdue', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user!.userId);
    const now = new Date();

    // 期限切れのアクティブセッション（作成者のもの）
    const overdueSessions = await Session.find({
      creatorId: userId,
      status: SessionStatus.ACTIVE,
      endDate: { $lt: now }
    })
    .populate('videoId', 'title')
    .populate('templateId', 'name')
    .sort({ endDate: -1 });

    // 期限が近いセッション（24時間以内）
    const upcomingDeadline = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const upcomingSessions = await Session.find({
      creatorId: userId,
      status: SessionStatus.ACTIVE,
      endDate: { $gte: now, $lte: upcomingDeadline }
    })
    .populate('videoId', 'title')
    .populate('templateId', 'name')
    .sort({ endDate: 1 });

    return res.json({
      status: 'success',
      data: {
        overdue: overdueSessions.map(session => ({
          id: session._id,
          name: session.name,
          videoTitle: (session.videoId as any)?.title,
          endDate: session.endDate,
          overdueDays: Math.floor((now.getTime() - session.endDate!.getTime()) / (24 * 60 * 60 * 1000))
        })),
        upcoming: upcomingSessions.map(session => ({
          id: session._id,
          name: session.name,
          videoTitle: (session.videoId as any)?.title,
          endDate: session.endDate,
          hoursRemaining: Math.floor((session.endDate!.getTime() - now.getTime()) / (60 * 60 * 1000))
        }))
      }
    });

  } catch (error) {
    console.error('通知取得エラー:', error);
    return res.status(500).json({
      status: 'error',
      message: '通知の取得に失敗しました'
    });
  }
});

export default router;