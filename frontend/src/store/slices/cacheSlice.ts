import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// キャッシュエントリの型定義
interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  expiresAt: number;
  key: string;
}

// キャッシュ状態の型定義
interface CacheState {
  entries: Record<string, CacheEntry>;
  settings: {
    defaultTTL: number; // デフォルトのTTL（ミリ秒）
    maxEntries: number; // 最大キャッシュエントリ数
    enablePersistence: boolean; // ローカルストレージへの永続化
  };
  stats: {
    hits: number;
    misses: number;
    evictions: number;
  };
}

// 初期状態
const initialState: CacheState = {
  entries: {},
  settings: {
    defaultTTL: 5 * 60 * 1000, // 5分
    maxEntries: 100,
    enablePersistence: true,
  },
  stats: {
    hits: 0,
    misses: 0,
    evictions: 0,
  },
};

// キャッシュスライス
const cacheSlice = createSlice({
  name: 'cache',
  initialState,
  reducers: {
    // キャッシュエントリの設定
    setCache: (state, action: PayloadAction<{
      key: string;
      data: any;
      ttl?: number;
    }>) => {
      const { key, data, ttl = state.settings.defaultTTL } = action.payload;
      const now = Date.now();
      
      // 最大エントリ数を超える場合、古いエントリを削除
      if (Object.keys(state.entries).length >= state.settings.maxEntries) {
        const oldestKey = Object.keys(state.entries)
          .sort((a, b) => state.entries[a].timestamp - state.entries[b].timestamp)[0];
        delete state.entries[oldestKey];
        state.stats.evictions++;
      }
      
      state.entries[key] = {
        data,
        timestamp: now,
        expiresAt: now + ttl,
        key,
      };
      
      // ローカルストレージに永続化
      if (state.settings.enablePersistence) {
        try {
          localStorage.setItem(`cache_${key}`, JSON.stringify(state.entries[key]));
        } catch (error) {
          console.warn('Failed to persist cache entry to localStorage:', error);
        }
      }
    },
    
    // キャッシュエントリの取得（統計更新のため）
    getCacheHit: (state, action: PayloadAction<string>) => {
      state.stats.hits++;
    },
    
    getCacheMiss: (state, action: PayloadAction<string>) => {
      state.stats.misses++;
    },
    
    // キャッシュエントリの削除
    removeCache: (state, action: PayloadAction<string>) => {
      const key = action.payload;
      delete state.entries[key];
      
      if (state.settings.enablePersistence) {
        try {
          localStorage.removeItem(`cache_${key}`);
        } catch (error) {
          console.warn('Failed to remove cache entry from localStorage:', error);
        }
      }
    },
    
    // パターンマッチによるキャッシュ削除
    removeCacheByPattern: (state, action: PayloadAction<string>) => {
      const pattern = action.payload;
      const regex = new RegExp(pattern);
      
      Object.keys(state.entries).forEach(key => {
        if (regex.test(key)) {
          delete state.entries[key];
          if (state.settings.enablePersistence) {
            try {
              localStorage.removeItem(`cache_${key}`);
            } catch (error) {
              console.warn('Failed to remove cache entry from localStorage:', error);
            }
          }
        }
      });
    },
    
    // 期限切れキャッシュの削除
    cleanExpiredCache: (state) => {
      const now = Date.now();
      const expiredKeys: string[] = [];
      
      Object.entries(state.entries).forEach(([key, entry]) => {
        if (entry.expiresAt < now) {
          expiredKeys.push(key);
        }
      });
      
      expiredKeys.forEach(key => {
        delete state.entries[key];
        if (state.settings.enablePersistence) {
          try {
            localStorage.removeItem(`cache_${key}`);
          } catch (error) {
            console.warn('Failed to remove expired cache entry from localStorage:', error);
          }
        }
      });
      
      state.stats.evictions += expiredKeys.length;
    },
    
    // 全キャッシュのクリア
    clearAllCache: (state) => {
      const entryCount = Object.keys(state.entries).length;
      state.entries = {};
      state.stats.evictions += entryCount;
      
      if (state.settings.enablePersistence) {
        try {
          // localStorage内のキャッシュエントリをすべて削除
          Object.keys(localStorage).forEach(key => {
            if (key.startsWith('cache_')) {
              localStorage.removeItem(key);
            }
          });
        } catch (error) {
          console.warn('Failed to clear cache from localStorage:', error);
        }
      }
    },
    
    // キャッシュ設定の更新
    updateCacheSettings: (state, action: PayloadAction<Partial<CacheState['settings']>>) => {
      state.settings = { ...state.settings, ...action.payload };
    },
    
    // 統計のリセット
    resetCacheStats: (state) => {
      state.stats = {
        hits: 0,
        misses: 0,
        evictions: 0,
      };
    },
    
    // ローカルストレージからキャッシュを復元
    restoreFromStorage: (state) => {
      if (!state.settings.enablePersistence) return;
      
      try {
        const now = Date.now();
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('cache_')) {
            const cacheKey = key.replace('cache_', '');
            const entryStr = localStorage.getItem(key);
            if (entryStr) {
              const entry: CacheEntry = JSON.parse(entryStr);
              // 期限切れでない場合のみ復元
              if (entry.expiresAt > now) {
                state.entries[cacheKey] = entry;
              } else {
                localStorage.removeItem(key);
              }
            }
          }
        });
      } catch (error) {
        console.warn('Failed to restore cache from localStorage:', error);
      }
    },
    
    // キャッシュの無効化（特定のタグに基づく）
    invalidateCacheByTags: (state, action: PayloadAction<string[]>) => {
      const tags = action.payload;
      const keysToRemove: string[] = [];
      
      Object.entries(state.entries).forEach(([key, entry]) => {
        // キーにタグが含まれている場合は無効化
        if (tags.some(tag => key.includes(tag))) {
          keysToRemove.push(key);
        }
      });
      
      keysToRemove.forEach(key => {
        delete state.entries[key];
        if (state.settings.enablePersistence) {
          try {
            localStorage.removeItem(`cache_${key}`);
          } catch (error) {
            console.warn('Failed to remove cache entry from localStorage:', error);
          }
        }
      });
      
      state.stats.evictions += keysToRemove.length;
    },
  },
});

