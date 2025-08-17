"use strict";
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
        const { expiresIn = '7d' } = options;
        const payload = {
            sessionId,
            type: 'session-invite'
        };
        const jwtOptions = {
            expiresIn: expiresIn,
            issuer: 'yosakoi-evaluation-system',
            audience: 'session-invites'
        };
        const token = jsonwebtoken_1.default.sign(payload, config_1.config.jwtSecret, jwtOptions);
        // フロントエンドのベースURLと組み合わせて完全な招待リンクを生成
        const baseUrl = config_1.config.frontendUrl;
        return `${baseUrl}/sessions/join/${token}`;
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
}
exports.InvitationService = InvitationService;
//# sourceMappingURL=invitationService.js.map