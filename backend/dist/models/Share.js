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
exports.Share = exports.ShareVisibility = exports.SharePermission = exports.ShareType = void 0;
const mongoose_1 = __importStar(require("mongoose"));
var ShareType;
(function (ShareType) {
    ShareType["SESSION_RESULTS"] = "session_results";
    ShareType["EVALUATION"] = "evaluation";
    ShareType["ANALYSIS"] = "analysis";
})(ShareType || (exports.ShareType = ShareType = {}));
var SharePermission;
(function (SharePermission) {
    SharePermission["VIEW"] = "view";
    SharePermission["COMMENT"] = "comment";
    SharePermission["EDIT"] = "edit";
})(SharePermission || (exports.SharePermission = SharePermission = {}));
var ShareVisibility;
(function (ShareVisibility) {
    ShareVisibility["PUBLIC"] = "public";
    ShareVisibility["PRIVATE"] = "private";
    ShareVisibility["PASSWORD_PROTECTED"] = "password_protected";
    ShareVisibility["SPECIFIC_USERS"] = "specific_users";
})(ShareVisibility || (exports.ShareVisibility = ShareVisibility = {}));
const ShareSchema = new mongoose_1.Schema({
    resourceType: {
        type: String,
        enum: Object.values(ShareType),
        required: [true, 'リソースタイプは必須です']
    },
    resourceId: {
        type: mongoose_1.Schema.Types.ObjectId,
        required: [true, 'リソースIDは必須です'],
        refPath: 'resourceType'
    },
    creatorId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, '作成者IDは必須です']
    },
    shareToken: {
        type: String,
        required: true,
        unique: true
    },
    visibility: {
        type: String,
        enum: Object.values(ShareVisibility),
        default: ShareVisibility.PRIVATE,
        required: true
    },
    password: {
        type: String,
        select: false // デフォルトでは取得しない
    },
    allowedUsers: [{
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'User'
        }],
    permissions: [{
            type: String,
            enum: Object.values(SharePermission),
            default: [SharePermission.VIEW]
        }],
    expiresAt: {
        type: Date,
        validate: {
            validator: function (value) {
                if (!value)
                    return true;
                return value > new Date();
            },
            message: '有効期限は現在時刻より後である必要があります'
        }
    },
    isActive: {
        type: Boolean,
        default: true
    },
    settings: {
        allowComments: {
            type: Boolean,
            default: true
        },
        allowDownload: {
            type: Boolean,
            default: false
        },
        showEvaluatorNames: {
            type: Boolean,
            default: false
        },
        showIndividualScores: {
            type: Boolean,
            default: true
        }
    },
    accessLog: [{
            userId: {
                type: mongoose_1.Schema.Types.ObjectId,
                ref: 'User'
            },
            accessedAt: {
                type: Date,
                default: Date.now
            },
            ipAddress: {
                type: String,
                required: true
            },
            userAgent: {
                type: String,
                required: true
            }
        }]
}, {
    timestamps: true
});
// インデックス設定
// shareTokenは既にunique: trueで設定されているため、追加のインデックスは不要
ShareSchema.index({ resourceType: 1, resourceId: 1 });
ShareSchema.index({ creatorId: 1 });
ShareSchema.index({ visibility: 1 });
ShareSchema.index({ isActive: 1 });
ShareSchema.index({ expiresAt: 1 });
// 複合インデックス
ShareSchema.index({ resourceType: 1, resourceId: 1, creatorId: 1 });
ShareSchema.index({ isActive: 1, expiresAt: 1 });
// 有効期限チェック
ShareSchema.methods.isExpired = function () {
    if (!this.expiresAt)
        return false;
    return this.expiresAt < new Date();
};
// アクセス権限チェック
ShareSchema.methods.hasAccess = function (userId) {
    if (!this.isActive || this.isExpired())
        return false;
    switch (this.visibility) {
        case ShareVisibility.PUBLIC:
            return true;
        case ShareVisibility.PRIVATE:
            return Boolean(userId && this.creatorId.toString() === userId);
        case ShareVisibility.SPECIFIC_USERS:
            return Boolean(userId && (this.creatorId.toString() === userId ||
                this.allowedUsers.some((allowedUserId) => allowedUserId.toString() === userId)));
        case ShareVisibility.PASSWORD_PROTECTED:
            return true; // パスワード確認は別途実装
        default:
            return false;
    }
};
// アクセスログ追加
ShareSchema.methods.logAccess = function (userId, ipAddress, userAgent) {
    this.accessLog.push({
        userId: userId ? new mongoose_1.default.Types.ObjectId(userId) : undefined,
        accessedAt: new Date(),
        ipAddress,
        userAgent
    });
    // ログは最新100件まで保持
    if (this.accessLog.length > 100) {
        this.accessLog = this.accessLog.slice(-100);
    }
    return this.save();
};
// 共有トークン生成
ShareSchema.statics.generateShareToken = function () {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 32; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};
// 期限切れの共有を無効化するスケジュール処理用
ShareSchema.statics.deactivateExpired = async function () {
    const now = new Date();
    const result = await this.updateMany({
        isActive: true,
        expiresAt: { $lt: now }
    }, {
        isActive: false
    });
    return result;
};
exports.Share = mongoose_1.default.model('Share', ShareSchema);
//# sourceMappingURL=Share.js.map