// キャッシュエントリの型定義
export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
  key: string;
}

// キャッシュ設定の型定義
export interface CacheConfig {
  ttl: number; // Time to live in milliseconds
  maxSize: number; // Maximum number of entries
  staleWhileRevalidate: boolean; // Return stale data while fetching fresh data
}

// デフォルトキャッシュ設定
const DEFAULT_CACHE_CONFIG: CacheConfig = {
  ttl: 5 * 60 * 1000, // 5 minutes
  maxSize: 100,
  staleWhileRevalidate: true,
};

export class CacheManager {
  private cache = new Map<string, CacheEntry<any>>();
  private config: CacheConfig;
  private revalidationPromises = new Map<string, Promise<any>>();

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = { ...DEFAULT_CACHE_CONFIG, ...config };
  }

  /**
   * キャッシュからデータを取得
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    const now = Date.now();
    
    // 期限切れチェック
    if (now > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * データをキャッシュに保存
   */
  set<T>(key: string, data: T, customTtl?: number): void {
    const now = Date.now();
    const ttl = customTtl || this.config.ttl;
    
    const entry: CacheEntry<T> = {
      data,
      timestamp: now,
      expiresAt: now + ttl,
      key,
    };

    // キャッシュサイズ制限チェック
    if (this.cache.size >= this.config.maxSize) {
      this.evictOldest();
    }

    this.cache.set(key, entry);
  }

  /**
   * キャッシュからデータを削除
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * キャッシュをクリア
   */
  clear(): void {
    this.cache.clear();
    this.revalidationPromises.clear();
  }

  /**
   * キャッシュされたデータが存在するかチェック
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    const now = Date.now();
    if (now > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  /**
   * キャッシュされたデータが古いかチェック
   */
  isStale(key: string, maxAge: number = this.config.ttl / 2): boolean {
    const entry = this.cache.get(key);
    if (!entry) return true;
    
    const now = Date.now();
    return (now - entry.timestamp) > maxAge;
  }

  /**
   * Stale-While-Revalidate パターンでデータを取得
   */
  async getWithRevalidation<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: {
      ttl?: number;
      forceRefresh?: boolean;
      maxStaleAge?: number;
    } = {}
  ): Promise<T> {
    const { ttl, forceRefresh = false, maxStaleAge = this.config.ttl / 2 } = options;
    
    // 強制リフレッシュの場合
    if (forceRefresh) {
      const data = await fetcher();
      this.set(key, data, ttl);
      return data;
    }

    // キャッシュされたデータを取得
    const cachedData = this.get<T>(key);
    
    // キャッシュがない場合は新しいデータを取得
    if (cachedData === null) {
      const data = await fetcher();
      this.set(key, data, ttl);
      return data;
    }

    // データが古い場合はバックグラウンドで更新
    if (this.config.staleWhileRevalidate && this.isStale(key, maxStaleAge)) {
      this.revalidateInBackground(key, fetcher, ttl);
    }

    return cachedData;
  }

  /**
   * バックグラウンドでデータを再検証
   */
  private async revalidateInBackground<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl?: number
  ): Promise<void> {
    // 既に再検証中の場合はスキップ
    if (this.revalidationPromises.has(key)) {
      return;
    }

    const revalidationPromise = fetcher()
      .then(data => {
        this.set(key, data, ttl);
        this.revalidationPromises.delete(key);
        return data;
      })
      .catch(error => {
        
        this.revalidationPromises.delete(key);
        throw error;
      });

    this.revalidationPromises.set(key, revalidationPromise);
  }

  /**
   * 最も古いエントリを削除
   */
  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTimestamp = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  /**
   * キャッシュ統計を取得
   */
  getStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
    entries: Array<{
      key: string;
      age: number;
      expiresIn: number;
      isStale: boolean;
    }>;
  } {
    const now = Date.now();
    const entries = Array.from(this.cache.entries()).map(([key, entry]) => ({
      key,
      age: now - entry.timestamp,
      expiresIn: entry.expiresAt - now,
      isStale: this.isStale(key),
    }));

    return {
      size: this.cache.size,
      maxSize: this.config.maxSize,
      hitRate: 0, // TODO: Implement hit rate tracking
      entries,
    };
  }

  /**
   * 期限切れエントリをクリーンアップ
   */
  cleanup(): number {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        cleanedCount++;
      }
    }

    return cleanedCount;
  }
}

// セッションデータ専用のキャッシュマネージャー
export const sessionCache = new CacheManager({
  ttl: 10 * 60 * 1000, // 10 minutes for session data
  maxSize: 50,
  staleWhileRevalidate: true,
});

// 評価データ専用のキャッシュマネージャー
export const evaluationCache = new CacheManager({
  ttl: 5 * 60 * 1000, // 5 minutes for evaluation data
  maxSize: 100,
  staleWhileRevalidate: true,
});

// 汎用キャッシュマネージャー
export const generalCache = new CacheManager();

// キャッシュキー生成ユーティリティ
export const createCacheKey = (...parts: (string | number)[]): string => {
  return parts.join(':');
};

// 定期的なクリーンアップ
setInterval(() => {
  sessionCache.cleanup();
  evaluationCache.cleanup();
  generalCache.cleanup();
}, 60 * 1000); // 1分ごと