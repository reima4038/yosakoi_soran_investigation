import { CacheManager, sessionCache, evaluationCache, createCacheKey } from '../cache';

describe('CacheManager', () => {
  let cache: CacheManager;

  beforeEach(() => {
    cache = new CacheManager({ ttl: 1000, maxSize: 5 });
  });

  afterEach(() => {
    cache.clear();
  });

  describe('basic operations', () => {
    it('should store and retrieve data', () => {
      const testData = { id: '1', name: 'test' };
      cache.set('test-key', testData);
      
      const retrieved = cache.get('test-key');
      expect(retrieved).toEqual(testData);
    });

    it('should return null for non-existent keys', () => {
      const result = cache.get('non-existent');
      expect(result).toBeNull();
    });

    it('should check if key exists', () => {
      cache.set('test-key', 'test-value');
      
      expect(cache.has('test-key')).toBe(true);
      expect(cache.has('non-existent')).toBe(false);
    });

    it('should delete entries', () => {
      cache.set('test-key', 'test-value');
      expect(cache.has('test-key')).toBe(true);
      
      const deleted = cache.delete('test-key');
      expect(deleted).toBe(true);
      expect(cache.has('test-key')).toBe(false);
    });

    it('should clear all entries', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      
      cache.clear();
      
      expect(cache.has('key1')).toBe(false);
      expect(cache.has('key2')).toBe(false);
    });
  });

  describe('TTL functionality', () => {
    it('should expire entries after TTL', async () => {
      const shortTtlCache = new CacheManager({ ttl: 50 });
      shortTtlCache.set('test-key', 'test-value');
      
      expect(shortTtlCache.has('test-key')).toBe(true);
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(shortTtlCache.has('test-key')).toBe(false);
    });

    it('should use custom TTL when provided', async () => {
      cache.set('test-key', 'test-value', 50); // 50ms TTL
      
      expect(cache.has('test-key')).toBe(true);
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(cache.has('test-key')).toBe(false);
    });
  });

  describe('size limits', () => {
    it('should evict oldest entries when max size is reached', () => {
      const smallCache = new CacheManager({ maxSize: 2, ttl: 10000 });
      
      smallCache.set('key1', 'value1');
      smallCache.set('key2', 'value2');
      smallCache.set('key3', 'value3'); // Should evict key1
      
      expect(smallCache.has('key1')).toBe(false);
      expect(smallCache.has('key2')).toBe(true);
      expect(smallCache.has('key3')).toBe(true);
    });
  });

  describe('stale-while-revalidate', () => {
    it('should return cached data and revalidate in background', async () => {
      let fetchCount = 0;
      const fetcher = jest.fn(async () => {
        fetchCount++;
        return `data-${fetchCount}`;
      });

      // First call - should fetch and cache
      const result1 = await cache.getWithRevalidation('test-key', fetcher);
      expect(result1).toBe('data-1');
      expect(fetcher).toHaveBeenCalledTimes(1);

      // Second call immediately - should return cached data
      const result2 = await cache.getWithRevalidation('test-key', fetcher);
      expect(result2).toBe('data-1');
      expect(fetcher).toHaveBeenCalledTimes(1);
    });

    it('should force refresh when requested', async () => {
      let fetchCount = 0;
      const fetcher = jest.fn(async () => {
        fetchCount++;
        return `data-${fetchCount}`;
      });

      // First call
      await cache.getWithRevalidation('test-key', fetcher);
      expect(fetcher).toHaveBeenCalledTimes(1);

      // Force refresh
      const result = await cache.getWithRevalidation('test-key', fetcher, { forceRefresh: true });
      expect(result).toBe('data-2');
      expect(fetcher).toHaveBeenCalledTimes(2);
    });
  });

  describe('statistics', () => {
    it('should provide cache statistics', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      
      const stats = cache.getStats();
      
      expect(stats.size).toBe(2);
      expect(stats.maxSize).toBe(5);
      expect(stats.entries).toHaveLength(2);
      expect(stats.entries[0]).toHaveProperty('key');
      expect(stats.entries[0]).toHaveProperty('age');
      expect(stats.entries[0]).toHaveProperty('expiresIn');
    });
  });

  describe('cleanup', () => {
    it('should clean up expired entries', async () => {
      const shortTtlCache = new CacheManager({ ttl: 50 });
      
      shortTtlCache.set('key1', 'value1');
      shortTtlCache.set('key2', 'value2');
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const cleanedCount = shortTtlCache.cleanup();
      expect(cleanedCount).toBe(2);
      expect(shortTtlCache.has('key1')).toBe(false);
      expect(shortTtlCache.has('key2')).toBe(false);
    });
  });
});

describe('Cache instances', () => {
  it('should have separate session and evaluation caches', () => {
    sessionCache.set('test-key', 'session-data');
    evaluationCache.set('test-key', 'evaluation-data');
    
    expect(sessionCache.get('test-key')).toBe('session-data');
    expect(evaluationCache.get('test-key')).toBe('evaluation-data');
  });
});

describe('createCacheKey', () => {
  it('should create cache keys from parts', () => {
    const key = createCacheKey('evaluation', 'session123', 'user456');
    expect(key).toBe('evaluation:session123:user456');
  });

  it('should handle numbers in cache keys', () => {
    const key = createCacheKey('session', 123, 'data');
    expect(key).toBe('session:123:data');
  });
});