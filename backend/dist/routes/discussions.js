"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const Discussion_1 = require("../models/Discussion");
const Notification_1 = require("../models/Notification");
const User_1 = require("../models/User");
const middleware_1 = require("../middleware");
const mongoose_1 = __importDefault(require("mongoose"));
const router = (0, express_1.Router)();
// ディスカッションスレッド作成
router.post('/threads', middleware_1.authenticateToken, async (req, res) => {
    try {
        const { shareId, evaluationId, sessionId, type, title } = req.body;
        // 必須フィールドの検証
        if (!type || !Object.values(Discussion_1.DiscussionType).includes(type)) {
            return res.status(400).json({
                status: 'error',
                message: '有効なディスカッションタイプを指定してください'
            });
        }
        // リソースIDの検証
        if (!shareId && !evaluationId && !sessionId) {
            return res.status(400).json({
                status: 'error',
                message: '関連するリソースIDを指定してください'
            });
        }
        // 既存スレッドの確認
        const existingThread = await Discussion_1.DiscussionThread.findOne({
            shareId: shareId ? new mongoose_1.default.Types.ObjectId(shareId) : undefined,
            evaluationId: evaluationId ? new mongoose_1.default.Types.ObjectId(evaluationId) : undefined,
            sessionId: sessionId ? new mongoose_1.default.Types.ObjectId(sessionId) : undefined,
            type,
            isActive: true
        });
        if (existingThread) {
            return res.json({
                status: 'success',
                data: existingThread
            });
        }
        // 新しいスレッド作成
        const thread = new Discussion_1.DiscussionThread({
            shareId: shareId ? new mongoose_1.default.Types.ObjectId(shareId) : undefined,
            evaluationId: evaluationId ? new mongoose_1.default.Types.ObjectId(evaluationId) : undefined,
            sessionId: sessionId ? new mongoose_1.default.Types.ObjectId(sessionId) : undefined,
            type,
            title,
            participantIds: [new mongoose_1.default.Types.ObjectId(req.user.userId)]
        });
        await thread.save();
        const populatedThread = await Discussion_1.DiscussionThread.findById(thread._id)
            .populate('participantIds', 'username profile.displayName');
        return res.status(201).json({
            status: 'success',
            data: populatedThread
        });
    }
    catch (error) {
        console.error('ディスカッションスレッド作成エラー:', error);
        return res.status(500).json({
            status: 'error',
            message: 'ディスカッションスレッドの作成に失敗しました'
        });
    }
});
// ディスカッションスレッド一覧取得
router.get('/threads', middleware_1.authenticateToken, async (req, res) => {
    try {
        const { shareId, evaluationId, sessionId, type, page = 1, limit = 10 } = req.query;
        const skip = (Number(page) - 1) * Number(limit);
        // フィルター条件の構築
        const filter = { isActive: true };
        if (shareId)
            filter.shareId = new mongoose_1.default.Types.ObjectId(shareId);
        if (evaluationId)
            filter.evaluationId = new mongoose_1.default.Types.ObjectId(evaluationId);
        if (sessionId)
            filter.sessionId = new mongoose_1.default.Types.ObjectId(sessionId);
        if (type && Object.values(Discussion_1.DiscussionType).includes(type)) {
            filter.type = type;
        }
        const [threads, total] = await Promise.all([
            Discussion_1.DiscussionThread.find(filter)
                .populate('participantIds', 'username profile.displayName')
                .sort({ lastActivityAt: -1 })
                .skip(skip)
                .limit(Number(limit)),
            Discussion_1.DiscussionThread.countDocuments(filter)
        ]);
        // 各スレッドのコメント数を取得
        const threadsWithCounts = await Promise.all(threads.map(async (thread) => {
            const commentCount = await Discussion_1.DiscussionComment.countDocuments({
                threadId: thread._id,
                isDeleted: false
            });
            return {
                ...thread.toObject(),
                commentCount
            };
        }));
        return res.json({
            status: 'success',
            data: {
                threads: threadsWithCounts,
                pagination: {
                    page: Number(page),
                    limit: Number(limit),
                    total,
                    pages: Math.ceil(total / Number(limit))
                }
            }
        });
    }
    catch (error) {
        console.error('ディスカッションスレッド一覧取得エラー:', error);
        return res.status(500).json({
            status: 'error',
            message: 'ディスカッションスレッド一覧の取得に失敗しました'
        });
    }
});
// ディスカッションスレッド詳細取得
router.get('/threads/:id', middleware_1.authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                status: 'error',
                message: '無効なスレッドIDです'
            });
        }
        const thread = await Discussion_1.DiscussionThread.findById(id)
            .populate('participantIds', 'username profile.displayName');
        if (!thread) {
            return res.status(404).json({
                status: 'error',
                message: 'ディスカッションスレッドが見つかりません'
            });
        }
        return res.json({
            status: 'success',
            data: thread
        });
    }
    catch (error) {
        console.error('ディスカッションスレッド詳細取得エラー:', error);
        return res.status(500).json({
            status: 'error',
            message: 'ディスカッションスレッド詳細の取得に失敗しました'
        });
    }
});
// コメント作成
router.post('/threads/:threadId/comments', middleware_1.authenticateToken, async (req, res) => {
    try {
        const { threadId } = req.params;
        const { content, parentId } = req.body;
        if (!mongoose_1.default.Types.ObjectId.isValid(threadId)) {
            return res.status(400).json({
                status: 'error',
                message: '無効なスレッドIDです'
            });
        }
        if (!content || content.trim().length === 0) {
            return res.status(400).json({
                status: 'error',
                message: 'コメント内容は必須です'
            });
        }
        // スレッドの存在確認
        const thread = await Discussion_1.DiscussionThread.findById(threadId);
        if (!thread) {
            return res.status(404).json({
                status: 'error',
                message: 'ディスカッションスレッドが見つかりません'
            });
        }
        // 親コメントの存在確認（返信の場合）
        if (parentId && !mongoose_1.default.Types.ObjectId.isValid(parentId)) {
            return res.status(400).json({
                status: 'error',
                message: '無効な親コメントIDです'
            });
        }
        if (parentId) {
            const parentComment = await Discussion_1.DiscussionComment.findById(parentId);
            if (!parentComment) {
                return res.status(404).json({
                    status: 'error',
                    message: '親コメントが見つかりません'
                });
            }
        }
        // メンション抽出
        const mentionRegex = /@(\w+)/g;
        const mentions = [];
        let match;
        while ((match = mentionRegex.exec(content)) !== null) {
            const username = match[1];
            const user = await User_1.User.findOne({ username });
            if (user) {
                mentions.push({
                    userId: user._id,
                    username: user.username,
                    position: match.index
                });
            }
        }
        // コメント作成
        const comment = new Discussion_1.DiscussionComment({
            threadId: new mongoose_1.default.Types.ObjectId(threadId),
            parentId: parentId ? new mongoose_1.default.Types.ObjectId(parentId) : undefined,
            authorId: new mongoose_1.default.Types.ObjectId(req.user.userId),
            content: content.trim(),
            mentions
        });
        await comment.save();
        // 通知の作成
        const userId = req.user.userId;
        // メンション通知
        for (const mention of mentions) {
            if (mention.userId.toString() !== userId) {
                await Notification_1.Notification.createMentionNotification(mention.userId.toString(), userId, comment._id.toString(), threadId, content);
            }
        }
        // 返信通知
        if (parentId) {
            const parentComment = await Discussion_1.DiscussionComment.findById(parentId);
            if (parentComment && parentComment.authorId.toString() !== userId) {
                await Notification_1.Notification.createReplyNotification(parentComment.authorId.toString(), userId, comment._id.toString(), threadId, content);
            }
        }
        // 作成されたコメントを取得
        const populatedComment = await Discussion_1.DiscussionComment.findById(comment._id)
            .populate('authorId', 'username profile.displayName profile.avatar')
            .populate('mentions.userId', 'username profile.displayName');
        return res.status(201).json({
            status: 'success',
            data: populatedComment
        });
    }
    catch (error) {
        console.error('コメント作成エラー:', error);
        return res.status(500).json({
            status: 'error',
            message: 'コメントの作成に失敗しました'
        });
    }
});
// コメント一覧取得
router.get('/threads/:threadId/comments', middleware_1.authenticateToken, async (req, res) => {
    try {
        const { threadId } = req.params;
        const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'asc' } = req.query;
        const skip = (Number(page) - 1) * Number(limit);
        if (!mongoose_1.default.Types.ObjectId.isValid(threadId)) {
            return res.status(400).json({
                status: 'error',
                message: '無効なスレッドIDです'
            });
        }
        // ソート条件の構築
        const sortOptions = {};
        sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;
        const [comments, total] = await Promise.all([
            Discussion_1.DiscussionComment.find({
                threadId: new mongoose_1.default.Types.ObjectId(threadId),
                isDeleted: false
            })
                .populate('authorId', 'username profile.displayName profile.avatar')
                .populate('mentions.userId', 'username profile.displayName')
                .sort(sortOptions)
                .skip(skip)
                .limit(Number(limit)),
            Discussion_1.DiscussionComment.countDocuments({
                threadId: new mongoose_1.default.Types.ObjectId(threadId),
                isDeleted: false
            })
        ]);
        // 各コメントの返信数を取得
        const commentsWithReplies = await Promise.all(comments.map(async (comment) => {
            const replyCount = await Discussion_1.DiscussionComment.countDocuments({
                parentId: comment._id,
                isDeleted: false
            });
            return {
                ...comment.toObject(),
                replyCount
            };
        }));
        return res.json({
            status: 'success',
            data: {
                comments: commentsWithReplies,
                pagination: {
                    page: Number(page),
                    limit: Number(limit),
                    total,
                    pages: Math.ceil(total / Number(limit))
                }
            }
        });
    }
    catch (error) {
        console.error('コメント一覧取得エラー:', error);
        return res.status(500).json({
            status: 'error',
            message: 'コメント一覧の取得に失敗しました'
        });
    }
});
// コメント更新
router.put('/comments/:id', middleware_1.authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { content } = req.body;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                status: 'error',
                message: '無効なコメントIDです'
            });
        }
        if (!content || content.trim().length === 0) {
            return res.status(400).json({
                status: 'error',
                message: 'コメント内容は必須です'
            });
        }
        const comment = await Discussion_1.DiscussionComment.findById(id);
        if (!comment) {
            return res.status(404).json({
                status: 'error',
                message: 'コメントが見つかりません'
            });
        }
        // 作成者のみ編集可能
        if (!comment.authorId.equals(new mongoose_1.default.Types.ObjectId(req.user.userId))) {
            return res.status(403).json({
                status: 'error',
                message: 'コメントを編集する権限がありません'
            });
        }
        // メンション抽出
        const mentionRegex = /@(\w+)/g;
        const mentions = [];
        let match;
        while ((match = mentionRegex.exec(content)) !== null) {
            const username = match[1];
            const user = await User_1.User.findOne({ username });
            if (user) {
                mentions.push({
                    userId: user._id,
                    username: user.username,
                    position: match.index
                });
            }
        }
        // コメント更新
        comment.content = content.trim();
        comment.mentions = mentions;
        comment.isEdited = true;
        comment.editedAt = new Date();
        await comment.save();
        const updatedComment = await Discussion_1.DiscussionComment.findById(id)
            .populate('authorId', 'username profile.displayName profile.avatar')
            .populate('mentions.userId', 'username profile.displayName');
        return res.json({
            status: 'success',
            data: updatedComment
        });
    }
    catch (error) {
        console.error('コメント更新エラー:', error);
        return res.status(500).json({
            status: 'error',
            message: 'コメントの更新に失敗しました'
        });
    }
});
// コメント削除
router.delete('/comments/:id', middleware_1.authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                status: 'error',
                message: '無効なコメントIDです'
            });
        }
        const comment = await Discussion_1.DiscussionComment.findById(id);
        if (!comment) {
            return res.status(404).json({
                status: 'error',
                message: 'コメントが見つかりません'
            });
        }
        // 作成者のみ削除可能
        if (!comment.authorId.equals(new mongoose_1.default.Types.ObjectId(req.user.userId))) {
            return res.status(403).json({
                status: 'error',
                message: 'コメントを削除する権限がありません'
            });
        }
        // ソフト削除
        await comment.softDelete();
        return res.json({
            status: 'success',
            message: 'コメントが削除されました'
        });
    }
    catch (error) {
        console.error('コメント削除エラー:', error);
        return res.status(500).json({
            status: 'error',
            message: 'コメントの削除に失敗しました'
        });
    }
});
// リアクション追加/削除
router.post('/comments/:id/reactions', middleware_1.authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { type, action = 'add' } = req.body;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                status: 'error',
                message: '無効なコメントIDです'
            });
        }
        if (!type || !['like', 'dislike', 'helpful', 'agree', 'disagree'].includes(type)) {
            return res.status(400).json({
                status: 'error',
                message: '有効なリアクションタイプを指定してください'
            });
        }
        const comment = await Discussion_1.DiscussionComment.findById(id);
        if (!comment) {
            return res.status(404).json({
                status: 'error',
                message: 'コメントが見つかりません'
            });
        }
        const userId = req.user.userId;
        if (action === 'add') {
            await comment.addReaction(userId, type);
            // リアクション通知（自分のコメントでない場合）
            if (!comment.authorId.equals(new mongoose_1.default.Types.ObjectId(userId))) {
                await Notification_1.Notification.createReactionNotification(comment.authorId.toString(), userId, comment._id.toString(), comment.threadId.toString(), type);
            }
        }
        else if (action === 'remove') {
            await comment.removeReaction(userId);
        }
        const updatedComment = await Discussion_1.DiscussionComment.findById(id)
            .populate('authorId', 'username profile.displayName profile.avatar');
        return res.json({
            status: 'success',
            data: updatedComment
        });
    }
    catch (error) {
        console.error('リアクション処理エラー:', error);
        return res.status(500).json({
            status: 'error',
            message: 'リアクションの処理に失敗しました'
        });
    }
});
// 返信取得
router.get('/comments/:id/replies', middleware_1.authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { page = 1, limit = 10 } = req.query;
        const skip = (Number(page) - 1) * Number(limit);
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                status: 'error',
                message: '無効なコメントIDです'
            });
        }
        const [replies, total] = await Promise.all([
            Discussion_1.DiscussionComment.find({
                parentId: new mongoose_1.default.Types.ObjectId(id),
                isDeleted: false
            })
                .populate('authorId', 'username profile.displayName profile.avatar')
                .populate('mentions.userId', 'username profile.displayName')
                .sort({ createdAt: 1 })
                .skip(skip)
                .limit(Number(limit)),
            Discussion_1.DiscussionComment.countDocuments({
                parentId: new mongoose_1.default.Types.ObjectId(id),
                isDeleted: false
            })
        ]);
        return res.json({
            status: 'success',
            data: {
                replies,
                pagination: {
                    page: Number(page),
                    limit: Number(limit),
                    total,
                    pages: Math.ceil(total / Number(limit))
                }
            }
        });
    }
    catch (error) {
        console.error('返信取得エラー:', error);
        return res.status(500).json({
            status: 'error',
            message: '返信の取得に失敗しました'
        });
    }
});
exports.default = router;
//# sourceMappingURL=discussions.js.map