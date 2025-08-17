import jwt from 'jsonwebtoken';
import { config } from '../config';

export interface InviteTokenPayload {
  sessionId: string;
  type: 'session-invite';
  iat: number;
  exp: number;
}

export interface InviteLinkOptions {
  expiresIn?: string;
  maxUses?: number;
}

export class InvitationService {
  /**
   * セッション招待リンクを生成する
   */
  static generateInviteLink(sessionId: string, options: InviteLinkOptions = {}): string {
    const { expiresIn = '7d' } = options;
    
    const payload = {
      sessionId,
      type: 'session-invite' as const
    };

    const jwtOptions: jwt.SignOptions = {
      expiresIn: expiresIn as unknown,
      issuer: 'yosakoi-evaluation-system',
      audience: 'session-invites'
    };

    const token = jwt.sign(payload, config.jwtSecret as string, jwtOptions);
    
    // フロントエンドのベースURLと組み合わせて完全な招待リンクを生成
    const baseUrl = config.frontendUrl;
    return `${baseUrl}/sessions/join/${token}`;
  }

  /**
   * 招待トークンを検証する
   */
  static validateInviteToken(token: string): InviteTokenPayload {
    try {
      const decoded = jwt.verify(token, config.jwtSecret as string, {
        issuer: 'yosakoi-evaluation-system',
        audience: 'session-invites'
      }) as InviteTokenPayload;

      // トークンタイプの検証
      if (decoded.type !== 'session-invite') {
        throw new Error('無効な招待トークンタイプです');
      }

      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('招待リンクの有効期限が切れています');
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('無効な招待リンクです');
      } else if (error instanceof Error && error.message === '無効な招待トークンタイプです') {
        throw error;
      } else {
        throw new Error('招待リンクの検証に失敗しました');
      }
    }
  }

  /**
   * 招待トークンからセッションIDを取得する
   */
  static getSessionIdFromToken(token: string): string {
    const payload = this.validateInviteToken(token);
    return payload.sessionId;
  }

  /**
   * 招待リンクが有効かどうかを確認する
   */
  static isInviteLinkValid(token: string): boolean {
    try {
      this.validateInviteToken(token);
      return true;
    } catch {
      return false;
    }
  }
}