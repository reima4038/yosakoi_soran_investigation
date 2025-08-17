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
    const token = this.generateInviteToken(sessionId, options);
    return this.buildInviteUrl(token);
  }

  /**
   * セッション作成時の自動招待リンク生成
   */
  static generateInviteLinkForNewSession(sessionId: string): string {
    // 新規セッション用のデフォルト設定で招待リンクを生成
    return this.generateInviteLink(sessionId, {
      expiresIn: '7d' // デフォルト7日間有効
    });
  }

  /**
   * セッション設定に基づいた招待リンク生成
   */
  static generateInviteLinkWithSettings(sessionId: string, inviteSettings?: any): string {
    const options: InviteLinkOptions = {};
    
    if (inviteSettings?.expiresAt) {
      // 有効期限が設定されている場合、現在時刻からの差分を計算
      const now = new Date();
      const expiresAt = new Date(inviteSettings.expiresAt);
      const diffInSeconds = Math.floor((expiresAt.getTime() - now.getTime()) / 1000);
      
      if (diffInSeconds > 0) {
        options.expiresIn = `${diffInSeconds}s`;
      } else {
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

  /**
   * 詳細なトークン検証（セッション状態も含む）
   */
  static async validateInviteTokenWithSession(token: string): Promise<{
    payload: InviteTokenPayload;
    session: any;
    isValid: boolean;
    errorReason?: string;
  }> {
    try {
      // JWTトークンの基本検証
      const payload = this.validateInviteToken(token);
      
      // セッションの存在確認
      const { Session } = await import('../models/Session');
      const session = await Session.findById(payload.sessionId);
      
      if (!session) {
        return {
          payload,
          session: null,
          isValid: false,
          errorReason: 'セッションが見つかりません'
        };
      }

      // セッションステータスの確認
      if (session.status !== 'active') {
        return {
          payload,
          session,
          isValid: false,
          errorReason: `セッションは現在${session.status}状態のため参加できません`
        };
      }

      // 招待設定の確認
      if (session.inviteSettings && !session.inviteSettings.isEnabled) {
        return {
          payload,
          session,
          isValid: false,
          errorReason: 'このセッションの招待リンクは無効化されています'
        };
      }

      // 使用回数制限の確認
      if (session.inviteSettings?.maxUses && 
          session.inviteSettings.currentUses >= session.inviteSettings.maxUses) {
        return {
          payload,
          session,
          isValid: false,
          errorReason: '招待リンクの使用回数上限に達しています'
        };
      }

      // 有効期限の確認（セッション設定）
      if (session.inviteSettings?.expiresAt && 
          new Date() > new Date(session.inviteSettings.expiresAt)) {
        return {
          payload,
          session,
          isValid: false,
          errorReason: '招待リンクの有効期限が切れています'
        };
      }

      return {
        payload,
        session,
        isValid: true
      };

    } catch (error) {
      return {
        payload: {} as InviteTokenPayload,
        session: null,
        isValid: false,
        errorReason: error instanceof Error ? error.message : '招待トークンの検証に失敗しました'
      };
    }
  }

  /**
   * 招待リンク使用ログを記録する
   */
  static async logInviteLinkUsage(
    sessionId: string,
    token: string,
    success: boolean,
    userId?: string,
    ipAddress?: string,
    userAgent?: string,
    errorReason?: string
  ): Promise<void> {
    try {
      const { InviteLinkUsage } = await import('../models/InviteLinkUsage');
      
      const usage = new InviteLinkUsage({
        sessionId: new (await import('mongoose')).Types.ObjectId(sessionId),
        token: token.substring(0, 20) + '...', // セキュリティのため一部のみ記録
        usedBy: userId ? new (await import('mongoose')).Types.ObjectId(userId) : undefined,
        usedAt: new Date(),
        ipAddress: ipAddress || 'unknown',
        userAgent: userAgent || 'unknown',
        success,
        errorReason
      });

      await usage.save();
    } catch (error) {
      console.error('招待リンク使用ログの記録に失敗しました:', error);
      // ログ記録の失敗は処理を停止させない
    }
  }

  /**
   * セッションの招待リンクを無効化する
   * 注意: JWTトークンは無効化できないため、セッション側で制御する必要がある
   */
  static async invalidateSessionInvites(sessionId: string): Promise<void> {
    // JWTトークン自体は無効化できないため、
    // セッションの招待設定を無効にすることで制御
    const { Session } = await import('../models/Session');
    
    await Session.findByIdAndUpdate(sessionId, {
      'inviteSettings.isEnabled': false
    });
  }

  /**
   * 招待リンクのトークンを生成する（内部用）
   */
  static generateInviteToken(sessionId: string, options: InviteLinkOptions = {}): string {
    const { expiresIn = '7d' } = options;
    
    const payload = {
      sessionId,
      type: 'session-invite' as const,
      generatedAt: Date.now()
    };

    const jwtOptions: jwt.SignOptions = {
      expiresIn: expiresIn as unknown,
      issuer: 'yosakoi-evaluation-system',
      audience: 'session-invites'
    };

    return jwt.sign(payload, config.jwtSecret as string, jwtOptions);
  }

  /**
   * 招待リンクのURLを構築する（内部用）
   */
  static buildInviteUrl(token: string): string {
    const baseUrl = config.frontendUrl;
    return `${baseUrl}/sessions/join/${token}`;
  }
}