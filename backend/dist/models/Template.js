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
exports.Template = exports.CriterionType = void 0;
const mongoose_1 = __importStar(require("mongoose"));
var CriterionType;
(function (CriterionType) {
    CriterionType["NUMERIC"] = "numeric";
    CriterionType["SCALE"] = "scale";
    CriterionType["BOOLEAN"] = "boolean";
})(CriterionType || (exports.CriterionType = CriterionType = {}));
const CriterionSchema = new mongoose_1.Schema({
    id: {
        type: String,
        required: true,
        default: () => new mongoose_1.default.Types.ObjectId().toString()
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
            validator: function (value) {
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
const CategorySchema = new mongoose_1.Schema({
    id: {
        type: String,
        required: true,
        default: () => new mongoose_1.default.Types.ObjectId().toString()
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
            validator: function (criteria) {
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
const TemplateSchema = new mongoose_1.Schema({
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
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, '作成者は必須です']
    },
    categories: {
        type: [CategorySchema],
        required: true,
        validate: {
            validator: function (categories) {
                return categories.length > 0;
            },
            message: 'テンプレートには少なくとも1つのカテゴリが必要です'
        }
    },
    allowGeneralComments: {
        type: Boolean,
        default: true
    },
    isPublic: {
        type: Boolean,
        default: true,
        required: [true, '公開設定は必須です']
    }
}, {
    timestamps: true
});
// インデックス設定
TemplateSchema.index({ creatorId: 1 });
TemplateSchema.index({ name: 1 });
TemplateSchema.index({ createdAt: -1 });
TemplateSchema.index({ isPublic: 1 });
TemplateSchema.index({ isPublic: 1, creatorId: 1 }); // 複合インデックス
// 重みの合計が1になることを検証するバリデーション
TemplateSchema.pre('save', function (next) {
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
exports.Template = mongoose_1.default.model('Template', TemplateSchema);
//# sourceMappingURL=Template.js.map