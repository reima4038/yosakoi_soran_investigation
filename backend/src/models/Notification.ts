import mongoose, { Document, Schema } from 'mongoose';

export enum NotificationType {
  MENTION = 'mention',
  REPLY = 'reply',
  REACTION = 'reaction',
  SHARE_COMMENT = 'share_comment',
  EVALUATION_FEEDBACK = 'evaluation_feedback',
  SESSION_UPDATE = 'session_update',
  DEADLINE_REMINDER = 'deadline_reminder'
}

export enum NotificationStatus {
  UNREAD = 'unread',
  READ = 'read',
  ARCHIVED = 'archived'
}

export interface INotification extends Document {
  recipientId: mongoose.Types.ObjectId;
  senderId?: mongoose.Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  status: NotificationStatus;
  relatedResourceType?: string; // 'share', 'evaluation', 'session', 'comment'
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

const NotificationSchema = new Schema<INotification>({
  recipientId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, '受信者IDは必須です']
  },
  senderId: {
    type: Schema.Types.ObjectId,
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
    type: Schema.Types.ObjectId
  },
  actionUrl: {
    type: String
  },
  metadata: {
    type: Schema.Types.Mixed,
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
NotificationSchema.methods.markAsRead = function() {
  this.status = NotificationStatus.READ;
  this.readAt = new Date();
  return this.save();
};

// アーカイブするメソッド
NotificationSchema.methods.archive = function() {
  this.status = NotificationStatus.ARCHIVED;
  return this.save();
};

// 通知作成のスタティックメソッド
NotificationSchema.statics.createNotification = async function(data: {
  recipientId: string;
  senderId?: string;
  type: NotificationType;
  title: string;
  message: string;
  relatedResourceType?: string;
  relatedResourceId?: string;
  actionUrl?: string;
  metadata?: any;
}) {
  const notification = new this({
    recipientId: new mongoose.Types.ObjectId(data.recipientId),
    senderId: data.senderId ? new mongoose.Types.ObjectId(data.senderId) : undefined,
    type: data.type,
    title: data.title,
    message: data.message,
    relatedResourceType: data.relatedResourceType,
    relatedResourceId: data.relatedResourceId ? new mongoose.Types.ObjectId(data.relatedResourceId) : undefined,
    actionUrl: data.actionUrl,
    metadata: data.metadata || {}
  });

  await notification.save();
  return notification;
};

// メンション通知作成
NotificationSchema.statics.createMentionNotification = async function(
  mentionedUserId: string,
  mentionerUserId: string,
  commentId: string,
  threadId: string,
  content: string
) {
  const title = 'コメントでメンションされました';
  const message = `${content.substring(0, 100)}${content.length > 100 ? '...' : ''}`;
  
  return (this as any).createNotification({
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
NotificationSchema.statics.createReplyNotification = async function(
  originalAuthorId: string,
  replierUserId: string,
  commentId: string,
  threadId: string,
  content: string
) {
  const title = 'コメントに返信がありました';
  const message = `${content.substring(0, 100)}${content.length > 100 ? '...' : ''}`;
  
  return (this as any).createNotification({
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
NotificationSchema.statics.createReactionNotification = async function(
  commentAuthorId: string,
  reactorUserId: string,
  commentId: string,
  threadId: string,
  reactionType: string
) {
  const reactionText = {
    like: 'いいね',
    helpful: '参考になった',
    agree: '同意',
    disagree: '反対'
  }[reactionType] || reactionType;

  const title = `コメントに「${reactionText}」されました`;
  const message = 'あなたのコメントにリアクションがありました';
  
  return (this as any).createNotification({
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
NotificationSchema.statics.markAllAsRead = async function(recipientId: string) {
  return this.updateMany(
    { 
      recipientId: new mongoose.Types.ObjectId(recipientId),
      status: NotificationStatus.UNREAD
    },
    { 
      status: NotificationStatus.READ,
      readAt: new Date()
    }
  );
};

// 古い通知の削除（30日以上前のアーカイブ済み通知）
NotificationSchema.statics.cleanupOldNotifications = async function() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  
  return this.deleteMany({
    status: NotificationStatus.ARCHIVED,
    updatedAt: { $lt: thirtyDaysAgo }
  });
};

// インターフェースにスタティックメソッドを追加
interface INotificationModel extends mongoose.Model<INotification> {
  createNotification(data: any): Promise<INotification>;
  createMentionNotification(mentionedUserId: string, mentionerUserId: string, commentId: string, threadId: string, content: string): Promise<INotification>;
  createReplyNotification(originalAuthorId: string, replierUserId: string, commentId: string, threadId: string, content: string): Promise<INotification>;
  createReactionNotification(commentAuthorId: string, reactorUserId: string, commentId: string, threadId: string, reactionType: string): Promise<INotification>;
  markAllAsRead(recipientId: string): Promise<any>;
  cleanupOldNotifications(): Promise<any>;
}

export const Notification = mongoose.model<INotification, INotificationModel>('Notification', NotificationSchema);