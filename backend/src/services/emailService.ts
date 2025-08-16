import nodemailer from 'nodemailer';

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

class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.EMAIL_PORT || '587'),
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
  }

  /**
   * メール送信の基本メソッド
   */
  async sendEmail(options: EmailOptions): Promise<void> {
    try {
      const mailOptions = {
        from: `"YOSAKOI評価システム" <${process.env.EMAIL_USER}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log('Email sent successfully:', info.messageId);
    } catch (error) {
      console.error('Email sending failed:', error);
      throw new Error('メールの送信に失敗しました');
    }
  }

  /**
   * 招待メールのHTMLテンプレートを生成
   */
  private generateInvitationHTML(data: InvitationEmailData): string {
    return `
      <!DOCTYPE html>
      <html lang="ja">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>YOSAKOI評価セッションへの招待</title>
        <style>
          body {
            font-family: 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
          }
          .container {
            background-color: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #e74c3c;
          }
          .header h1 {
            color: #e74c3c;
            margin: 0;
            font-size: 24px;
          }
          .content {
            margin-bottom: 30px;
          }
          .session-info {
            background-color: #f8f9fa;
            padding: 20px;
            border-radius: 5px;
            margin: 20px 0;
          }
          .session-info h3 {
            margin-top: 0;
            color: #2c3e50;
          }
          .invite-button {
            text-align: center;
            margin: 30px 0;
          }
          .invite-button a {
            display: inline-block;
            background-color: #e74c3c;
            color: white;
            padding: 15px 30px;
            text-decoration: none;
            border-radius: 5px;
            font-weight: bold;
            font-size: 16px;
          }
          .invite-button a:hover {
            background-color: #c0392b;
          }
          .custom-message {
            background-color: #e8f4f8;
            padding: 15px;
            border-left: 4px solid #3498db;
            margin: 20px 0;
            font-style: italic;
          }
          .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #eee;
            font-size: 14px;
            color: #666;
          }
          .warning {
            background-color: #fff3cd;
            border: 1px solid #ffeaa7;
            color: #856404;
            padding: 10px;
            border-radius: 5px;
            margin: 20px 0;
            font-size: 14px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎭 YOSAKOI評価セッションへの招待</h1>
          </div>
          
          <div class="content">
            <p>こんにちは！</p>
            <p><strong>${data.inviterName}</strong>さんから、YOSAKOI評価セッションへの招待が届きました。</p>
            
            <div class="session-info">
              <h3>📋 セッション情報</h3>
              <p><strong>セッション名:</strong> ${data.sessionName}</p>
              ${data.sessionDescription ? `<p><strong>説明:</strong> ${data.sessionDescription}</p>` : ''}
              ${data.startDate ? `<p><strong>開始日:</strong> ${data.startDate}</p>` : ''}
              ${data.endDate ? `<p><strong>終了日:</strong> ${data.endDate}</p>` : ''}
            </div>

            ${data.customMessage ? `
              <div class="custom-message">
                <h4>💬 招待者からのメッセージ</h4>
                <p>${data.customMessage.replace(/\n/g, '<br>')}</p>
              </div>
            ` : ''}

            <div class="invite-button">
              <a href="${data.inviteLink}" target="_blank">
                🎯 セッションに参加する
              </a>
            </div>

            <div class="warning">
              <strong>⚠️ 注意:</strong> この招待リンクは7日間有効です。期限内にアクセスしてセッションに参加してください。
            </div>

            <p>セッションでは、YOSAKOI演舞の動画を評価していただきます。皆様のご参加をお待ちしております！</p>
          </div>

          <div class="footer">
            <p>このメールは自動送信されています。返信はできません。</p>
            <p>ご質問がございましたら、セッション作成者（${data.inviterName}）にお問い合わせください。</p>
            <p>© 2024 YOSAKOI評価システム</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * 招待メールのテキスト版を生成
   */
  private generateInvitationText(data: InvitationEmailData): string {
    return `
YOSAKOI評価セッションへの招待

こんにちは！

${data.inviterName}さんから、YOSAKOI評価セッションへの招待が届きました。

■ セッション情報
セッション名: ${data.sessionName}
${data.sessionDescription ? `説明: ${data.sessionDescription}` : ''}
${data.startDate ? `開始日: ${data.startDate}` : ''}
${data.endDate ? `終了日: ${data.endDate}` : ''}

${data.customMessage ? `
■ 招待者からのメッセージ
${data.customMessage}
` : ''}

■ 参加方法
下記のリンクをクリックしてセッションに参加してください：
${data.inviteLink}

※ この招待リンクは7日間有効です。期限内にアクセスしてセッションに参加してください。

セッションでは、YOSAKOI演舞の動画を評価していただきます。
皆様のご参加をお待ちしております！

---
このメールは自動送信されています。返信はできません。
ご質問がございましたら、セッション作成者（${data.inviterName}）にお問い合わせください。

© 2024 YOSAKOI評価システム
    `.trim();
  }

  /**
   * 招待メールを送信
   */
  async sendInvitationEmail(to: string, data: InvitationEmailData): Promise<void> {
    const subject = `【YOSAKOI評価システム】${data.sessionName} への招待`;
    const html = this.generateInvitationHTML(data);
    const text = this.generateInvitationText(data);

    await this.sendEmail({
      to,
      subject,
      html,
      text,
    });
  }

  /**
   * 複数の招待メールを並行送信
   */
  async sendBulkInvitationEmails(emails: string[], data: InvitationEmailData): Promise<{
    successful: string[];
    failed: { email: string; error: string }[];
  }> {
    const results = await Promise.allSettled(
      emails.map(email => this.sendInvitationEmail(email, data))
    );

    const successful: string[] = [];
    const failed: { email: string; error: string }[] = [];

    results.forEach((result, index) => {
      const email = emails[index];
      if (result.status === 'fulfilled') {
        successful.push(email);
      } else {
        failed.push({
          email,
          error: result.reason?.message || '不明なエラー'
        });
      }
    });

    return { successful, failed };
  }

  /**
   * メール送信設定のテスト
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      console.log('Email service connection verified successfully');
      return true;
    } catch (error) {
      console.error('Email service connection failed:', error);
      return false;
    }
  }
}

export const emailService = new EmailService();