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
exports.Video = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const VideoSchema = new mongoose_1.Schema({
    youtubeId: {
        type: String,
        required: [true, 'YouTube動画IDは必須です'],
        unique: true,
        trim: true,
        match: [/^[a-zA-Z0-9_-]{11}$/, '有効なYouTube動画IDを入力してください']
    },
    title: {
        type: String,
        required: [true, 'タイトルは必須です'],
        trim: true,
        maxlength: [200, 'タイトルは200文字以下である必要があります']
    },
    channelName: {
        type: String,
        required: [true, 'チャンネル名は必須です'],
        trim: true,
        maxlength: [100, 'チャンネル名は100文字以下である必要があります']
    },
    uploadDate: {
        type: Date,
        required: [true, 'アップロード日は必須です']
    },
    description: {
        type: String,
        trim: true,
        maxlength: [2000, '説明は2000文字以下である必要があります'],
        default: ''
    },
    metadata: {
        teamName: {
            type: String,
            trim: true,
            maxlength: [100, 'チーム名は100文字以下である必要があります']
        },
        performanceName: {
            type: String,
            trim: true,
            maxlength: [100, '演舞名は100文字以下である必要があります']
        },
        eventName: {
            type: String,
            trim: true,
            maxlength: [100, '大会名は100文字以下である必要があります']
        },
        year: {
            type: Number,
            min: [1900, '年度は1900年以降である必要があります'],
            max: [new Date().getFullYear() + 1, '年度は来年以前である必要があります']
        },
        location: {
            type: String,
            trim: true,
            maxlength: [100, '場所は100文字以下である必要があります']
        }
    },
    tags: [{
            type: String,
            trim: true,
            maxlength: [30, 'タグは30文字以下である必要があります']
        }],
    thumbnailUrl: {
        type: String,
        required: [true, 'サムネイルURLは必須です'],
        trim: true,
        match: [/^https?:\/\/.+/, 'サムネイルURLは有効なURLである必要があります']
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    createdBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, '作成者は必須です']
    }
}, {
    timestamps: true
});
// インデックス設定
// youtubeIdは既にunique: trueで設定されているため、追加のインデックスは不要
VideoSchema.index({ createdBy: 1 });
VideoSchema.index({ 'metadata.teamName': 1 });
VideoSchema.index({ 'metadata.eventName': 1 });
VideoSchema.index({ 'metadata.year': 1 });
VideoSchema.index({ tags: 1 });
VideoSchema.index({ createdAt: -1 });
// 複合インデックス
VideoSchema.index({ 'metadata.eventName': 1, 'metadata.year': 1 });
exports.Video = mongoose_1.default.model('Video', VideoSchema);
//# sourceMappingURL=Video.js.map