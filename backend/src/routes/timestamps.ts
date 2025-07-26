import { Router, Request, Response } from 'express';
import { Video } from '../models/Video';
import { authenticateToken, optionalAuth } from '../middleware';
import mongoose from 'mongoose';

const router = Router();

// タイムスタンプリンクモデル（簡易版）
interface ITimestampLink {
  _id: string;
  videoId: mongoose.Types.ObjectId;
  shareId?: mongoose.Types.ObjectId | undefined;
  evaluationId?: mongoose.Types.ObjectId | undefined;
  sessionId?: mongoose.Types.ObjectId | undefined;
  creatorId: mongoose.Types.ObjectId;
  title: string;
  description?: string | undefined;
  startTime: number;
  endTime?: number | undefined;
  isHighlight: boolean;
  tags: string[];
  shareToken: string;
  isPublic: boolean;
  viewCount: number;
  createdAt: Date;
  updatedAt: Date;
}

// 簡易的なメモリストレージ（実際の実装では MongoDB を使用）
const timestampLinks: ITimestampLink[] = [];
let linkIdCounter = 1;

// タイムスタンプリンク作成
router.post('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const {
      videoId,
      shareId,
      evaluationId,
      sessionId,
      title,
      description,
      startTime,
      endTime,
      isHighlight = false,
      tags = [],
      isPublic = true
    } = req.body;

    // 必須フィールドの検証
    if (!videoId || !title || startTime === undefined) {
      return res.status(400).json({
        status: 'error',
        message: '動画ID、タイトル、開始時間は必須です'
      });
    }

    if (!mongoose.Types.ObjectId.isValid(videoId)) {
      return res.status(400).json({
        status: 'error',
        message: '無効な動画IDです'
      });
    }

    // 動画の存在確認
    const video = await Video.findById(videoId);
    if (!video) {
      return res.status(404).json({
        status: 'error',
        message: '指定された動画が見つかりません'
      });
    }

    // タイムスタンプの妥当性チェック
    if (startTime < 0) {
      return res.status(400).json({
        status: 'error',
        message: '開始時間は0以上である必要があります'
      });
    }

    if (endTime !== undefined && endTime <= startTime) {
      return res.status(400).json({
        status: 'error',
        message: '終了時間は開始時間より後である必要があります'
      });
    }

    // 共有トークン生成
    const shareToken = generateShareToken();

    // タイムスタンプリンク作成
    const timestampLink: ITimestampLink = {
      _id: (linkIdCounter++).toString(),
      videoId: new mongoose.Types.ObjectId(videoId),
      shareId: shareId ? new mongoose.Types.ObjectId(shareId) : undefined,
      evaluationId: evaluationId ? new mongoose.Types.ObjectId(evaluationId) : undefined,
      sessionId: sessionId ? new mongoose.Types.ObjectId(sessionId) : undefined,
      creatorId: new mongoose.Types.ObjectId(req.user!.userId),
      title,
      description,
      startTime,
      endTime,
      isHighlight: Boolean(endTime) && isHighlight,
      tags: Array.isArray(tags) ? tags : [],
      shareToken,
      isPublic,
      viewCount: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    timestampLinks.push(timestampLink);

    // 共有URLを生成
    const shareUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/timestamp/${shareToken}`;

    return res.status(201).json({
      status: 'success',
      data: {
        ...timestampLink,
        shareUrl
      }
    });

  } catch (error) {
    console.error('タイムスタンプリンク作成エラー:', error);
    return res.status(500).json({
      status: 'error',
      message: 'タイムスタンプリンクの作成に失敗しました'
    });
  }
});

// タイムスタンプリンク一覧取得
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const {
      videoId,
      shareId,
      evaluationId,
      sessionId,
      isPublic,
      page = 1,
      limit = 10
    } = req.query;

    const skip = (Number(page) - 1) * Number(limit);
    const userId = new mongoose.Types.ObjectId(req.user!.userId);

    // フィルター条件の構築
    let filteredLinks = timestampLinks.filter(link => {
      // 自分が作成したリンクまたは公開リンクのみ表示
      if (!link.creatorId.equals(userId) && !link.isPublic) {
        return false;
      }

      if (videoId && !link.videoId.equals(new mongoose.Types.ObjectId(videoId as string))) {
        return false;
      }

      if (shareId && (!link.shareId || !link.shareId.equals(new mongoose.Types.ObjectId(shareId as string)))) {
        return false;
      }

      if (evaluationId && (!link.evaluationId || !link.evaluationId.equals(new mongoose.Types.ObjectId(evaluationId as string)))) {
        return false;
      }

      if (sessionId && (!link.sessionId || !link.sessionId.equals(new mongoose.Types.ObjectId(sessionId as string)))) {
        return false;
      }

      if (isPublic !== undefined && link.isPublic !== (isPublic === 'true')) {
        return false;
      }

      return true;
    });

    // ソート（作成日時の降順）
    filteredLinks.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    // ページネーション
    const total = filteredLinks.length;
    const paginatedLinks = filteredLinks.slice(skip, skip + Number(limit));

    // 動画情報を追加
    const linksWithVideo = await Promise.all(
      paginatedLinks.map(async (link) => {
        const video = await Video.findById(link.videoId).select('title youtubeId thumbnailUrl');
        return {
          ...link,
          video,
          shareUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/timestamp/${link.shareToken}`
        };
      })
    );

    return res.json({
      status: 'success',
      data: {
        links: linksWithVideo,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      }
    });

  } catch (error) {
    console.error('タイムスタンプリンク一覧取得エラー:', error);
    return res.status(500).json({
      status: 'error',
      message: 'タイムスタンプリンク一覧の取得に失敗しました'
    });
  }
});

