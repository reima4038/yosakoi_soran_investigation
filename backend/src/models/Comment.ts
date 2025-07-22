import mongoose, { Document, Schema } from 'mongoose';

export enum CommentType {
  GENERAL = 'general',
  CRITERION = 'criterion',
  CATEGORY = 'category',
  REPLY = 'reply'
}

export interface IComment extends Document {
  evaluationId: mongoose.Types.ObjectId;
  authorId: mongoose.Types.ObjectId;
  content: string;
  type: CommentType;
  targetId?: string; // 評価基準ID、カテゴリID、または親コメントID
  isAnonymous: boolean;
  likes: mongoose.Types.ObjectId[];
  replies: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const CommentSchema = new Schema<IComment>({
  evaluationId: {
    type: Schema.Types.ObjectId,
    ref: 'Evaluation',
    required: [true, '評価IDは必須です']
  },
  authorId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, '作成者IDは必須です']
  },
  content: {
    type: String,
    required: [true, 'コメント内容は必須です'],
    trim: true,
    minlength: [1, 'コメントは1文字以上である必要があります'],
    maxlength: [1000, 'コメントは1000文字以下である必要があります']
  },
  type: {
    type: String,
    enum: Object.values(CommentType),
    required: [true, 'コメントタイプは必須です'],
    default: CommentType.GENERAL
  },
  targetId: {
    type: String,
    trim: true,
    validate: {
      validator: function(this: any, value: string): boolean {
        // REPLYタイプの場合はtargetIdが必須
        if (this.type === CommentType.REPLY) {
          return !!(value && value.length > 0);
        }
        return true;
      },
      message: '返信コメントには対象IDが必要です'
    }
  },
  isAnonymous: {
    type: Boolean,
    default: false
  },
  likes: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  replies: [{
    type: Schema.Types.ObjectId,
    ref: 'Comment'
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// インデックス設定
CommentSchema.index({ evaluationId: 1 });
CommentSchema.index({ authorId: 1 });
CommentSchema.index({ type: 1 });
CommentSchema.index({ targetId: 1 });
CommentSchema.index({ createdAt: -1 });

// 複合インデックス
CommentSchema.index({ evaluationId: 1, type: 1 });
CommentSchema.index({ evaluationId: 1, createdAt: -1 });
CommentSchema.index({ authorId: 1, createdAt: -1 });

// 返信コメントの場合、親コメントの replies 配列を更新
CommentSchema.post('save', async function(doc: any) {
  if (doc.type === CommentType.REPLY && doc.targetId) {
    try {
      await Comment.findByIdAndUpdate(
        doc.targetId,
        { $addToSet: { replies: doc._id } }
      );
    } catch (error) {
      console.error('親コメントの更新に失敗しました:', error);
    }
  }
});

// コメント削除時の処理
CommentSchema.pre('deleteOne', { document: true, query: false }, async function(next) {
  try {
    const doc = this as any;
    // 返信コメントをすべて削除
    if (doc.replies && doc.replies.length > 0) {
      await Comment.deleteMany({ _id: { $in: doc.replies } });
    }

    // 親コメントから自分への参照を削除
    if (doc.type === CommentType.REPLY && doc.targetId) {
      await Comment.findByIdAndUpdate(
        doc.targetId,
        { $pull: { replies: doc._id } }
      );
    }

    next();
  } catch (error) {
    next(error as Error);
  }
});

// 匿名コメントの場合の処理
CommentSchema.methods.toJSON = function() {
  const obj = this.toObject();
  if (this.isAnonymous) {
    delete obj.authorId;
  }
  return obj;
};

// いいね機能のメソッド
CommentSchema.methods.toggleLike = function(userId: mongoose.Types.ObjectId) {
  const likeIndex = this.likes.indexOf(userId);
  if (likeIndex > -1) {
    this.likes.splice(likeIndex, 1);
    return false; // いいねを取り消し
  } else {
    this.likes.push(userId);
    return true; // いいねを追加
  }
};

// いいね数を取得するバーチャルフィールド
CommentSchema.virtual('likeCount').get(function() {
  const doc = this as any;
  return doc.likes ? doc.likes.length : 0;
});

// 返信数を取得するバーチャルフィールド
CommentSchema.virtual('replyCount').get(function() {
  const doc = this as any;
  return doc.replies ? doc.replies.length : 0;
});

// バーチャルフィールドをJSONに含める
CommentSchema.set('toJSON', { virtuals: true });

export const Comment = mongoose.model<IComment>('Comment', CommentSchema);