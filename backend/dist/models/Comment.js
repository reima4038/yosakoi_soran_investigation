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
exports.Comment = exports.CommentType = void 0;
const mongoose_1 = __importStar(require("mongoose"));
var CommentType;
(function (CommentType) {
    CommentType["GENERAL"] = "general";
    CommentType["CRITERION"] = "criterion";
    CommentType["CATEGORY"] = "category";
    CommentType["REPLY"] = "reply";
})(CommentType || (exports.CommentType = CommentType = {}));
const CommentSchema = new mongoose_1.Schema({
    evaluationId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Evaluation',
        required: [true, '評価IDは必須です']
    },
    authorId: {
        type: mongoose_1.Schema.Types.ObjectId,
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
            validator: function (value) {
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
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'User'
        }],
    replies: [{
            type: mongoose_1.Schema.Types.ObjectId,
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
CommentSchema.post('save', async function (doc) {
    if (doc.type === CommentType.REPLY && doc.targetId) {
        try {
            await exports.Comment.findByIdAndUpdate(doc.targetId, { $addToSet: { replies: doc._id } });
        }
        catch (error) {
            console.error('親コメントの更新に失敗しました:', error);
        }
    }
});
// コメント削除時の処理
CommentSchema.pre('deleteOne', { document: true, query: false }, async function (next) {
    try {
        const doc = this;
        // 返信コメントをすべて削除
        if (doc.replies && doc.replies.length > 0) {
            await exports.Comment.deleteMany({ _id: { $in: doc.replies } });
        }
        // 親コメントから自分への参照を削除
        if (doc.type === CommentType.REPLY && doc.targetId) {
            await exports.Comment.findByIdAndUpdate(doc.targetId, { $pull: { replies: doc._id } });
        }
        next();
    }
    catch (error) {
        next(error);
    }
});
// 匿名コメントの場合の処理
CommentSchema.methods.toJSON = function () {
    const obj = this.toObject();
    if (this.isAnonymous) {
        delete obj.authorId;
    }
    return obj;
};
// いいね機能のメソッド
CommentSchema.methods.toggleLike = function (userId) {
    const likeIndex = this.likes.indexOf(userId);
    if (likeIndex > -1) {
        this.likes.splice(likeIndex, 1);
        return false; // いいねを取り消し
    }
    else {
        this.likes.push(userId);
        return true; // いいねを追加
    }
};
// いいね数を取得するバーチャルフィールド
CommentSchema.virtual('likeCount').get(function () {
    const doc = this;
    return doc.likes ? doc.likes.length : 0;
});
// 返信数を取得するバーチャルフィールド
CommentSchema.virtual('replyCount').get(function () {
    const doc = this;
    return doc.replies ? doc.replies.length : 0;
});
// バーチャルフィールドをJSONに含める
CommentSchema.set('toJSON', { virtuals: true });
exports.Comment = mongoose_1.default.model('Comment', CommentSchema);
//# sourceMappingURL=Comment.js.map