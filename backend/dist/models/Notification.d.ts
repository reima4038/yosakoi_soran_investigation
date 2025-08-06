import mongoose, { Document } from 'mongoose';
export declare enum NotificationType {
    MENTION = "mention",
    REPLY = "reply",
    REACTION = "reaction",
    SHARE_COMMENT = "share_comment",
    EVALUATION_FEEDBACK = "evaluation_feedback",
    SESSION_UPDATE = "session_update",
    DEADLINE_REMINDER = "deadline_reminder"
}
export declare enum NotificationStatus {
    UNREAD = "unread",
    READ = "read",
    ARCHIVED = "archived"
}
export interface INotification extends Document {
    recipientId: mongoose.Types.ObjectId;
    senderId?: mongoose.Types.ObjectId;
    type: NotificationType;
    title: string;
    message: string;
    status: NotificationStatus;
    relatedResourceType?: string;
    relatedResourceId?: mongoose.Types.ObjectId;
    actionUrl?: string;
    metadata: {
        [key: string]: any;
    };
    readAt?: Date;
    createdAt: Date;
    updatedAt: Date;
    markAsRead(): Promise<INotification>;
    archive(): Promise<INotification>;
}
interface INotificationModel extends mongoose.Model<INotification> {
    createNotification(data: any): Promise<INotification>;
    createMentionNotification(mentionedUserId: string, mentionerUserId: string, commentId: string, threadId: string, content: string): Promise<INotification>;
    createReplyNotification(originalAuthorId: string, replierUserId: string, commentId: string, threadId: string, content: string): Promise<INotification>;
    createReactionNotification(commentAuthorId: string, reactorUserId: string, commentId: string, threadId: string, reactionType: string): Promise<INotification>;
    markAllAsRead(recipientId: string): Promise<any>;
    cleanupOldNotifications(): Promise<any>;
}
export declare const Notification: INotificationModel;
export {};
//# sourceMappingURL=Notification.d.ts.map