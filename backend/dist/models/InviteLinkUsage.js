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
exports.InviteLinkUsage = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const InviteLinkUsageSchema = new mongoose_1.Schema({
    sessionId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Session',
        required: [true, 'セッションIDは必須です']
    },
    token: {
        type: String,
        required: [true, 'トークンは必須です'],
        trim: true
    },
    usedBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: false
    },
    usedAt: {
        type: Date,
        required: [true, '使用日時は必須です'],
        default: Date.now
    },
    ipAddress: {
        type: String,
        required: [true, 'IPアドレスは必須です'],
        trim: true
    },
    userAgent: {
        type: String,
        required: [true, 'ユーザーエージェントは必須です'],
        trim: true
    },
    success: {
        type: Boolean,
        required: [true, '成功フラグは必須です'],
        default: false
    },
    errorReason: {
        type: String,
        trim: true,
        maxlength: [500, 'エラー理由は500文字以下である必要があります']
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});
// インデックス設定
InviteLinkUsageSchema.index({ sessionId: 1 });
InviteLinkUsageSchema.index({ token: 1 });
InviteLinkUsageSchema.index({ usedBy: 1 });
InviteLinkUsageSchema.index({ usedAt: 1 });
InviteLinkUsageSchema.index({ success: 1 });
InviteLinkUsageSchema.index({ ipAddress: 1 });
// 複合インデックス
InviteLinkUsageSchema.index({ sessionId: 1, usedAt: -1 });
InviteLinkUsageSchema.index({ sessionId: 1, success: 1 });
InviteLinkUsageSchema.index({ token: 1, usedAt: -1 });
exports.InviteLinkUsage = mongoose_1.default.model('InviteLinkUsage', InviteLinkUsageSchema);
//# sourceMappingURL=InviteLinkUsage.js.map