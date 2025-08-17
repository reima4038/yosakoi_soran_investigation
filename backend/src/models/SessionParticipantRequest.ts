import mongoose, { Document, Schema } from 'mongoose';

export enum ParticipantRequestStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected'
}

export interface ISessionParticipantRequest extends Document {
  sessionId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  requestedAt: Date;
  status: ParticipantRequestStatus;
  reviewedBy?: mongoose.Types.ObjectId;
  reviewedAt?: Date;
  reviewComment?: string;
  inviteToken: string;
  requestMessage?: string;
  createdAt: Date;
}

const SessionParticipantRequestSchema = new Schema<ISessionParticipantRequest>({
  sessionId: {
    type: Schema.Types.ObjectId,
    ref: 'Session',
    required: [true, 'セッションIDは必須です']
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'ユーザーIDは必須です']
  },
  requestedAt: {
    type: Date,
    required: [true, '申請日時は必須です'],
    default: Date.now
  },
  status: {
    type: String,
    enum: Object.values(ParticipantRequestStatus),
    default: ParticipantRequestStatus.PENDING,
    required: true
  },
  reviewedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  reviewedAt: {
    type: Date,
    required: false
  },
  reviewComment: {
    type: String,
    trim: true,
    maxlength: [500, 'レビューコメントは500文字以下である必要があります']
  },
  inviteToken: {
    type: String,
    required: [true, '招待トークンは必須です'],
    trim: true
  },
  requestMessage: {
    type: String,
    trim: true,
    maxlength: [1000, '申請メッセージは1000文字以下である必要があります']
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// インデックス設定
SessionParticipantRequestSchema.index({ sessionId: 1 });
SessionParticipantRequestSchema.index({ userId: 1 });
SessionParticipantRequestSchema.index({ status: 1 });
SessionParticipantRequestSchema.index({ requestedAt: 1 });

// 複合インデックス
SessionParticipantRequestSchema.index({ sessionId: 1, userId: 1 }, { unique: true });
SessionParticipantRequestSchema.index({ sessionId: 1, status: 1 });
SessionParticipantRequestSchema.index({ userId: 1, status: 1 });

export const SessionParticipantRequest = mongoose.model<ISessionParticipantRequest>('SessionParticipantRequest', SessionParticipantRequestSchema);