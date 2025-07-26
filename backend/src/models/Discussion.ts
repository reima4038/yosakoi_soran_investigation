import mongoose, { Document, Schema } from 'mongoose';

export enum DiscussionType {
  SHARE_COMMENT = 'share_comment',
  EVALUATION_FEEDBACK = 'evaluation_feedback',
  SESSION_DISCUSSION = 'session_discussion'
}

export interface IMention {
  userId: mongoose.Types.ObjectId;
  username: string;
  position: number; // メンション位置
}

export interface IDiscussionThread extends Document {
  shareId?: mongoose.Types.ObjectId;
  evaluationId?: mongoose.Types.ObjectId;
  sessionId?: mongoose.Types.ObjectId;
  type: DiscussionType;
  title?: string;
  isActive: boolean;
  participantIds: mongoose.Types.ObjectId[];
  lastActivityAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IDiscussionComment extends Document {
  threadId: mongoose.Types.ObjectId;
  parentId?: mongoose.Types.ObjectId; // 返信の場合の親コメントID
  authorId: mongoose.Types.ObjectId;
  content: string;
  mentions: IMention[];
  isEdited: boolean;
  editedAt?: Date;
  isDeleted: boolean;
  deletedAt?: Date;
  reactions: {
    userId: mongoose.Types.ObjectId;
    type: string; // 'like', 'dislike', 'helpful', etc.
    createdAt: Date;
  }[];
  attachments: {
    type: string; // 'image', 'file', 'link'
    url: string;
    name: string;
    size?: number;
  }[];
  createdAt: Date;
  updatedAt: Date;
  extractMentions(content: string): IMention[];
  addReaction(userId: string, reactionType: string): Promise<IDiscussionComment>;
  removeReaction(userId: string): Promise<IDiscussionComment>;
  softDelete(): Promise<IDiscussionComment>;
  getReplyCount(): Promise<number>;
}

const MentionSchema = new Schema<IMention>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  username: {
    type: String,
    required: true
  },
  position: {
    type: Number,
    required: true
  }
});

const DiscussionThreadSchema = new Schema<IDiscussionThread>({
  shareId: {
    type: Schema.Types.ObjectId,
    ref: 'Share'
  },
  evaluationId: {
    type: Schema.Types.ObjectId,
    ref: 'Evaluation'
  },
  sessionId: {
    type: Schema.Types.ObjectId,
    ref: 'Session'
  },
  type: {
    type: String,
    enum: Object.values(DiscussionType),
    required: true
  },
  title: {
    type: String,
    maxlength: [200, 'タイトルは200文字以下である必要があります']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  participantIds: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  lastActivityAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

const DiscussionCommentSchema = new Schema<IDiscussionComment>({
  threadId: {
    type: Schema.Types.ObjectId,
    ref: 'DiscussionThread',
    required: true
  },
  parentId: {
    type: Schema.Types.ObjectId,
    ref: 'DiscussionComment'
  },
  authorId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: [true, 'コメント内容は必須です'],
    maxlength: [5000, 'コメントは5000文字以下である必要があります']
  },
  mentions: [MentionSchema],
  isEdited: {
    type: Boolean,
    default: false
  },
  editedAt: {
    type: Date
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date
  },
  reactions: [{
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    type: {
      type: String,
      enum: ['like', 'dislike', 'helpful', 'agree', 'disagree'],
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  attachments: [{
    type: {
      type: String,
      enum: ['image', 'file', 'link'],
      required: true
    },
    url: {
      type: String,
      required: true
    },
    name: {
      type: String,
      required: true
    },
    size: {
      type: Number
    }
  }]
}, {
  timestamps: true
});

// インデックス設定
DiscussionThreadSchema.index({ shareId: 1 });
DiscussionThreadSchema.index({ evaluationId: 1 });
DiscussionThreadSchema.index({ sessionId: 1 });
DiscussionThreadSchema.index({ type: 1 });
DiscussionThreadSchema.index({ isActive: 1 });
DiscussionThreadSchema.index({ lastActivityAt: -1 });
DiscussionThreadSchema.index({ participantIds: 1 });

DiscussionCommentSchema.index({ threadId: 1 });
DiscussionCommentSchema.index({ parentId: 1 });
DiscussionCommentSchema.index({ authorId: 1 });
DiscussionCommentSchema.index({ isDeleted: 1 });
DiscussionCommentSchema.index({ createdAt: -1 });
DiscussionCommentSchema.index({ 'mentions.userId': 1 });

// 複合インデックス
DiscussionCommentSchema.index({ threadId: 1, createdAt: -1 });
DiscussionCommentSchema.index({ threadId: 1, parentId: 1, createdAt: 1 });

// スレッドの最終活動時間を更新
DiscussionCommentSchema.pre('save', async function(next) {
  if (this.isNew && !this.isDeleted) {
    await DiscussionThread.findByIdAndUpdate(
      this.threadId,
      { 
        lastActivityAt: new Date(),
        $addToSet: { participantIds: this.authorId }
      }
    );
  }
  next();
});

// メンション抽出メソッド
DiscussionCommentSchema.methods.extractMentions = function(content: string): IMention[] {
  const mentionRegex = /@(\w+)/g;
  const mentions: IMention[] = [];
  let match;
  
  while ((match = mentionRegex.exec(content)) !== null) {
    mentions.push({
      userId: new mongoose.Types.ObjectId(), // 実際の実装では username から userId を取得
      username: match[1],
      position: match.index
    } as IMention);
  }
  
  return mentions;
};

// リアクション追加メソッド
DiscussionCommentSchema.methods.addReaction = function(userId: string, reactionType: string) {
  // 既存のリアクションを削除
  this.reactions = this.reactions.filter(
    (reaction: any) => !reaction.userId.equals(new mongoose.Types.ObjectId(userId))
  );
  
  // 新しいリアクションを追加
  this.reactions.push({
    userId: new mongoose.Types.ObjectId(userId),
    type: reactionType,
    createdAt: new Date()
  });
  
  return this.save();
};

// リアクション削除メソッド
DiscussionCommentSchema.methods.removeReaction = function(userId: string) {
  this.reactions = this.reactions.filter(
    (reaction: any) => !reaction.userId.equals(new mongoose.Types.ObjectId(userId))
  );
  
  return this.save();
};

// ソフト削除メソッド
DiscussionCommentSchema.methods.softDelete = function() {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.content = '[削除されたコメント]';
  return this.save();
};

// 返信数取得メソッド
DiscussionCommentSchema.methods.getReplyCount = async function() {
  return await DiscussionComment.countDocuments({
    parentId: this._id,
    isDeleted: false
  });
};

export const DiscussionThread = mongoose.model<IDiscussionThread>('DiscussionThread', DiscussionThreadSchema);
export const DiscussionComment = mongoose.model<IDiscussionComment>('DiscussionComment', DiscussionCommentSchema);