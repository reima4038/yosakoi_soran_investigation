import mongoose, { Document, Schema } from 'mongoose';

export enum ShareType {
  SESSION_RESULTS = 'session_results',
  EVALUATION = 'evaluation',
  ANALYSIS = 'analysis'
}

export enum SharePermission {
  VIEW = 'view',
  COMMENT = 'comment',
  EDIT = 'edit'
}

export enum ShareVisibility {
  PUBLIC = 'public',
  PRIVATE = 'private',
  PASSWORD_PROTECTED = 'password_protected',
  SPECIFIC_USERS = 'specific_users'
}

export interface IShare extends Document {
  resourceType: ShareType;
  resourceId: mongoose.Types.ObjectId;
  creatorId: mongoose.Types.ObjectId;
  shareToken: string;
  visibility: ShareVisibility;
  password?: string;
  allowedUsers: mongoose.Types.ObjectId[];
  permissions: SharePermission[];
  expiresAt?: Date;
  isActive: boolean;
  settings: {
    allowComments: boolean;
    allowDownload: boolean;
    showEvaluatorNames: boolean;
    showIndividualScores: boolean;
  };
  accessLog: {
    userId?: mongoose.Types.ObjectId;
    accessedAt: Date;
    ipAddress: string;
    userAgent: string;
  }[];
  createdAt: Date;
  updatedAt: Date;
  isExpired(): boolean;
  hasAccess(userId?: string): boolean;
  logAccess(userId: string | undefined, ipAddress: string, userAgent: string): Promise<IShare>;
}

const ShareSchema = new Schema<IShare>({
  resourceType: {
    type: String,
    enum: Object.values(ShareType),
    required: [true, 'リソースタイプは必須です']
  },
  resourceId: {
    type: Schema.Types.ObjectId,
    required: [true, 'リソースIDは必須です'],
    refPath: 'resourceType'
  },
  creatorId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, '作成者IDは必須です']
  },
  shareToken: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  visibility: {
    type: String,
    enum: Object.values(ShareVisibility),
    default: ShareVisibility.PRIVATE,
    required: true
  },
  password: {
    type: String,
    select: false // デフォルトでは取得しない
  },
  allowedUsers: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  permissions: [{
    type: String,
    enum: Object.values(SharePermission),
    default: [SharePermission.VIEW]
  }],
  expiresAt: {
    type: Date,
    validate: {
      validator: function(value: Date) {
        if (!value) return true;
        return value > new Date();
      },
      message: '有効期限は現在時刻より後である必要があります'
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  settings: {
    allowComments: {
      type: Boolean,
      default: true
    },
    allowDownload: {
      type: Boolean,
      default: false
    },
    showEvaluatorNames: {
      type: Boolean,
      default: false
    },
    showIndividualScores: {
      type: Boolean,
      default: true
    }
  },
  accessLog: [{
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    accessedAt: {
      type: Date,
      default: Date.now
    },
    ipAddress: {
      type: String,
      required: true
    },
    userAgent: {
      type: String,
      required: true
    }
  }]
}, {
  timestamps: true
});

// インデックス設定
ShareSchema.index({ shareToken: 1 });
ShareSchema.index({ resourceType: 1, resourceId: 1 });
ShareSchema.index({ creatorId: 1 });
ShareSchema.index({ visibility: 1 });
ShareSchema.index({ isActive: 1 });
ShareSchema.index({ expiresAt: 1 });

// 複合インデックス
ShareSchema.index({ resourceType: 1, resourceId: 1, creatorId: 1 });
ShareSchema.index({ isActive: 1, expiresAt: 1 });

// 有効期限チェック
ShareSchema.methods.isExpired = function(): boolean {
  if (!this.expiresAt) return false;
  return this.expiresAt < new Date();
};

// アクセス権限チェック
ShareSchema.methods.hasAccess = function(userId?: string): boolean {
  if (!this.isActive || this.isExpired()) return false;
  
  switch (this.visibility) {
    case ShareVisibility.PUBLIC:
      return true;
    case ShareVisibility.PRIVATE:
      return Boolean(userId && this.creatorId.toString() === userId);
    case ShareVisibility.SPECIFIC_USERS:
      return Boolean(userId && (
        this.creatorId.toString() === userId ||
        this.allowedUsers.some((allowedUserId: mongoose.Types.ObjectId) => allowedUserId.toString() === userId)
      ));
    case ShareVisibility.PASSWORD_PROTECTED:
      return true; // パスワード確認は別途実装
    default:
      return false;
  }
};

// アクセスログ追加
ShareSchema.methods.logAccess = function(userId: string | undefined, ipAddress: string, userAgent: string) {
  this.accessLog.push({
    userId: userId ? new mongoose.Types.ObjectId(userId) : undefined,
    accessedAt: new Date(),
    ipAddress,
    userAgent
  });
  
  // ログは最新100件まで保持
  if (this.accessLog.length > 100) {
    this.accessLog = this.accessLog.slice(-100);
  }
  
  return this.save();
};

// 共有トークン生成
ShareSchema.statics.generateShareToken = function(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// インターフェースにスタティックメソッドを追加
interface IShareModel extends mongoose.Model<IShare> {
  generateShareToken(): string;
  deactivateExpired(): Promise<any>;
}

// 期限切れの共有を無効化するスケジュール処理用
ShareSchema.statics.deactivateExpired = async function() {
  const now = new Date();
  const result = await this.updateMany(
    { 
      isActive: true,
      expiresAt: { $lt: now }
    },
    { 
      isActive: false 
    }
  );
  return result;
};

export const Share = mongoose.model<IShare, IShareModel>('Share', ShareSchema);