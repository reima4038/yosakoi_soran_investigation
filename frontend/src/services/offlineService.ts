import { openDB, DBSchema, IDBPDatabase } from 'idb';

// IndexedDB schema definition
interface OfflineDB extends DBSchema {
  evaluations: {
    key: string;
    value: {
      id: string;
      sessionId: string;
      data: any;
      lastModified: number;
      synced: boolean;
    };
    indexes: {
      'by-sessionId': string;
      'by-synced': boolean;
    };
  };
  comments: {
    key: string;
    value: {
      id: string;
      sessionId: string;
      data: any;
      lastModified: number;
      synced: boolean;
    };
    indexes: {
      'by-sessionId': string;
      'by-synced': boolean;
    };
  };
  sessions: {
    key: string;
    value: {
      id: string;
      data: any;
      lastModified: number;
      cached: boolean;
    };
    indexes: {
      'by-cached': boolean;
    };
  };
  videos: {
    key: string;
    value: {
      id: string;
      data: any;
      lastModified: number;
      cached: boolean;
    };
    indexes: {
      'by-cached': boolean;
    };
  };
  templates: {
    key: string;
    value: {
      id: string;
      data: any;
      lastModified: number;
      cached: boolean;
    };
    indexes: {
      'by-cached': boolean;
    };
  };
  syncQueue: {
    key: string;
    value: {
      id: string;
      type: 'evaluation' | 'comment' | 'delete';
      action: 'create' | 'update' | 'delete';
      data: any;
      timestamp: number;
      retryCount: number;
    };
    indexes: {
      'by-timestamp': number;
      'by-type': string;
    };
  };
}

class OfflineService {
  private db: IDBPDatabase<OfflineDB> | null = null;
  private isOnline: boolean = navigator.onLine;
  private syncInProgress: boolean = false;
  private listeners: Set<(isOnline: boolean) => void> = new Set();

  constructor() {
    this.initDB();
    this.setupNetworkListeners();
    this.startPeriodicSync();
    this.monitorNetworkQuality();
    this.getNotificationSettings();
    this.registerBackgroundSync();
  }

  // データベースの初期化
  private async initDB(): Promise<void> {
    try {
      this.db = await openDB<OfflineDB>('YosakoiEvaluationDB', 1, {
        upgrade(db) {
          // 評価データストア
          if (!db.objectStoreNames.contains('evaluations')) {
            const evaluationStore = db.createObjectStore('evaluations', { keyPath: 'id' });
            evaluationStore.createIndex('by-sessionId', 'sessionId');
            evaluationStore.createIndex('by-synced', 'synced');
          }

          // コメントストア
          if (!db.objectStoreNames.contains('comments')) {
            const commentStore = db.createObjectStore('comments', { keyPath: 'id' });
            commentStore.createIndex('by-sessionId', 'sessionId');
            commentStore.createIndex('by-synced', 'synced');
          }

          // セッションストア
          if (!db.objectStoreNames.contains('sessions')) {
            const sessionStore = db.createObjectStore('sessions', { keyPath: 'id' });
            sessionStore.createIndex('by-cached', 'cached');
          }

          // 動画ストア
          if (!db.objectStoreNames.contains('videos')) {
            const videoStore = db.createObjectStore('videos', { keyPath: 'id' });
            videoStore.createIndex('by-cached', 'cached');
          }

          // テンプレートストア
          if (!db.objectStoreNames.contains('templates')) {
            const templateStore = db.createObjectStore('templates', { keyPath: 'id' });
            templateStore.createIndex('by-cached', 'cached');
          }

          // 同期キューストア
          if (!db.objectStoreNames.contains('syncQueue')) {
            const syncStore = db.createObjectStore('syncQueue', { keyPath: 'id' });
            syncStore.createIndex('by-timestamp', 'timestamp');
            syncStore.createIndex('by-type', 'type');
          }
        },
      });
    } catch (error) {
      console.error('Failed to initialize offline database:', error);
    }
  }

