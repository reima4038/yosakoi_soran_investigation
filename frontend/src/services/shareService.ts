import { apiClient } from '../utils/api';

export interface ShareSettings {
  allowComments: boolean;
  allowDownload: boolean;
  showEvaluatorNames: boolean;
  showIndividualScores: boolean;
}

export interface CreateShareRequest {
  resourceType: 'session_results' | 'evaluation' | 'analysis';
  resourceId: string;
  visibility: 'public' | 'private' | 'password_protected' | 'specific_users';
  password?: string;
  allowedUsers?: string[];
  permissions?: ('view' | 'comment' | 'edit')[];
  expiresAt?: string;
  settings?: Partial<ShareSettings>;
}

export interface Share {
  _id: string;
  resourceType: string;
  resourceId: string;
  creatorId: string;
  shareToken: string;
  visibility: string;
  allowedUsers: Array<{
    _id: string;
    username: string;
    profile?: { displayName?: string };
  }>;
  permissions: string[];
  expiresAt?: string;
  isActive: boolean;
  settings: ShareSettings;
  accessLog: Array<{
    userId?: string;
    accessedAt: string;
    ipAddress: string;
    userAgent: string;
  }>;
  createdAt: string;
  updatedAt: string;
  shareUrl?: string;
}

export interface ShareAnalytics {
  summary: {
    totalAccess: number;
    uniqueUsers: number;
    anonymousAccess: number;
    firstAccess: number | null;
    lastAccess: number | null;
  };
  dailyAccess: Record<string, number>;
  recentAccess: Array<{
    userId?: string;
    accessedAt: string;
    ipAddress: string;
    userAgent: string;
  }>;
}

export interface SharedContent {
  share: {
    id: string;
    resourceType: string;
    visibility: string;
    permissions: string[];
    settings: ShareSettings;
    createdAt: string;
    expiresAt?: string;
    creator: {
      _id: string;
      username: string;
      profile?: { displayName?: string };
    };
  };
  resource: any;
}

class ShareService {
  /**
   * 共有設定を作成
   */
  async createShare(
    data: CreateShareRequest
  ): Promise<{ share: Share; shareUrl: string }> {
    const response = await api.post('/shares', data);
    return response.data.data;
  }

  /**
   * 共有設定一覧を取得
   */
  async getShares(params?: {
    resourceType?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    shares: Share[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> {
    const response = await api.get('/shares', { params });
    return response.data.data;
  }

  /**
   * 共有設定詳細を取得
   */
  async getShare(id: string): Promise<Share> {
    const response = await api.get(`/shares/${id}`);
    return response.data.data;
  }

  /**
   * 共有設定を更新
   */
  async updateShare(
    id: string,
    data: Partial<CreateShareRequest>
  ): Promise<Share> {
    const response = await api.put(`/shares/${id}`, data);
    return response.data.data;
  }

  /**
   * 共有設定を削除
   */
  async deleteShare(id: string): Promise<void> {
    await api.delete(`/shares/${id}`);
  }

  /**
   * 共有コンテンツにアクセス（認証不要）
   */
  async accessSharedContent(
    token: string,
    password?: string
  ): Promise<SharedContent> {
    const params = password ? { password } : {};
    const response = await api.get(`/shares/public/${token}`, { params });
    return response.data.data;
  }

  /**
   * 共有設定の有効/無効を切り替え
   */
  async toggleShare(id: string): Promise<{ id: string; isActive: boolean }> {
    const response = await api.patch(`/shares/${id}/toggle`);
    return response.data.data;
  }

  /**
   * 共有アクセス統計を取得
   */
  async getShareAnalytics(id: string): Promise<ShareAnalytics> {
    const response = await api.get(`/shares/${id}/analytics`);
    return response.data.data;
  }

  /**
   * 共有URLを生成
   */
  generateShareUrl(token: string): string {
    const baseUrl =
      process.env.REACT_APP_FRONTEND_URL || window.location.origin;
    return `${baseUrl}/share/${token}`;
  }

  /**
   * 共有設定のバリデーション
   */
  validateShareSettings(data: CreateShareRequest): string[] {
    const errors: string[] = [];

    if (!data.resourceType) {
      errors.push('リソースタイプは必須です');
    }

    if (!data.resourceId) {
      errors.push('リソースIDは必須です');
    }

    if (!data.visibility) {
      errors.push('公開設定は必須です');
    }

    if (data.visibility === 'password_protected' && !data.password) {
      errors.push('パスワード保護を選択した場合、パスワードは必須です');
    }

    if (
      data.visibility === 'specific_users' &&
      (!data.allowedUsers || data.allowedUsers.length === 0)
    ) {
      errors.push('特定ユーザーのみを選択した場合、ユーザーを指定してください');
    }

    if (data.expiresAt && new Date(data.expiresAt) <= new Date()) {
      errors.push('有効期限は現在時刻より後に設定してください');
    }

    return errors;
  }

  /**
   * 共有権限をチェック
   */
  hasPermission(
    share: Share,
    permission: 'view' | 'comment' | 'edit'
  ): boolean {
    return share.permissions.includes(permission);
  }

  /**
   * 共有の有効期限をチェック
   */
  isExpired(share: Share): boolean {
    if (!share.expiresAt) return false;
    return new Date(share.expiresAt) < new Date();
  }

  /**
   * 共有設定の表示用テキストを取得
   */
  getVisibilityText(visibility: string): string {
    switch (visibility) {
      case 'public':
        return '全体公開';
      case 'private':
        return '非公開';
      case 'password_protected':
        return 'パスワード保護';
      case 'specific_users':
        return '特定ユーザーのみ';
      default:
        return '不明';
    }
  }

  /**
   * 権限の表示用テキストを取得
   */
  getPermissionText(permission: string): string {
    switch (permission) {
      case 'view':
        return '閲覧';
      case 'comment':
        return 'コメント';
      case 'edit':
        return '編集';
      default:
        return '不明';
    }
  }
}

export const shareService = new ShareService();
