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
exports.SessionParticipantRequest = exports.ParticipantRequestStatus = void 0;
const mongoose_1 = __importStar(require("mongoose"));
var ParticipantRequestStatus;
(function (ParticipantRequestStatus) {
    ParticipantRequestStatus["PENDING"] = "pending";
    ParticipantRequestStatus["APPROVED"] = "approved";
    ParticipantRequestStatus["REJECTED"] = "rejected";
})(ParticipantRequestStatus || (exports.ParticipantRequestStatus = ParticipantRequestStatus = {}));
const SessionParticipantRequestSchema = new mongoose_1.Schema({
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
    requestedAt: {
        type: Date,
        required: [true, '申請日時は必須です'],
        default: Date.now
    },
    status: {
        type: String,
        enum: Object.values(ParticipantRequestStatus),
        default: ParticipantRequestStatus.PENDING,
        required: true
    },
    reviewedBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: false
    },
    reviewedAt: {
        type: Date,
        required: false
    },
    reviewComment: {
        type: String,
        trim: true,
        maxlength: [500, 'レビューコメントは500文字以下である必要があります']
    },
    inviteToken: {
        type: String,
        required: [true, '招待トークンは必須です'],
        trim: true
    },
    requestMessage: {
        type: String,
        trim: true,
        maxlength: [1000, '申請メッセージは1000文字以下である必要があります']
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});
// インデックス設定
SessionParticipantRequestSchema.index({ sessionId: 1 });
SessionParticipantRequestSchema.index({ userId: 1 });
SessionParticipantRequestSchema.index({ status: 1 });
SessionParticipantRequestSchema.index({ requestedAt: 1 });
// 複合インデックス
SessionParticipantRequestSchema.index({ sessionId: 1, userId: 1 }, { unique: true });
SessionParticipantRequestSchema.index({ sessionId: 1, status: 1 });
SessionParticipantRequestSchema.index({ userId: 1, status: 1 });
exports.SessionParticipantRequest = mongoose_1.default.model('SessionParticipantRequest', SessionParticipantRequestSchema);
//# sourceMappingURL=SessionParticipantRequest.js.map