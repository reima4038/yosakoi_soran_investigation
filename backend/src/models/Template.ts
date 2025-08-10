import mongoose, { Document, Schema } from 'mongoose';

export enum CriterionType {
  NUMERIC = 'numeric',
  SCALE = 'scale',
  BOOLEAN = 'boolean'
}

export interface ICriterion {
  id: string;
  name: string;
  description: string;
  type: CriterionType;
  minValue: number;
  maxValue: number;
  weight: number;
  allowComments?: boolean; // コメント入力を許可するか
}

export interface ICategory {
  id: string;
  name: string;
  description: string;
  weight: number;
  criteria: ICriterion[];
  allowComments?: boolean; // カテゴリレベルでのコメント入力を許可するか
}

export interface ITemplate extends Document {
  name: string;
  description: string;
  createdAt: Date;
  creatorId: mongoose.Types.ObjectId;
  categories: ICategory[];
  allowGeneralComments?: boolean; // テンプレート全体での一般コメントを許可するか
}

const CriterionSchema = new Schema<ICriterion>({
  id: {
    type: String,
    required: true,
    default: () => new mongoose.Types.ObjectId().toString()
  },
  name: {
    type: String,
    required: [true, '評価基準名は必須です'],
    trim: true,
    maxlength: [100, '評価基準名は100文字以下である必要があります']
  },
  description: {
    type: String,
    required: false,
    trim: true,
    maxlength: [500, '評価基準の説明は500文字以下である必要があります']
  },
  type: {
    type: String,
    enum: Object.values(CriterionType),
    required: [true, '評価タイプは必須です']
  },
  minValue: {
    type: Number,
    required: [true, '最小値は必須です'],
    min: [0, '最小値は0以上である必要があります']
  },
  maxValue: {
    type: Number,
    required: [true, '最大値は必須です'],
    min: [1, '最大値は1以上である必要があります'],
    validate: {
      validator: function(this: ICriterion, value: number) {
        return value > this.minValue;
      },
      message: '最大値は最小値より大きい必要があります'
    }
  },
  weight: {
    type: Number,
    required: [true, '重みは必須です'],
    min: [0, '重みは0以上である必要があります'],
    max: [1, '重みは1以下である必要があります'],
    default: 1
  },
  allowComments: {
    type: Boolean,
    default: false
  }
}, { _id: false });

const CategorySchema = new Schema<ICategory>({
  id: {
    type: String,
    required: true,
    default: () => new mongoose.Types.ObjectId().toString()
  },
  name: {
    type: String,
    required: [true, 'カテゴリ名は必須です'],
    trim: true,
    maxlength: [100, 'カテゴリ名は100文字以下である必要があります']
  },
  description: {
    type: String,
    required: false,
    trim: true,
    maxlength: [500, 'カテゴリの説明は500文字以下である必要があります']
  },
  weight: {
    type: Number,
    required: [true, '重みは必須です'],
    min: [0, '重みは0以上である必要があります'],
    max: [1, '重みは1以下である必要があります'],
    default: 1
  },
  criteria: {
    type: [CriterionSchema],
    required: true,
    validate: {
      validator: function(criteria: ICriterion[]) {
        return criteria.length > 0;
      },
      message: 'カテゴリには少なくとも1つの評価基準が必要です'
    }
  },
  allowComments: {
    type: Boolean,
    default: false
  }
}, { _id: false });

const TemplateSchema = new Schema<ITemplate>({
  name: {
    type: String,
    required: [true, 'テンプレート名は必須です'],
    trim: true,
    maxlength: [100, 'テンプレート名は100文字以下である必要があります']
  },
  description: {
    type: String,
    required: [true, 'テンプレートの説明は必須です'],
    trim: true,
    maxlength: [1000, 'テンプレートの説明は1000文字以下である必要があります']
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  creatorId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, '作成者は必須です']
  },
  categories: {
    type: [CategorySchema],
    required: true,
    validate: {
      validator: function(categories: ICategory[]) {
        return categories.length > 0;
      },
      message: 'テンプレートには少なくとも1つのカテゴリが必要です'
    }
  },
  allowGeneralComments: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// インデックス設定
TemplateSchema.index({ creatorId: 1 });
TemplateSchema.index({ name: 1 });
TemplateSchema.index({ createdAt: -1 });

// 重みの合計が1になることを検証するバリデーション
TemplateSchema.pre('save', function(next) {
  // カテゴリの重みの合計をチェック
  const categoryWeightSum = this.categories.reduce((sum, category) => sum + category.weight, 0);
  if (Math.abs(categoryWeightSum - 1) > 0.001) {
    return next(new Error('カテゴリの重みの合計は100%である必要があります'));
  }

  // 各カテゴリ内の評価基準の重みの合計をチェック
  for (const category of this.categories) {
    const criteriaWeightSum = category.criteria.reduce((sum, criterion) => sum + criterion.weight, 0);
    if (Math.abs(criteriaWeightSum - 1) > 0.001) {
      return next(new Error(`カテゴリ「${category.name}」の評価基準の重みの合計は100%である必要があります`));
    }
  }

  next();
});

export const Template = mongoose.model<ITemplate>('Template', TemplateSchema);