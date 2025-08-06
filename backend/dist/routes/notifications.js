"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const Notification_1 = require("../models/Notification");
const middleware_1 = require("../middleware");
const mongoose_1 = __importDefault(require("mongoose"));
const router = (0, express_1.Router)();
// 通知一覧取得
router.get('/', middleware_1.authenticateToken, async (req, res) => {
    try {
        const { status, type, page = 1, limit = 20, unreadOnly = false } = req.query;
        const skip = (Number(page) - 1) * Number(limit);
        // フィルター条件の構築
        const filter = {
            recipientId: new mongoose_1.default.Types.ObjectId(req.user.userId)
        };
        if (status && Object.values(Notification_1.NotificationStatus).includes(status)) {
            filter.status = status;
        }
        if (type && Object.values(Notification_1.NotificationType).includes(type)) {
            filter.type = type;
        }
        if (unreadOnly === 'true') {
            filter.status = Notification_1.NotificationStatus.UNREAD;
        }
        const [notifications, total, unreadCount] = await Promise.all([
            Notification_1.Notification.find(filter)
                .populate('senderId', 'username profile.displayName profile.avatar')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(Number(limit)),
            Notification_1.Notification.countDocuments(filter),
            Notification_1.Notification.countDocuments({
                recipientId: new mongoose_1.default.Types.ObjectId(req.user.userId),
                status: Notification_1.NotificationStatus.UNREAD
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
    }
    catch (error) {
        console.error('通知一覧取得エラー:', error);
        return res.status(500).json({
            status: 'error',
            message: '通知一覧の取得に失敗しました'
        });
    }
});
// 通知詳細取得
router.get('/:id', middleware_1.authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                status: 'error',
                message: '無効な通知IDです'
            });
        }
        const notification = await Notification_1.Notification.findById(id)
            .populate('senderId', 'username profile.displayName profile.avatar');
        if (!notification) {
            return res.status(404).json({
                status: 'error',
                message: '通知が見つかりません'
            });
        }
        // 受信者のみアクセス可能
        if (!notification.recipientId.equals(new mongoose_1.default.Types.ObjectId(req.user.userId))) {
            return res.status(403).json({
                status: 'error',
                message: 'この通知にアクセスする権限がありません'
            });
        }
        return res.json({
            status: 'success',
            data: notification
        });
    }
    catch (error) {
        console.error('通知詳細取得エラー:', error);
        return res.status(500).json({
            status: 'error',
            message: '通知詳細の取得に失敗しました'
        });
    }
});
// 通知を既読にする
router.patch('/:id/read', middleware_1.authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                status: 'error',
                message: '無効な通知IDです'
            });
        }
        const notification = await Notification_1.Notification.findById(id);
        if (!notification) {
            return res.status(404).json({
                status: 'error',
                message: '通知が見つかりません'
            });
        }
        // 受信者のみ既読可能
        if (!notification.recipientId.equals(new mongoose_1.default.Types.ObjectId(req.user.userId))) {
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
    }
    catch (error) {
        console.error('通知既読エラー:', error);
        return res.status(500).json({
            status: 'error',
            message: '通知の既読処理に失敗しました'
        });
    }
});
// 全ての通知を既読にする
router.patch('/read-all', middleware_1.authenticateToken, async (req, res) => {
    try {
        const result = await Notification_1.Notification.markAllAsRead(req.user.userId);
        return res.json({
            status: 'success',
            data: {
                modifiedCount: result.modifiedCount,
                message: `${result.modifiedCount}件の通知を既読にしました`
            }
        });
    }
    catch (error) {
        console.error('全通知既読エラー:', error);
        return res.status(500).json({
            status: 'error',
            message: '全通知の既読処理に失敗しました'
        });
    }
});
// 通知をアーカイブする
router.patch('/:id/archive', middleware_1.authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                status: 'error',
                message: '無効な通知IDです'
            });
        }
        const notification = await Notification_1.Notification.findById(id);
        if (!notification) {
            return res.status(404).json({
                status: 'error',
                message: '通知が見つかりません'
            });
        }
        // 受信者のみアーカイブ可能
        if (!notification.recipientId.equals(new mongoose_1.default.Types.ObjectId(req.user.userId))) {
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
    }
    catch (error) {
        console.error('通知アーカイブエラー:', error);
        return res.status(500).json({
            status: 'error',
            message: '通知のアーカイブに失敗しました'
        });
    }
});
// 通知削除
router.delete('/:id', middleware_1.authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                status: 'error',
                message: '無効な通知IDです'
            });
        }
        const notification = await Notification_1.Notification.findById(id);
        if (!notification) {
            return res.status(404).json({
                status: 'error',
                message: '通知が見つかりません'
            });
        }
        // 受信者のみ削除可能
        if (!notification.recipientId.equals(new mongoose_1.default.Types.ObjectId(req.user.userId))) {
            return res.status(403).json({
                status: 'error',
                message: 'この通知を削除する権限がありません'
            });
        }
        await Notification_1.Notification.findByIdAndDelete(id);
        return res.json({
            status: 'success',
            message: '通知が削除されました'
        });
    }
    catch (error) {
        console.error('通知削除エラー:', error);
        return res.status(500).json({
            status: 'error',
            message: '通知の削除に失敗しました'
        });
    }
});
// 未読通知数取得
router.get('/unread/count', middleware_1.authenticateToken, async (req, res) => {
    try {
        const unreadCount = await Notification_1.Notification.countDocuments({
            recipientId: new mongoose_1.default.Types.ObjectId(req.user.userId),
            status: Notification_1.NotificationStatus.UNREAD
        });
        return res.json({
            status: 'success',
            data: { unreadCount }
        });
    }
    catch (error) {
        console.error('未読通知数取得エラー:', error);
        return res.status(500).json({
            status: 'error',
            message: '未読通知数の取得に失敗しました'
        });
    }
});
// 通知設定取得（将来の拡張用）
router.get('/settings', middleware_1.authenticateToken, async (_req, res) => {
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
    }
    catch (error) {
        console.error('通知設定取得エラー:', error);
        return res.status(500).json({
            status: 'error',
            message: '通知設定の取得に失敗しました'
        });
    }
});
// 通知設定更新（将来の拡張用）
router.put('/settings', middleware_1.authenticateToken, async (req, res) => {
    try {
        const settings = req.body;
        // TODO: ユーザーの通知設定を更新
        return res.json({
            status: 'success',
            data: settings,
            message: '通知設定が更新されました'
        });
    }
    catch (error) {
        console.error('通知設定更新エラー:', error);
        return res.status(500).json({
            status: 'error',
            message: '通知設定の更新に失敗しました'
        });
    }
});
// 通知統計取得
router.get('/stats', middleware_1.authenticateToken, async (req, res) => {
    try {
        const userId = new mongoose_1.default.Types.ObjectId(req.user.userId);
        const [totalCount, unreadCount, typeStats, recentActivity] = await Promise.all([
            Notification_1.Notification.countDocuments({ recipientId: userId }),
            Notification_1.Notification.countDocuments({
                recipientId: userId,
                status: Notification_1.NotificationStatus.UNREAD
            }),
            Notification_1.Notification.aggregate([
                { $match: { recipientId: userId } },
                { $group: { _id: '$type', count: { $sum: 1 } } },
                { $sort: { count: -1 } }
            ]),
            Notification_1.Notification.find({ recipientId: userId })
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
    }
    catch (error) {
        console.error('通知統計取得エラー:', error);
        return res.status(500).json({
            status: 'error',
            message: '通知統計の取得に失敗しました'
        });
    }
});
exports.default = router;
//# sourceMappingURL=notifications.js.map