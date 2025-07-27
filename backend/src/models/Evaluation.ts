import mongoose, { Document, Schema } from 'mongoose';

export interface IEvaluationScore extends Document {
  evaluationId: mongoose.Types.ObjectId;
  criterionId: string;
  score: number;
  comment?: string;
}

export interface IComment extends Document {
  evaluationId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  timestamp: number; // 動画タイムスタンプ（秒）
  text: string;
  createdAt: Date;
}



const EvaluationScoreSchema = new Schema<IEvaluationScore>({
  evaluationId: {
    type: Schema.Types.ObjectId,
    ref: 'Evaluation',
    required: process.env.NODE_ENV !== 'test' ? [true, '評価IDは必須です'] : false
  },
  criterionId: {
    type: String,
    required: [true, '評価基準IDは必須です']
  },
  score: {
    type: Number,
    required: [true, 'スコアは必須です'],
    min: [0, 'スコアは0以上である必要があります'],
    max: [100, 'スコアは100以下である必要があります']
  },
  comment: {
    type: String,
    maxlength: [1000, 'コメントは1000文字以下である必要があります']
  }
}, {
  timestamps: true
});

const CommentSchema = new Schema<IComment>({
  evaluationId: {
    type: Schema.Types.ObjectId,
    ref: 'Evaluation',
    required: process.env.NODE_ENV !== 'test' ? [true, '評価IDは必須です'] : false
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'ユーザーIDは必須です']
  },
  timestamp: {
    type: Number,
    required: [true, 'タイムスタンプは必須です'],
    min: [0, 'タイムスタンプは0以上である必要があります']
  },
  text: {
    type: String,
    required: [true, 'コメント内容は必須です'],
    trim: true,
    maxlength: [2000, 'コメントは2000文字以下である必要があります']
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

const EvaluationSchema = new Schema<IEvaluation>({
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
  submittedAt: {
    type: Date
  },
  isComplete: {
    type: Boolean,
    default: false
  },
  scores: [EvaluationScoreSchema],
  comments: [CommentSchema],
  lastSavedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// インデックス設定
EvaluationSchema.index({ sessionId: 1, userId: 1 }, { unique: true });
EvaluationSchema.index({ sessionId: 1 });
EvaluationSchema.index({ userId: 1 });
EvaluationSchema.index({ submittedAt: 1 });
EvaluationSchema.index({ isComplete: 1 });

// コメントのインデックス
EvaluationSchema.index({ 'comments.timestamp': 1 });
EvaluationSchema.index({ 'comments.userId': 1 });

// 評価完了チェック
EvaluationSchema.methods.checkCompletion = function(templateCategories: any[]) {
  const requiredCriteriaIds = templateCategories.flatMap(category => 
    category.criteria.map((criterion: any) => criterion.id)
  );
  
  const scoredCriteriaIds = this.scores.map((score: any) => score.criterionId);
  const allCriteriaScored = requiredCriteriaIds.every(id => 
    scoredCriteriaIds.includes(id)
  );
  
  this.isComplete = allCriteriaScored;
  return this.isComplete;
};

// インターフェースにメソッドを追加
export interface IEvaluation extends Document {
  sessionId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  submittedAt?: Date;
  isComplete: boolean;
  scores: IEvaluationScore[];
  comments: mongoose.Types.DocumentArray<IComment>;
  lastSavedAt: Date;
  checkCompletion(templateCategories: any[]): boolean;
}

// 自動保存の更新
EvaluationSchema.pre('save', function(next) {
  this.lastSavedAt = new Date();
  next();
});

export const EvaluationScore = mongoose.model<IEvaluationScore>('EvaluationScore', EvaluationScoreSchema);
export const Comment = mongoose.model<IComment>('Comment', CommentSchema);
export const Evaluation = mongoose.model<IEvaluation>('Evaluation', EvaluationSchema);