// タイムスタンプリンク詳細取得（公開アクセス）
router.get('/:token', optionalAuth, async (req: Request, res: Response) => {
  try {
    const { token } = req.params;

    const link = timestampLinks.find(l => l.shareToken === token);
    if (!link) {
      return res.status(404).json({
        status: 'error',
        message: 'タイムスタンプリンクが見つかりません'
      });
    }

    // アクセス権限チェック
    const userId = req.user?.userId;
    if (!link.isPublic && (!userId || !link.creatorId.equals(new mongoose.Types.ObjectId(userId)))) {
      return res.status(403).json({
        status: 'error',
        message: 'このタイムスタンプリンクにアクセスする権限がありません'
      });
    }

    // 動画情報を取得
    const video = await Video.findById(link.videoId);
    if (!video) {
      return res.status(404).json({
        status: 'error',
        message: '関連する動画が見つかりません'
      });
    }

    return res.json({
      status: 'success',
      data: {
        ...link,
        video: {
          _id: video._id,
          title: video.title,
          youtubeId: video.youtubeId,
          thumbnailUrl: video.thumbnailUrl,
          channelName: video.channelName
        }
      }
    });

  } catch (error) {
    console.error('タイムスタンプリンク詳細取得エラー:', error);
    return res.status(500).json({
      status: 'error',
      message: 'タイムスタンプリンク詳細の取得に失敗しました'
    });
  }
});

// タイムスタンプリンク更新
router.put('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const linkIndex = timestampLinks.findIndex(l => l._id === id);
    if (linkIndex === -1) {
      return res.status(404).json({
        status: 'error',
        message: 'タイムスタンプリンクが見つかりません'
      });
    }

    const link = timestampLinks[linkIndex];

    // 作成者のみ更新可能
    if (!link.creatorId.equals(new mongoose.Types.ObjectId(req.user!.userId))) {
      return res.status(403).json({
        status: 'error',
        message: 'タイムスタンプリンクを更新する権限がありません'
      });
    }

    // タイムスタンプの妥当性チェック
    if (updates.startTime !== undefined && updates.startTime < 0) {
      return res.status(400).json({
        status: 'error',
        message: '開始時間は0以上である必要があります'
      });
    }

    if (updates.endTime !== undefined && updates.startTime !== undefined && updates.endTime <= updates.startTime) {
      return res.status(400).json({
        status: 'error',
        message: '終了時間は開始時間より後である必要があります'
      });
    }

    // 更新実行
    const updatedLink = {
      ...link,
      ...updates,
      updatedAt: new Date()
    };

    timestampLinks[linkIndex] = updatedLink;

    return res.json({
      status: 'success',
      data: updatedLink
    });

  } catch (error) {
    console.error('タイムスタンプリンク更新エラー:', error);
    return res.status(500).json({
      status: 'error',
      message: 'タイムスタンプリンクの更新に失敗しました'
    });
  }
});

