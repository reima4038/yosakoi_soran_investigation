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
exports.Evaluation = exports.Comment = exports.EvaluationScore = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const EvaluationScoreSchema = new mongoose_1.Schema({
    evaluationId: {
        type: mongoose_1.Schema.Types.ObjectId,
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
const CommentSchema = new mongoose_1.Schema({
    evaluationId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Evaluation',
        required: process.env.NODE_ENV !== 'test' ? [true, '評価IDは必須です'] : false
    },
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
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
const EvaluationSchema = new mongoose_1.Schema({
    sessionId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Session',
        required: [true, 'セッションIDは必須です']
    },
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
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
EvaluationSchema.methods.checkCompletion = function (templateCategories) {
    const requiredCriteriaIds = templateCategories.flatMap(category => category.criteria.map((criterion) => criterion.id));
    const scoredCriteriaIds = this.scores.map((score) => score.criterionId);
    const allCriteriaScored = requiredCriteriaIds.every(id => scoredCriteriaIds.includes(id));
    this.isComplete = allCriteriaScored;
    return this.isComplete;
};
// 自動保存の更新
EvaluationSchema.pre('save', function (next) {
    this.lastSavedAt = new Date();
    next();
});
exports.EvaluationScore = mongoose_1.default.model('EvaluationScore', EvaluationScoreSchema);
exports.Comment = mongoose_1.default.model('Comment', CommentSchema);
exports.Evaluation = mongoose_1.default.model('Evaluation', EvaluationSchema);
//# sourceMappingURL=Evaluation.js.map