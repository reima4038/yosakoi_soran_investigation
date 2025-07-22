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
exports.Evaluation = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const ScoreSchema = new mongoose_1.Schema({
    criterionId: {
        type: String,
        required: [true, '評価基準IDは必須です']
    },
    value: {
        type: Number,
        required: [true, '評価値は必須です'],
        min: [0, '評価値は0以上である必要があります']
    },
    comment: {
        type: String,
        trim: true,
        maxlength: [500, 'コメントは500文字以下である必要があります']
    }
}, { _id: false });
const CategoryScoreSchema = new mongoose_1.Schema({
    categoryId: {
        type: String,
        required: [true, 'カテゴリIDは必須です']
    },
    scores: {
        type: [ScoreSchema],
        required: true,
        validate: {
            validator: function (scores) {
                return scores.length > 0;
            },
            message: 'カテゴリには少なくとも1つのスコアが必要です'
        }
    },
    totalScore: {
        type: Number,
        required: [true, 'カテゴリ合計スコアは必須です'],
        min: [0, 'カテゴリ合計スコアは0以上である必要があります']
    },
    weightedScore: {
        type: Number,
        required: [true, 'カテゴリ重み付きスコアは必須です'],
        min: [0, 'カテゴリ重み付きスコアは0以上である必要があります']
    }
}, { _id: false });
const EvaluationSchema = new mongoose_1.Schema({
    sessionId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Session',
        required: [true, 'セッションIDは必須です']
    },
    evaluatorId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, '評価者IDは必須です']
    },
    videoId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Video',
        required: [true, '動画IDは必須です']
    },
    templateId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Template',
        required: [true, 'テンプレートIDは必須です']
    },
    categoryScores: {
        type: [CategoryScoreSchema],
        required: true,
        validate: {
            validator: function (categoryScores) {
                return categoryScores.length > 0;
            },
            message: '評価には少なくとも1つのカテゴリスコアが必要です'
        }
    },
    totalScore: {
        type: Number,
        required: [true, '合計スコアは必須です'],
        min: [0, '合計スコアは0以上である必要があります']
    },
    finalScore: {
        type: Number,
        required: [true, '最終スコアは必須です'],
        min: [0, '最終スコアは0以上である必要があります'],
        max: [100, '最終スコアは100以下である必要があります']
    },
    generalComment: {
        type: String,
        trim: true,
        maxlength: [2000, '総合コメントは2000文字以下である必要があります']
    },
    isAnonymous: {
        type: Boolean,
        default: false
    },
    submittedAt: {
        type: Date,
        required: [true, '提出日時は必須です'],
        default: Date.now
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});
// インデックス設定
EvaluationSchema.index({ sessionId: 1 });
EvaluationSchema.index({ evaluatorId: 1 });
EvaluationSchema.index({ videoId: 1 });
EvaluationSchema.index({ templateId: 1 });
EvaluationSchema.index({ submittedAt: -1 });
EvaluationSchema.index({ finalScore: -1 });
// 複合インデックス
EvaluationSchema.index({ sessionId: 1, evaluatorId: 1 }, { unique: true });
EvaluationSchema.index({ videoId: 1, evaluatorId: 1 });
EvaluationSchema.index({ sessionId: 1, finalScore: -1 });
// スコア計算の事前処理
EvaluationSchema.pre('save', function (next) {
    try {
        // カテゴリスコアの合計を計算
        this.totalScore = this.categoryScores.reduce((sum, category) => sum + category.totalScore, 0);
        // 重み付きスコアの合計を最終スコアとして計算
        this.finalScore = this.categoryScores.reduce((sum, category) => sum + category.weightedScore, 0);
        // 最終スコアを0-100の範囲に正規化（必要に応じて）
        if (this.finalScore > 100) {
            this.finalScore = 100;
        }
        next();
    }
    catch (error) {
        next(error);
    }
});
// 匿名評価の場合の処理
EvaluationSchema.methods.toJSON = function () {
    const obj = this.toObject();
    if (this.isAnonymous) {
        delete obj.evaluatorId;
    }
    return obj;
};
exports.Evaluation = mongoose_1.default.model('Evaluation', EvaluationSchema);
//# sourceMappingURL=Evaluation.js.map