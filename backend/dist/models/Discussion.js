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
exports.DiscussionComment = exports.DiscussionThread = exports.DiscussionType = void 0;
const mongoose_1 = __importStar(require("mongoose"));
var DiscussionType;
(function (DiscussionType) {
    DiscussionType["SHARE_COMMENT"] = "share_comment";
    DiscussionType["EVALUATION_FEEDBACK"] = "evaluation_feedback";
    DiscussionType["SESSION_DISCUSSION"] = "session_discussion";
})(DiscussionType || (exports.DiscussionType = DiscussionType = {}));
const MentionSchema = new mongoose_1.Schema({
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
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
const DiscussionThreadSchema = new mongoose_1.Schema({
    shareId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Share'
    },
    evaluationId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Evaluation'
    },
    sessionId: {
        type: mongoose_1.Schema.Types.ObjectId,
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
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'User'
        }],
    lastActivityAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});
const DiscussionCommentSchema = new mongoose_1.Schema({
    threadId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'DiscussionThread',
        required: true
    },
    parentId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'DiscussionComment'
    },
    authorId: {
        type: mongoose_1.Schema.Types.ObjectId,
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
                type: mongoose_1.Schema.Types.ObjectId,
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
DiscussionCommentSchema.pre('save', async function (next) {
    if (this.isNew && !this.isDeleted) {
        await exports.DiscussionThread.findByIdAndUpdate(this.threadId, {
            lastActivityAt: new Date(),
            $addToSet: { participantIds: this.authorId }
        });
    }
    next();
});
// メンション抽出メソッド
DiscussionCommentSchema.methods.extractMentions = function (content) {
    const mentionRegex = /@(\w+)/g;
    const mentions = [];
    let match;
    while ((match = mentionRegex.exec(content)) !== null) {
        mentions.push({
            userId: new mongoose_1.default.Types.ObjectId(), // 実際の実装では username から userId を取得
            username: match[1],
            position: match.index
        });
    }
    return mentions;
};
// リアクション追加メソッド
DiscussionCommentSchema.methods.addReaction = function (userId, reactionType) {
    // 既存のリアクションを削除
    this.reactions = this.reactions.filter((reaction) => !reaction.userId.equals(new mongoose_1.default.Types.ObjectId(userId)));
    // 新しいリアクションを追加
    this.reactions.push({
        userId: new mongoose_1.default.Types.ObjectId(userId),
        type: reactionType,
        createdAt: new Date()
    });
    return this.save();
};
// リアクション削除メソッド
DiscussionCommentSchema.methods.removeReaction = function (userId) {
    this.reactions = this.reactions.filter((reaction) => !reaction.userId.equals(new mongoose_1.default.Types.ObjectId(userId)));
    return this.save();
};
// ソフト削除メソッド
DiscussionCommentSchema.methods.softDelete = function () {
    this.isDeleted = true;
    this.deletedAt = new Date();
    this.content = '[削除されたコメント]';
    return this.save();
};
// 返信数取得メソッド
DiscussionCommentSchema.methods.getReplyCount = async function () {
    return await exports.DiscussionComment.countDocuments({
        parentId: this._id,
        isDeleted: false
    });
};
exports.DiscussionThread = mongoose_1.default.model('DiscussionThread', DiscussionThreadSchema);
exports.DiscussionComment = mongoose_1.default.model('DiscussionComment', DiscussionCommentSchema);
//# sourceMappingURL=Discussion.js.map