  // ネットワーク状態の監視
  private setupNetworkListeners(): void {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.notifyListeners(true);
      this.syncWhenOnline();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.notifyListeners(false);
    });
  }

  // 定期同期の開始
  private startPeriodicSync(): void {
    setInterval(() => {
      if (this.isOnline && !this.syncInProgress) {
        this.syncWhenOnline();
      }
    }, 30000); // 30秒ごと
  }

  // リスナーの通知
  private notifyListeners(isOnline: boolean): void {
    this.listeners.forEach(listener => listener(isOnline));
  }

  // オンライン状態のリスナー登録
  public addOnlineListener(listener: (isOnline: boolean) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // オンライン状態の取得
  public getOnlineStatus(): boolean {
    return this.isOnline;
  }

  // 評価データの保存（オフライン対応）
  public async saveEvaluation(sessionId: string, evaluationData: any): Promise<void> {
    if (!this.db) return;

    const id = `${sessionId}_${Date.now()}`;
    const data = {
      id,
      sessionId,
      data: evaluationData,
      lastModified: Date.now(),
      synced: this.isOnline && this.shouldSyncNow(),
    };

    try {
      await this.db.put('evaluations', data);

      // オンラインの場合は同期キューに追加
      if (this.isOnline && this.shouldSyncNow()) {
        await this.addToSyncQueue('evaluation', 'create', data);
      } else {
        // オフライン保存の通知
        if (this.notificationSettings.dataSaved) {
          this.addOfflineNotification('data_saved', '評価データをローカルに保存しました');
        }
      }
    } catch (error) {
      console.error('Failed to save evaluation offline:', error);
      this.addOfflineNotification('sync_failed', '評価データの保存に失敗しました');
      throw error;
    }
  }

  // コメントの保存（オフライン対応）
  public async saveComment(sessionId: string, commentData: any): Promise<void> {
    if (!this.db) return;

    const id = `${sessionId}_comment_${Date.now()}`;
    const data = {
      id,
      sessionId,
      data: commentData,
      lastModified: Date.now(),
      synced: this.isOnline && this.shouldSyncNow(),
    };

    try {
      await this.db.put('comments', data);

      if (this.isOnline && this.shouldSyncNow()) {
        await this.addToSyncQueue('comment', 'create', data);
      } else {
        // オフライン保存の通知
        if (this.notificationSettings.dataSaved) {
          this.addOfflineNotification('data_saved', 'コメントをローカルに保存しました');
        }
      }
    } catch (error) {
      console.error('Failed to save comment offline:', error);
      this.addOfflineNotification('sync_failed', 'コメントの保存に失敗しました');
      throw error;
    }
  }

  // セッションデータのキャッシュ
  public async cacheSession(sessionData: any): Promise<void> {
    if (!this.db) return;

    const data = {
      id: sessionData.id,
      data: sessionData,
      lastModified: Date.now(),
      cached: true,
    };

    try {
      await this.db.put('sessions', data);
    } catch (error) {
      console.error('Failed to cache session:', error);
    }
  }

  // 動画データのキャッシュ
  public async cacheVideo(videoData: any): Promise<void> {
    if (!this.db) return;

    const data = {
      id: videoData.id,
      data: videoData,
      lastModified: Date.now(),
      cached: true,
    };

    try {
      await this.db.put('videos', data);
    } catch (error) {
      console.error('Failed to cache video:', error);
    }
  }

  // テンプレートのキャッシュ
  public async cacheTemplate(templateData: any): Promise<void> {
    if (!this.db) return;

    const data = {
      id: templateData.id,
      data: templateData,
      lastModified: Date.now(),
      cached: true,
    };

    try {
      await this.db.put('templates', data);
    } catch (error) {
      console.error('Failed to cache template:', error);
    }
  }

  // キャッシュされたセッションの取得
  public async getCachedSession(sessionId: string): Promise<any | null> {
    if (!this.db) return null;

    try {
      const cached = await this.db.get('sessions', sessionId);
      return cached?.data || null;
    } catch (error) {
      console.error('Failed to get cached session:', error);
      return null;
    }
  }

  // キャッシュされた動画の取得
  public async getCachedVideo(videoId: string): Promise<any | null> {
    if (!this.db) return null;

    try {
      const cached = await this.db.get('videos', videoId);
      return cached?.data || null;
    } catch (error) {
      console.error('Failed to get cached video:', error);
      return null;
    }
  }

  // キャッシュされたテンプレートの取得
  public async getCachedTemplate(templateId: string): Promise<any | null> {
    if (!this.db) return null;

    try {
      const cached = await this.db.get('templates', templateId);
      return cached?.data || null;
    } catch (error) {
      console.error('Failed to get cached template:', error);
      return null;
    }
  }

  // 未同期の評価データの取得
  public async getUnsyncedEvaluations(): Promise<any[]> {
    if (!this.db) return [];

    try {
      const unsynced = await this.db.getAllFromIndex('evaluations', 'by-synced', false);
      return unsynced.map(item => item.data);
    } catch (error) {
      console.error('Failed to get unsynced evaluations:', error);
      return [];
    }
  }

  // 未同期のコメントの取得
  public async getUnsyncedComments(): Promise<any[]> {
    if (!this.db) return [];

    try {
      const unsynced = await this.db.getAllFromIndex('comments', 'by-synced', false);
      return unsynced.map(item => item.data);
    } catch (error) {
      console.error('Failed to get unsynced comments:', error);
      return [];
    }
  }

  // 同期キューへの追加
  private async addToSyncQueue(
    type: 'evaluation' | 'comment' | 'delete',
    action: 'create' | 'update' | 'delete',
    data: any
  ): Promise<void> {
    if (!this.db) return;

    const queueItem = {
      id: `${type}_${action}_${Date.now()}_${Math.random()}`,
      type,
      action,
      data,
      timestamp: Date.now(),
      retryCount: 0,
    };

    try {
      await this.db.put('syncQueue', queueItem);
    } catch (error) {
      console.error('Failed to add to sync queue:', error);
    }
  }

  // オンライン時の同期処理
  public async syncWhenOnline(): Promise<void> {
    if (!this.isOnline || this.syncInProgress || !this.db || !this.shouldSyncNow()) return;

    this.syncInProgress = true;
    let syncedItems = 0;
    let failedItems = 0;

    try {
      // 同期キューの処理
      const syncQueue = await this.db.getAll('syncQueue');
      
      for (const item of syncQueue) {
        try {
          await this.processSyncItem(item);
          await this.db.delete('syncQueue', item.id);
          syncedItems++;
        } catch (error) {
          console.error('Failed to sync item:', error);
          failedItems++;
          
          // リトライ回数を増やす
          item.retryCount++;
          if (item.retryCount < 3) {
            await this.db.put('syncQueue', item);
          } else {
            // 最大リトライ回数に達した場合は削除
            await this.db.delete('syncQueue', item.id);
            if (this.notificationSettings.syncFailed) {
              this.addOfflineNotification('sync_failed', `${item.type}の同期に失敗しました（最大リトライ回数に達しました）`);
            }
          }
        }
      }

      // 未同期データの同期状態を更新
      await this.markDataAsSynced();

      // 同期完了の通知
      if (syncedItems > 0 && this.notificationSettings.syncCompleted) {
        this.addOfflineNotification('sync_completed', `${syncedItems}件のデータを同期しました`);
        
        // プッシュ通知も送信
        await this.sendPushNotification(
          '同期完了',
          `${syncedItems}件のデータを同期しました`,
          { syncedItems, failedItems }
        );
      }

      if (failedItems > 0 && this.notificationSettings.syncFailed) {
        this.addOfflineNotification('sync_failed', `${failedItems}件のデータの同期に失敗しました`);
      }
    } catch (error) {
      console.error('Sync failed:', error);
      if (this.notificationSettings.syncFailed) {
        this.addOfflineNotification('sync_failed', '同期処理でエラーが発生しました');
      }
    } finally {
      this.syncInProgress = false;
    }
  }

  // 同期アイテムの処理
  private async processSyncItem(item: any): Promise<void> {
    // ここで実際のAPI呼び出しを行う
    // 実装は具体的なAPIサービスに依存するため、インターフェースのみ定義
    switch (item.type) {
      case 'evaluation':
        // await evaluationService.syncEvaluation(item.data);
        break;
      case 'comment':
        // await evaluationService.syncComment(item.data);
        break;
      default:
        throw new Error(`Unknown sync type: ${item.type}`);
    }
  }

  // データの同期済みマーク
  private async markDataAsSynced(): Promise<void> {
    if (!this.db) return;

    try {
      // 評価データの同期状態更新
      const evaluations = await this.db.getAll('evaluations');
      for (const evaluation of evaluations) {
        if (!evaluation.synced) {
          evaluation.synced = true;
          await this.db.put('evaluations', evaluation);
        }
      }

      // コメントの同期状態更新
      const comments = await this.db.getAll('comments');
      for (const comment of comments) {
        if (!comment.synced) {
          comment.synced = true;
          await this.db.put('comments', comment);
        }
      }
    } catch (error) {
      console.error('Failed to mark data as synced:', error);
    }
  }

  // キャッシュのクリア
  public async clearCache(): Promise<void> {
    if (!this.db) return;

    try {
      await this.db.clear('sessions');
      await this.db.clear('videos');
      await this.db.clear('templates');
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  }

  // 古いデータの削除
  public async cleanupOldData(maxAge: number = 7 * 24 * 60 * 60 * 1000): Promise<void> {
    if (!this.db) return;

    const cutoffTime = Date.now() - maxAge;

    try {
      // 古い評価データの削除
      const evaluations = await this.db.getAll('evaluations');
      for (const evaluation of evaluations) {
        if (evaluation.synced && evaluation.lastModified < cutoffTime) {
          await this.db.delete('evaluations', evaluation.id);
        }
      }

      // 古いコメントの削除
      const comments = await this.db.getAll('comments');
      for (const comment of comments) {
        if (comment.synced && comment.lastModified < cutoffTime) {
          await this.db.delete('comments', comment.id);
        }
      }

      // 古いキャッシュの削除
      const sessions = await this.db.getAll('sessions');
      for (const session of sessions) {
        if (session.lastModified < cutoffTime) {
          await this.db.delete('sessions', session.id);
        }
      }
    } catch (error) {
      console.error('Failed to cleanup old data:', error);
    }
  }

  // ストレージ使用量の取得
  public async getStorageUsage(): Promise<{ used: number; quota: number } | null> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      try {
        const estimate = await navigator.storage.estimate();
        return {
          used: estimate.usage || 0,
          quota: estimate.quota || 0,
        };
      } catch (error) {
        console.error('Failed to get storage usage:', error);
      }
    }
    return null;
  }

  // 同期状態の取得
  public async getSyncStatus(): Promise<{
    unsyncedEvaluations: number;
    unsyncedComments: number;
    queuedItems: number;
  }> {
    if (!this.db) {
      return { unsyncedEvaluations: 0, unsyncedComments: 0, queuedItems: 0 };
    }

    try {
      const [unsyncedEvaluations, unsyncedComments, queuedItems] = await Promise.all([
        this.db.getAllFromIndex('evaluations', 'by-synced', false),
        this.db.getAllFromIndex('comments', 'by-synced', false),
        this.db.getAll('syncQueue'),
      ]);

      return {
        unsyncedEvaluations: unsyncedEvaluations.length,
        unsyncedComments: unsyncedComments.length,
        queuedItems: queuedItems.length,
      };
    } catch (error) {
      console.error('Failed to get sync status:', error);
      return { unsyncedEvaluations: 0, unsyncedComments: 0, queuedItems: 0 };
    }
  }

  // オフライン通知の管理
  private offlineNotifications: Array<{
    id: string;
    type: 'sync_failed' | 'data_saved' | 'sync_completed';
    message: string;
    timestamp: number;
  }> = [];

  // オフライン通知の追加
  public addOfflineNotification(type: 'sync_failed' | 'data_saved' | 'sync_completed', message: string): void {
    const notification = {
      id: `offline_${Date.now()}_${Math.random()}`,
      type,
      message,
      timestamp: Date.now(),
    };
    
    this.offlineNotifications.push(notification);
    
    // 最大50件まで保持
    if (this.offlineNotifications.length > 50) {
      this.offlineNotifications = this.offlineNotifications.slice(-50);
    }
    
    // カスタムイベントを発火
    window.dispatchEvent(new CustomEvent('offline-notification', {
      detail: notification
    }));
  }

  // オフライン通知の取得
  public getOfflineNotifications(): Array<{
    id: string;
    type: 'sync_failed' | 'data_saved' | 'sync_completed';
    message: string;
    timestamp: number;
  }> {
    return [...this.offlineNotifications];
  }

  // オフライン通知のクリア
  public clearOfflineNotifications(): void {
    this.offlineNotifications = [];
  }

  // モバイル向け通知設定の管理
  private notificationSettings = {
    offlineMode: true,
    syncCompleted: true,
    syncFailed: true,
    dataSaved: false,
  };

  // 通知設定の取得
  public getNotificationSettings(): typeof this.notificationSettings {
    const saved = localStorage.getItem('offline_notification_settings');
    if (saved) {
      try {
        this.notificationSettings = { ...this.notificationSettings, ...JSON.parse(saved) };
      } catch (error) {
        console.error('Failed to parse notification settings:', error);
      }
    }
    return this.notificationSettings;
  }

  // 通知設定の更新
  public updateNotificationSettings(settings: Partial<typeof this.notificationSettings>): void {
    this.notificationSettings = { ...this.notificationSettings, ...settings };
    localStorage.setItem('offline_notification_settings', JSON.stringify(this.notificationSettings));
  }

  // プッシュ通知の送信（モバイル対応）
  private async sendPushNotification(title: string, body: string, data?: any): Promise<void> {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      try {
        const registration = await navigator.serviceWorker.ready;
        if (registration.pushManager) {
          // プッシュ通知の実装は将来的に追加
          console.log('Push notification would be sent:', { title, body, data });
        }
      } catch (error) {
        console.error('Failed to send push notification:', error);
      }
    }
  }

  // バックグラウンド同期の登録
  public async registerBackgroundSync(): Promise<void> {
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      try {
        const registration = await navigator.serviceWorker.ready;
        // TypeScript doesn't recognize sync API, so we cast to any
        await (registration as any).sync.register('evaluation-sync');
        console.log('Background sync registered');
      } catch (error) {
        
      }
    }
  }

  // ネットワーク品質の監視
  private networkQuality: 'good' | 'poor' | 'offline' = 'good';

  private monitorNetworkQuality(): void {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      
      const updateNetworkQuality = () => {
        if (!this.isOnline) {
          this.networkQuality = 'offline';
        } else if (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g') {
          this.networkQuality = 'poor';
        } else {
          this.networkQuality = 'good';
        }
      };

      connection.addEventListener('change', updateNetworkQuality);
      updateNetworkQuality();
    }
  }

  // ネットワーク品質の取得
  public getNetworkQuality(): 'good' | 'poor' | 'offline' {
    return this.networkQuality;
  }

  // データ使用量の最適化
  public shouldSyncNow(): boolean {
    if (!this.isOnline) return false;
    if (this.networkQuality === 'poor') return false;
    
    // バッテリー残量をチェック（対応ブラウザのみ）
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        if (battery.level < 0.2 && !battery.charging) {
          return false; // バッテリー残量が少ない場合は同期を控える
        }
      });
    }
    
    return true;
  }
}

// シングルトンインスタンス
export const offlineService = new OfflineService();
export default offlineService;