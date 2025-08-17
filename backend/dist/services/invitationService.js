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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvitationService = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = require("../config");
class InvitationService {
    /**
     * セッション招待リンクを生成する
     */
    static generateInviteLink(sessionId, options = {}) {
        const token = this.generateInviteToken(sessionId, options);
        return this.buildInviteUrl(token);
    }
    /**
     * セッション作成時の自動招待リンク生成
     */
    static generateInviteLinkForNewSession(sessionId) {
        // 新規セッション用のデフォルト設定で招待リンクを生成
        return this.generateInviteLink(sessionId, {
            expiresIn: '7d' // デフォルト7日間有効
        });
    }
    /**
     * セッション設定に基づいた招待リンク生成
     */
    static generateInviteLinkWithSettings(sessionId, inviteSettings) {
        const options = {};
        if (inviteSettings?.expiresAt) {
            // 有効期限が設定されている場合、現在時刻からの差分を計算
            const now = new Date();
            const expiresAt = new Date(inviteSettings.expiresAt);
            const diffInSeconds = Math.floor((expiresAt.getTime() - now.getTime()) / 1000);
            if (diffInSeconds > 0) {
                options.expiresIn = `${diffInSeconds}s`;
            }
            else {
                throw new Error('招待リンクの有効期限が過去の日時に設定されています');
            }
        }
        if (inviteSettings?.maxUses) {
            options.maxUses = inviteSettings.maxUses;
        }
        return this.generateInviteLink(sessionId, options);
    }
    /**
     * 招待トークンを検証する
     */
    static validateInviteToken(token) {
        try {
            const decoded = jsonwebtoken_1.default.verify(token, config_1.config.jwtSecret, {
                issuer: 'yosakoi-evaluation-system',
                audience: 'session-invites'
            });
            // トークンタイプの検証
            if (decoded.type !== 'session-invite') {
                throw new Error('無効な招待トークンタイプです');
            }
            return decoded;
        }
        catch (error) {
            if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
                throw new Error('招待リンクの有効期限が切れています');
            }
            else if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
                throw new Error('無効な招待リンクです');
            }
            else if (error instanceof Error && error.message === '無効な招待トークンタイプです') {
                throw error;
            }
            else {
                throw new Error('招待リンクの検証に失敗しました');
            }
        }
    }
    /**
     * 招待トークンからセッションIDを取得する
     */
    static getSessionIdFromToken(token) {
        const payload = this.validateInviteToken(token);
        return payload.sessionId;
    }
    /**
     * 招待リンクが有効かどうかを確認する
     */
    static isInviteLinkValid(token) {
        try {
            this.validateInviteToken(token);
            return true;
        }
        catch {
            return false;
        }
    }
    /**
     * セッションの招待リンクを無効化する
     * 注意: JWTトークンは無効化できないため、セッション側で制御する必要がある
     */
    static async invalidateSessionInvites(sessionId) {
        // JWTトークン自体は無効化できないため、
        // セッションの招待設定を無効にすることで制御
        const { Session } = await Promise.resolve().then(() => __importStar(require('../models/Session')));
        await Session.findByIdAndUpdate(sessionId, {
            'inviteSettings.isEnabled': false
        });
    }
    /**
     * 招待リンクのトークンを生成する（内部用）
     */
    static generateInviteToken(sessionId, options = {}) {
        const { expiresIn = '7d' } = options;
        const payload = {
            sessionId,
            type: 'session-invite',
            generatedAt: Date.now()
        };
        const jwtOptions = {
            expiresIn: expiresIn,
            issuer: 'yosakoi-evaluation-system',
            audience: 'session-invites'
        };
        return jsonwebtoken_1.default.sign(payload, config_1.config.jwtSecret, jwtOptions);
    }
    /**
     * 招待リンクのURLを構築する（内部用）
     */
    static buildInviteUrl(token) {
        const baseUrl = config_1.config.frontendUrl;
        return `${baseUrl}/sessions/join/${token}`;
    }
}
exports.InvitationService = InvitationService;
//# sourceMappingURL=invitationService.js.map