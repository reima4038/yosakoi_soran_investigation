import { Router, Request, Response } from 'express';
import { Notification, NotificationStatus, NotificationType } from '../models/Notification';
import { authenticateToken } from '../middleware';
import mongoose from 'mongoose';

const router = Router();

// 通知一覧取得
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { 
      status, 
      type, 
      page = 1, 
      limit = 20,
      unreadOnly = false 
    } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    // フィルター条件の構築
    const filter: any = {
      recipientId: new mongoose.Types.ObjectId(req.user!.userId)
    };

    if (status && Object.values(NotificationStatus).includes(status as NotificationStatus)) {
      filter.status = status;
    }

    if (type && Object.values(NotificationType).includes(type as NotificationType)) {
      filter.type = type;
    }

    if (unreadOnly === 'true') {
      filter.status = NotificationStatus.UNREAD;
    }

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(filter)
        .populate('senderId', 'username profile.displayName profile.avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Notification.countDocuments(filter),
      Notification.countDocuments({
        recipientId: new mongoose.Types.ObjectId(req.user!.userId),
        status: NotificationStatus.UNREAD
      })
    ]);

    return res.json({
      status: 'success',
      data: {
        notifications,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        },
        unreadCount
      }
    });

  } catch (error) {
    console.error('通知一覧取得エラー:', error);
    return res.status(500).json({
      status: 'error',
      message: '通知一覧の取得に失敗しました'
    });
  }
});

// 通知詳細取得
router.get('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        status: 'error',
        message: '無効な通知IDです'
      });
    }

    const notification = await Notification.findById(id)
      .populate('senderId', 'username profile.displayName profile.avatar');

    if (!notification) {
      return res.status(404).json({
        status: 'error',
        message: '通知が見つかりません'
      });
    }

    // 受信者のみアクセス可能
    if (!notification.recipientId.equals(new mongoose.Types.ObjectId(req.user!.userId))) {
      return res.status(403).json({
        status: 'error',
        message: 'この通知にアクセスする権限がありません'
      });
    }

    return res.json({
      status: 'success',
      data: notification
    });

  } catch (error) {
    console.error('通知詳細取得エラー:', error);
    return res.status(500).json({
      status: 'error',
      message: '通知詳細の取得に失敗しました'
    });
  }
});

// 通知を既読にする
router.patch('/:id/read', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        status: 'error',
        message: '無効な通知IDです'
      });
    }

    const notification = await Notification.findById(id);
    if (!notification) {
      return res.status(404).json({
        status: 'error',
        message: '通知が見つかりません'
      });
    }

    // 受信者のみ既読可能
    if (!notification.recipientId.equals(new mongoose.Types.ObjectId(req.user!.userId))) {
      return res.status(403).json({
        status: 'error',
        message: 'この通知を既読にする権限がありません'
      });
    }

    await notification.markAsRead();

    return res.json({
      status: 'success',
      data: notification
    });

  } catch (error) {
    console.error('通知既読エラー:', error);
    return res.status(500).json({
      status: 'error',
      message: '通知の既読処理に失敗しました'
    });
  }
});

// 全ての通知を既読にする
router.patch('/read-all', authenticateToken, async (req: Request, res: Response) => {
  try {
    const result = await Notification.markAllAsRead(req.user!.userId);

    return res.json({
      status: 'success',
      data: {
        modifiedCount: result.modifiedCount,
        message: `${result.modifiedCount}件の通知を既読にしました`
      }
    });

  } catch (error) {
    console.error('全通知既読エラー:', error);
    return res.status(500).json({
      status: 'error',
      message: '全通知の既読処理に失敗しました'
    });
  }
});

