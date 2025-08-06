"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.Notification = exports.NotificationStatus = exports.NotificationType = void 0;
const mongoose_1 = __importStar(require("mongoose"));
var NotificationType;
(function (NotificationType) {
    NotificationType["MENTION"] = "mention";
    NotificationType["REPLY"] = "reply";
    NotificationType["REACTION"] = "reaction";
    NotificationType["SHARE_COMMENT"] = "share_comment";
    NotificationType["EVALUATION_FEEDBACK"] = "evaluation_feedback";
    NotificationType["SESSION_UPDATE"] = "session_update";
    NotificationType["DEADLINE_REMINDER"] = "deadline_reminder";
})(NotificationType || (exports.NotificationType = NotificationType = {}));
var NotificationStatus;
(function (NotificationStatus) {
    NotificationStatus["UNREAD"] = "unread";
    NotificationStatus["READ"] = "read";
    NotificationStatus["ARCHIVED"] = "archived";
})(NotificationStatus || (exports.NotificationStatus = NotificationStatus = {}));
const NotificationSchema = new mongoose_1.Schema({
    recipientId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, '受信者IDは必須です']
    },
    senderId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User'
    },
    type: {
        type: String,
        enum: Object.values(NotificationType),
        required: [true, '通知タイプは必須です']
    },
    title: {
        type: String,
        required: [true, 'タイトルは必須です'],
        maxlength: [200, 'タイトルは200文字以下である必要があります']
    },
    message: {
        type: String,
        required: [true, 'メッセージは必須です'],
        maxlength: [1000, 'メッセージは1000文字以下である必要があります']
    },
    status: {
        type: String,
        enum: Object.values(NotificationStatus),
        default: NotificationStatus.UNREAD
    },
    relatedResourceType: {
        type: String,
        enum: ['share', 'evaluation', 'session', 'comment', 'thread']
    },
    relatedResourceId: {
        type: mongoose_1.Schema.Types.ObjectId
    },
    actionUrl: {
        type: String
    },
    metadata: {
        type: mongoose_1.Schema.Types.Mixed,
        default: {}
    },
    readAt: {
        type: Date
    }
}, {
    timestamps: true
});
// インデックス設定
NotificationSchema.index({ recipientId: 1 });
NotificationSchema.index({ senderId: 1 });
NotificationSchema.index({ type: 1 });
NotificationSchema.index({ status: 1 });
NotificationSchema.index({ createdAt: -1 });
NotificationSchema.index({ relatedResourceType: 1, relatedResourceId: 1 });
// 複合インデックス
NotificationSchema.index({ recipientId: 1, status: 1, createdAt: -1 });
NotificationSchema.index({ recipientId: 1, type: 1, createdAt: -1 });
// 既読にするメソッド
NotificationSchema.methods.markAsRead = function () {
    this.status = NotificationStatus.READ;
    this.readAt = new Date();
    return this.save();
};
// アーカイブするメソッド
NotificationSchema.methods.archive = function () {
    this.status = NotificationStatus.ARCHIVED;
    return this.save();
};
// 通知作成のスタティックメソッド
NotificationSchema.statics.createNotification = async function (data) {
    const notification = new this({
        recipientId: new mongoose_1.default.Types.ObjectId(data.recipientId),
        senderId: data.senderId ? new mongoose_1.default.Types.ObjectId(data.senderId) : undefined,
        type: data.type,
        title: data.title,
        message: data.message,
        relatedResourceType: data.relatedResourceType,
        relatedResourceId: data.relatedResourceId ? new mongoose_1.default.Types.ObjectId(data.relatedResourceId) : undefined,
        actionUrl: data.actionUrl,
        metadata: data.metadata || {}
    });
    await notification.save();
    return notification;
};
// メンション通知作成
NotificationSchema.statics.createMentionNotification = async function (mentionedUserId, mentionerUserId, commentId, threadId, content) {
    const title = 'コメントでメンションされました';
    const message = `${content.substring(0, 100)}${content.length > 100 ? '...' : ''}`;
    return this.createNotification({
        recipientId: mentionedUserId,
        senderId: mentionerUserId,
        type: NotificationType.MENTION,
        title,
        message,
        relatedResourceType: 'comment',
        relatedResourceId: commentId,
        actionUrl: `/discussions/${threadId}#comment-${commentId}`,
        metadata: {
            threadId,
            commentId
        }
    });
};
// 返信通知作成
NotificationSchema.statics.createReplyNotification = async function (originalAuthorId, replierUserId, commentId, threadId, content) {
    const title = 'コメントに返信がありました';
    const message = `${content.substring(0, 100)}${content.length > 100 ? '...' : ''}`;
    return this.createNotification({
        recipientId: originalAuthorId,
        senderId: replierUserId,
        type: NotificationType.REPLY,
        title,
        message,
        relatedResourceType: 'comment',
        relatedResourceId: commentId,
        actionUrl: `/discussions/${threadId}#comment-${commentId}`,
        metadata: {
            threadId,
            commentId
        }
    });
};
// リアクション通知作成
NotificationSchema.statics.createReactionNotification = async function (commentAuthorId, reactorUserId, commentId, threadId, reactionType) {
    const reactionText = {
        like: 'いいね',
        helpful: '参考になった',
        agree: '同意',
        disagree: '反対'
    }[reactionType] || reactionType;
    const title = `コメントに「${reactionText}」されました`;
    const message = 'あなたのコメントにリアクションがありました';
    return this.createNotification({
        recipientId: commentAuthorId,
        senderId: reactorUserId,
        type: NotificationType.REACTION,
        title,
        message,
        relatedResourceType: 'comment',
        relatedResourceId: commentId,
        actionUrl: `/discussions/${threadId}#comment-${commentId}`,
        metadata: {
            threadId,
            commentId,
            reactionType
        }
    });
};
// 一括既読
NotificationSchema.statics.markAllAsRead = async function (recipientId) {
    return this.updateMany({
        recipientId: new mongoose_1.default.Types.ObjectId(recipientId),
        status: NotificationStatus.UNREAD
    }, {
        status: NotificationStatus.READ,
        readAt: new Date()
    });
};
// 古い通知の削除（30日以上前のアーカイブ済み通知）
NotificationSchema.statics.cleanupOldNotifications = async function () {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    return this.deleteMany({
        status: NotificationStatus.ARCHIVED,
        updatedAt: { $lt: thirtyDaysAgo }
    });
};
exports.Notification = mongoose_1.default.model('Notification', NotificationSchema);
//# sourceMappingURL=Notification.js.map