import { apiClient } from '../utils/api';

export interface Notification {
  _id: string;
  recipientId: string;
  senderId?: {
    _id: string;
    username: string;
    profile?: {
      displayName?: string;
      avatar?: string;
    };
  };
  type:
    | 'mention'
    | 'reply'
    | 'reaction'
    | 'share_comment'
    | 'evaluation_feedback'
    | 'session_update'
    | 'deadline_reminder';
  title: string;
  message: string;
  status: 'unread' | 'read' | 'archived';
  relatedResourceType?: string;
  relatedResourceId?: string;
  actionUrl?: string;
  metadata: Record<string, any>;
  readAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationSettings {
  mentions: boolean;
  replies: boolean;
  reactions: boolean;
  shareComments: boolean;
  evaluationFeedback: boolean;
  sessionUpdates: boolean;
  deadlineReminders: boolean;
  emailNotifications: boolean;
  pushNotifications: boolean;
}

export interface NotificationStats {
  totalCount: number;
  unreadCount: number;
  readCount: number;
  typeStats: Array<{
    _id: string;
    count: number;
  }>;
  recentActivity: Notification[];
}

class NotificationService {
  /**
   * 通知一覧を取得
   */
  async getNotifications(params?: {
    status?: string;
    type?: string;
    page?: number;
    limit?: number;
    unreadOnly?: boolean;
  }): Promise<{
    notifications: Notification[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
    unreadCount: number;
  }> {
    const response = await api.get('/notifications', { params });
    return response.data.data;
  }

  /**
   * 通知詳細を取得
   */
  async getNotification(id: string): Promise<Notification> {
    const response = await api.get(`/notifications/${id}`);
    return response.data.data;
  }

  /**
   * 通知を既読にする
   */
  async markAsRead(id: string): Promise<Notification> {
    const response = await api.patch(`/notifications/${id}/read`);
    return response.data.data;
  }

  /**
   * 全ての通知を既読にする
   */
  async markAllAsRead(): Promise<{ modifiedCount: number; message: string }> {
    const response = await api.patch('/notifications/read-all');
    return response.data.data;
  }

  /**
   * 通知をアーカイブする
   */
  async archiveNotification(id: string): Promise<Notification> {
    const response = await api.patch(`/notifications/${id}/archive`);
    return response.data.data;
  }

  /**
   * 通知を削除する
   */
  async deleteNotification(id: string): Promise<void> {
    await api.delete(`/notifications/${id}`);
  }

  /**
   * 未読通知数を取得
   */
  async getUnreadCount(): Promise<number> {
    const response = await api.get('/notifications/unread/count');
    return response.data.data.unreadCount;
  }

  /**
   * 通知設定を取得
   */
  async getSettings(): Promise<NotificationSettings> {
    const response = await api.get('/notifications/settings');
    return response.data.data;
  }

  /**
   * 通知設定を更新
   */
  async updateSettings(
    settings: Partial<NotificationSettings>
  ): Promise<NotificationSettings> {
    const response = await api.put('/notifications/settings', settings);
    return response.data.data;
  }

  /**
   * 通知統計を取得
   */
  async getStats(): Promise<NotificationStats> {
    const response = await api.get('/notifications/stats');
    return response.data.data;
  }

  /**
   * 通知タイプの表示テキストを取得
   */
  getTypeText(type: string): string {
    const typeMap: Record<string, string> = {
      mention: 'メンション',
      reply: '返信',
      reaction: 'リアクション',
      share_comment: '共有コメント',
      evaluation_feedback: '評価フィードバック',
      session_update: 'セッション更新',
      deadline_reminder: '期限リマインダー',
    };
    return typeMap[type] || type;
  }

  /**
   * 通知タイプのアイコンを取得
   */
  getTypeIcon(type: string): string {
    const iconMap: Record<string, string> = {
      mention: '@',
      reply: '💬',
      reaction: '👍',
      share_comment: '💭',
      evaluation_feedback: '📝',
      session_update: '🔄',
      deadline_reminder: '⏰',
    };
    return iconMap[type] || '📢';
  }

  /**
   * 通知の重要度を取得
   */
  getPriority(type: string): 'high' | 'medium' | 'low' {
    const priorityMap: Record<string, 'high' | 'medium' | 'low'> = {
      mention: 'high',
      reply: 'medium',
      reaction: 'low',
      share_comment: 'medium',
      evaluation_feedback: 'high',
      session_update: 'medium',
      deadline_reminder: 'high',
    };
    return priorityMap[type] || 'medium';
  }

  /**
   * 相対時間を取得
   */
  getRelativeTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return 'たった今';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes}分前`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours}時間前`;
    } else if (diffInSeconds < 2592000) {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days}日前`;
    } else {
      return date.toLocaleDateString('ja-JP');
    }
  }

  /**
   * 通知をグループ化
   */
  groupNotifications(
    notifications: Notification[]
  ): Record<string, Notification[]> {
    const groups: Record<string, Notification[]> = {
      today: [],
      yesterday: [],
      thisWeek: [],
      older: [],
    };

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const thisWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    notifications.forEach(notification => {
      const notificationDate = new Date(notification.createdAt);

      if (notificationDate >= today) {
        groups.today.push(notification);
      } else if (notificationDate >= yesterday) {
        groups.yesterday.push(notification);
      } else if (notificationDate >= thisWeek) {
        groups.thisWeek.push(notification);
      } else {
        groups.older.push(notification);
      }
    });

    return groups;
  }

  /**
   * 通知の色を取得
   */
  getNotificationColor(type: string, status: string): string {
    if (status === 'unread') {
      const colorMap: Record<string, string> = {
        mention: '#ff4444',
        reply: '#4444ff',
        reaction: '#44ff44',
        share_comment: '#ffaa44',
        evaluation_feedback: '#aa44ff',
        session_update: '#44aaff',
        deadline_reminder: '#ff4444',
      };
      return colorMap[type] || '#666666';
    }
    return '#cccccc';
  }

  /**
   * 通知をフィルタリング
   */
  filterNotifications(
    notifications: Notification[],
    filters: {
      status?: string;
      type?: string;
      dateRange?: { start: Date; end: Date };
    }
  ): Notification[] {
    return notifications.filter(notification => {
      if (filters.status && notification.status !== filters.status) {
        return false;
      }

      if (filters.type && notification.type !== filters.type) {
        return false;
      }

      if (filters.dateRange) {
        const notificationDate = new Date(notification.createdAt);
        if (
          notificationDate < filters.dateRange.start ||
          notificationDate > filters.dateRange.end
        ) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * 通知の検索
   */
  searchNotifications(
    notifications: Notification[],
    query: string
  ): Notification[] {
    const lowercaseQuery = query.toLowerCase();

    return notifications.filter(
      notification =>
        notification.title.toLowerCase().includes(lowercaseQuery) ||
        notification.message.toLowerCase().includes(lowercaseQuery) ||
        notification.senderId?.username
          .toLowerCase()
          .includes(lowercaseQuery) ||
        notification.senderId?.profile?.displayName
          ?.toLowerCase()
          .includes(lowercaseQuery)
    );
  }

  /**
   * 通知の一括操作
   */
  async bulkOperation(
    notificationIds: string[],
    operation: 'read' | 'archive' | 'delete'
  ): Promise<void> {
    const promises = notificationIds.map(id => {
      switch (operation) {
        case 'read':
          return this.markAsRead(id);
        case 'archive':
          return this.archiveNotification(id);
        case 'delete':
          return this.deleteNotification(id);
        default:
          throw new Error(`Unknown operation: ${operation}`);
      }
    });

    await Promise.all(promises);
  }

  /**
   * ブラウザ通知の許可を要求
   */
  async requestNotificationPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      throw new Error('このブラウザは通知をサポートしていません');
    }

    if (Notification.permission === 'granted') {
      return 'granted';
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission;
    }

    return 'denied';
  }

  /**
   * ブラウザ通知を表示
   */
  showBrowserNotification(notification: Notification): void {
    if (Notification.permission === 'granted') {
      const browserNotification = new Notification(notification.title, {
        body: notification.message,
        icon: '/favicon.ico',
        tag: notification.id,
      });

      browserNotification.onclick = () => {
        if (notification.actionUrl) {
          window.open(notification.actionUrl, '_blank');
        }
        browserNotification.close();
      };

      // 5秒後に自動で閉じる
      setTimeout(() => {
        browserNotification.close();
      }, 5000);
    }
  }
}

export const notificationService = new NotificationService();