// 通知をアーカイブする
router.patch('/:id/archive', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        status: 'error',
        message: '無効な通知IDです'
      });
    }

    const notification = await Notification.findById(id);
    if (!notification) {
      return res.status(404).json({
        status: 'error',
        message: '通知が見つかりません'
      });
    }

    // 受信者のみアーカイブ可能
    if (!notification.recipientId.equals(new mongoose.Types.ObjectId(req.user!.userId))) {
      return res.status(403).json({
        status: 'error',
        message: 'この通知をアーカイブする権限がありません'
      });
    }

    await notification.archive();

    return res.json({
      status: 'success',
      data: notification
    });

  } catch (error) {
    console.error('通知アーカイブエラー:', error);
    return res.status(500).json({
      status: 'error',
      message: '通知のアーカイブに失敗しました'
    });
  }
});

// 通知削除
router.delete('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        status: 'error',
        message: '無効な通知IDです'
      });
    }

    const notification = await Notification.findById(id);
    if (!notification) {
      return res.status(404).json({
        status: 'error',
        message: '通知が見つかりません'
      });
    }

    // 受信者のみ削除可能
    if (!notification.recipientId.equals(new mongoose.Types.ObjectId(req.user!.userId))) {
      return res.status(403).json({
        status: 'error',
        message: 'この通知を削除する権限がありません'
      });
    }

    await Notification.findByIdAndDelete(id);

    return res.json({
      status: 'success',
      message: '通知が削除されました'
    });

  } catch (error) {
    console.error('通知削除エラー:', error);
    return res.status(500).json({
      status: 'error',
      message: '通知の削除に失敗しました'
    });
  }
});

// 未読通知数取得
router.get('/unread/count', authenticateToken, async (req: Request, res: Response) => {
  try {
    const unreadCount = await Notification.countDocuments({
      recipientId: new mongoose.Types.ObjectId(req.user!.userId),
      status: NotificationStatus.UNREAD
    });

    return res.json({
      status: 'success',
      data: { unreadCount }
    });

  } catch (error) {
    console.error('未読通知数取得エラー:', error);
    return res.status(500).json({
      status: 'error',
      message: '未読通知数の取得に失敗しました'
    });
  }
});

// 通知設定取得（将来の拡張用）
router.get('/settings', authenticateToken, async (_req: Request, res: Response) => {
  try {
    // TODO: ユーザーの通知設定を取得
    const defaultSettings = {
      mentions: true,
      replies: true,
      reactions: false,
      shareComments: true,
      evaluationFeedback: true,
      sessionUpdates: true,
      deadlineReminders: true,
      emailNotifications: false,
      pushNotifications: true
    };

    return res.json({
      status: 'success',
      data: defaultSettings
    });

  } catch (error) {
    console.error('通知設定取得エラー:', error);
    return res.status(500).json({
      status: 'error',
      message: '通知設定の取得に失敗しました'
    });
  }
});

// 通知設定更新（将来の拡張用）
router.put('/settings', authenticateToken, async (req: Request, res: Response) => {
  try {
    const settings = req.body;

    // TODO: ユーザーの通知設定を更新
    
    return res.json({
      status: 'success',
      data: settings,
      message: '通知設定が更新されました'
    });

  } catch (error) {
    console.error('通知設定更新エラー:', error);
    return res.status(500).json({
      status: 'error',
      message: '通知設定の更新に失敗しました'
    });
  }
});

// 通知統計取得
router.get('/stats', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user!.userId);

    const [
      totalCount,
      unreadCount,
      typeStats,
      recentActivity
    ] = await Promise.all([
      Notification.countDocuments({ recipientId: userId }),
      Notification.countDocuments({ 
        recipientId: userId, 
        status: NotificationStatus.UNREAD 
      }),
      Notification.aggregate([
        { $match: { recipientId: userId } },
        { $group: { _id: '$type', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      Notification.find({ recipientId: userId })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('senderId', 'username profile.displayName')
    ]);

    return res.json({
      status: 'success',
      data: {
        totalCount,
        unreadCount,
        readCount: totalCount - unreadCount,
        typeStats,
        recentActivity
      }
    });

  } catch (error) {
    console.error('通知統計取得エラー:', error);
    return res.status(500).json({
      status: 'error',
      message: '通知統計の取得に失敗しました'
    });
  }
});

export default router;