// アクションのエクスポート
export const {
  setCache,
  getCacheHit,
  getCacheMiss,
  removeCache,
  removeCacheByPattern,
  cleanExpiredCache,
  clearAllCache,
  updateCacheSettings,
  resetCacheStats,
  restoreFromStorage,
  invalidateCacheByTags,
} = cacheSlice.actions;

// セレクター
export const selectCacheEntry = (key: string) => (state: { cache: CacheState }) => {
  const entry = state.cache.entries[key];
  if (!entry) return null;
  
  // 期限切れチェック
  if (entry.expiresAt < Date.now()) {
    return null;
  }
  
  return entry;
};

export const selectCacheStats = (state: { cache: CacheState }) => state.cache.stats;
export const selectCacheSettings = (state: { cache: CacheState }) => state.cache.settings;

// キャッシュヒット率の計算
export const selectCacheHitRate = (state: { cache: CacheState }) => {
  const { hits, misses } = state.cache.stats;
  const total = hits + misses;
  return total > 0 ? (hits / total) * 100 : 0;
};

// キャッシュサイズの取得
export const selectCacheSize = (state: { cache: CacheState }) => 
  Object.keys(state.cache.entries).length;

// ヘルパー関数: キャッシュキーの生成
export const generateCacheKey = (prefix: string, params: Record<string, any> = {}) => {
  const paramString = Object.keys(params)
    .sort()
    .map(key => `${key}:${params[key]}`)
    .join('|');
  return paramString ? `${prefix}|${paramString}` : prefix;
};

export default cacheSlice.reducer;