// タイムスタンプリンク削除
router.delete('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const linkIndex = timestampLinks.findIndex(l => l._id === id);
    if (linkIndex === -1) {
      return res.status(404).json({
        status: 'error',
        message: 'タイムスタンプリンクが見つかりません'
      });
    }

    const link = timestampLinks[linkIndex];

    // 作成者のみ削除可能
    if (!link.creatorId.equals(new mongoose.Types.ObjectId(req.user!.userId))) {
      return res.status(403).json({
        status: 'error',
        message: 'タイムスタンプリンクを削除する権限がありません'
      });
    }

    timestampLinks.splice(linkIndex, 1);

    return res.json({
      status: 'success',
      message: 'タイムスタンプリンクが削除されました'
    });

  } catch (error) {
    console.error('タイムスタンプリンク削除エラー:', error);
    return res.status(500).json({
      status: 'error',
      message: 'タイムスタンプリンクの削除に失敗しました'
    });
  }
});

// 視聴回数増加
router.post('/:token/view', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;

    const linkIndex = timestampLinks.findIndex(l => l.shareToken === token);
    if (linkIndex === -1) {
      return res.status(404).json({
        status: 'error',
        message: 'タイムスタンプリンクが見つかりません'
      });
    }

    timestampLinks[linkIndex].viewCount += 1;

    return res.json({
      status: 'success',
      data: {
        viewCount: timestampLinks[linkIndex].viewCount
      }
    });

  } catch (error) {
    console.error('視聴回数増加エラー:', error);
    return res.status(500).json({
      status: 'error',
      message: '視聴回数の更新に失敗しました'
    });
  }
});

// 埋め込み用データ取得
router.get('/:token/embed', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const { width = 560, height = 315, autoplay = false } = req.query;

    const link = timestampLinks.find(l => l.shareToken === token);
    if (!link) {
      return res.status(404).json({
        status: 'error',
        message: 'タイムスタンプリンクが見つかりません'
      });
    }

    if (!link.isPublic) {
      return res.status(403).json({
        status: 'error',
        message: 'この埋め込みは公開されていません'
      });
    }

    const video = await Video.findById(link.videoId);
    if (!video) {
      return res.status(404).json({
        status: 'error',
        message: '関連する動画が見つかりません'
      });
    }

    // 埋め込み用URLを生成
    const embedParams = new URLSearchParams();
    embedParams.set('start', Math.floor(link.startTime).toString());
    
    if (link.endTime) {
      embedParams.set('end', Math.floor(link.endTime).toString());
    }
    
    if (autoplay === 'true') {
      embedParams.set('autoplay', '1');
    }

    const embedUrl = `https://www.youtube.com/embed/${video.youtubeId}?${embedParams.toString()}`;
    
    const embedCode = `<iframe width="${width}" height="${height}" src="${embedUrl}" frameborder="0" allowfullscreen></iframe>`;

    return res.json({
      status: 'success',
      data: {
        embedUrl,
        embedCode,
        link: {
          title: link.title,
          description: link.description,
          startTime: link.startTime,
          endTime: link.endTime,
          isHighlight: link.isHighlight
        },
        video: {
          title: video.title,
          youtubeId: video.youtubeId,
          thumbnailUrl: video.thumbnailUrl
        }
      }
    });

  } catch (error) {
    console.error('埋め込みデータ取得エラー:', error);
    return res.status(500).json({
      status: 'error',
      message: '埋め込みデータの取得に失敗しました'
    });
  }
});

// ハイライト区間一覧取得
router.get('/video/:videoId/highlights', optionalAuth, async (req: Request, res: Response) => {
  try {
    const { videoId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(videoId)) {
      return res.status(400).json({
        status: 'error',
        message: '無効な動画IDです'
      });
    }

    const userId = req.user?.userId;
    
    // ハイライト区間のみフィルタ
    const highlights = timestampLinks.filter(link => {
      if (!link.videoId.equals(new mongoose.Types.ObjectId(videoId))) {
        return false;
      }
      
      if (!link.isHighlight || !link.endTime) {
        return false;
      }
      
      // 公開されているか、自分が作成したもののみ
      return link.isPublic || (userId && link.creatorId.equals(new mongoose.Types.ObjectId(userId)));
    });

    // 開始時間でソート
    highlights.sort((a, b) => a.startTime - b.startTime);

    return res.json({
      status: 'success',
      data: highlights.map(highlight => ({
        ...highlight,
        duration: highlight.endTime! - highlight.startTime,
        shareUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/timestamp/${highlight.shareToken}`
      }))
    });

  } catch (error) {
    console.error('ハイライト区間取得エラー:', error);
    return res.status(500).json({
      status: 'error',
      message: 'ハイライト区間の取得に失敗しました'
    });
  }
});

// 共有トークン生成関数
function generateShareToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 16; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export default router;