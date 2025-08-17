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
export declare class InvitationService {
    /**
     * セッション招待リンクを生成する
     */
    static generateInviteLink(sessionId: string, options?: InviteLinkOptions): string;
    /**
     * セッション作成時の自動招待リンク生成
     */
    static generateInviteLinkForNewSession(sessionId: string): string;
    /**
     * セッション設定に基づいた招待リンク生成
     */
    static generateInviteLinkWithSettings(sessionId: string, inviteSettings?: any): string;
    /**
     * 招待トークンを検証する
     */
    static validateInviteToken(token: string): InviteTokenPayload;
    /**
     * 招待トークンからセッションIDを取得する
     */
    static getSessionIdFromToken(token: string): string;
    /**
     * 招待リンクが有効かどうかを確認する
     */
    static isInviteLinkValid(token: string): boolean;
    /**
     * 詳細なトークン検証（セッション状態も含む）
     */
    static validateInviteTokenWithSession(token: string): Promise<{
        payload: InviteTokenPayload;
        session: any;
        isValid: boolean;
        errorReason?: string;
    }>;
    /**
     * 招待リンク使用ログを記録する
     */
    static logInviteLinkUsage(sessionId: string, token: string, success: boolean, userId?: string, ipAddress?: string, userAgent?: string, errorReason?: string): Promise<void>;
    /**
     * セッションの招待リンクを無効化する
     * 注意: JWTトークンは無効化できないため、セッション側で制御する必要がある
     */
    static invalidateSessionInvites(sessionId: string): Promise<void>;
    /**
     * 招待リンクのトークンを生成する（内部用）
     */
    static generateInviteToken(sessionId: string, options?: InviteLinkOptions): string;
    /**
     * 招待リンクのURLを構築する（内部用）
     */
    static buildInviteUrl(token: string): string;
}
//# sourceMappingURL=invitationService.d.ts.map