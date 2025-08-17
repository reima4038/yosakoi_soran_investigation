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
}
//# sourceMappingURL=invitationService.d.ts.map