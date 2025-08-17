import mongoose, { Document, Schema } from 'mongoose';

export interface IInviteLinkUsage extends Document {
  sessionId: mongoose.Types.ObjectId;
  token: string;
  usedBy?: mongoose.Types.ObjectId; // ユーザーID（ログイン済みの場合）
  usedAt: Date;
  ipAddress: string;
  userAgent: string;
  success: boolean;
  errorReason?: string;
  createdAt: Date;
}

const InviteLinkUsageSchema = new Schema<IInviteLinkUsage>({
  sessionId: {
    type: Schema.Types.ObjectId,
    ref: 'Session',
    required: [true, 'セッションIDは必須です']
  },
  token: {
    type: String,
    required: [true, 'トークンは必須です'],
    trim: true
  },
  usedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  usedAt: {
    type: Date,
    required: [true, '使用日時は必須です'],
    default: Date.now
  },
  ipAddress: {
    type: String,
    required: [true, 'IPアドレスは必須です'],
    trim: true
  },
  userAgent: {
    type: String,
    required: [true, 'ユーザーエージェントは必須です'],
    trim: true
  },
  success: {
    type: Boolean,
    required: [true, '成功フラグは必須です'],
    default: false
  },
  errorReason: {
    type: String,
    trim: true,
    maxlength: [500, 'エラー理由は500文字以下である必要があります']
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// インデックス設定
InviteLinkUsageSchema.index({ sessionId: 1 });
InviteLinkUsageSchema.index({ token: 1 });
InviteLinkUsageSchema.index({ usedBy: 1 });
InviteLinkUsageSchema.index({ usedAt: 1 });
InviteLinkUsageSchema.index({ success: 1 });
InviteLinkUsageSchema.index({ ipAddress: 1 });

// 複合インデックス
InviteLinkUsageSchema.index({ sessionId: 1, usedAt: -1 });
InviteLinkUsageSchema.index({ sessionId: 1, success: 1 });
InviteLinkUsageSchema.index({ token: 1, usedAt: -1 });

export const InviteLinkUsage = mongoose.model<IInviteLinkUsage>('InviteLinkUsage', InviteLinkUsageSchema);