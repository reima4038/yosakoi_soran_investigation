export interface EmailOptions {
    to: string;
    subject: string;
    html: string;
    text?: string;
}
export interface InvitationEmailData {
    sessionName: string;
    sessionDescription?: string;
    inviteLink: string;
    inviterName: string;
    customMessage?: string;
    startDate: string;
    endDate: string;
}
declare class EmailService {
    private transporter;
    constructor();
    /**
     * メール送信の基本メソッド
     */
    sendEmail(options: EmailOptions): Promise<void>;
    /**
     * 招待メールのHTMLテンプレートを生成
     */
    private generateInvitationHTML;
    /**
     * 招待メールのテキスト版を生成
     */
    private generateInvitationText;
    /**
     * 招待メールを送信
     */
    sendInvitationEmail(to: string, data: InvitationEmailData): Promise<void>;
    /**
     * 複数の招待メールを並行送信
     */
    sendBulkInvitationEmails(emails: string[], data: InvitationEmailData): Promise<{
        successful: string[];
        failed: {
            email: string;
            error: string;
        }[];
    }>;
    /**
     * メール送信設定のテスト
     */
    testConnection(): Promise<boolean>;
}
export declare const emailService: EmailService;
export {};
//# sourceMappingURL=emailService.d.ts.map