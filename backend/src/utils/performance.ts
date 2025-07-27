// Performance monitoring and optimization utilities

export interface PerformanceMetrics {
  responseTime: number;
  memoryUsage: NodeJS.MemoryUsage;
  cpuUsage: NodeJS.CpuUsage;
  timestamp: Date;
}

export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: PerformanceMetrics[] = [];
  private maxMetrics = 1000; // Keep last 1000 metrics

  private constructor() {}

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  /**
   * Record performance metrics
   */
  recordMetrics(responseTime: number): void {
    const metrics: PerformanceMetrics = {
      responseTime,
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
      timestamp: new Date()
    };

    this.metrics.push(metrics);

    // Keep only recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
  }

  /**
   * Get performance statistics
   */
  getStats(): {
    averageResponseTime: number;
    maxResponseTime: number;
    minResponseTime: number;
    averageMemoryUsage: number;
    maxMemoryUsage: number;
    totalRequests: number;
  } {
    if (this.metrics.length === 0) {
      return {
        averageResponseTime: 0,
        maxResponseTime: 0,
        minResponseTime: 0,
        averageMemoryUsage: 0,
        maxMemoryUsage: 0,
        totalRequests: 0
      };
    }

    const responseTimes = this.metrics.map(m => m.responseTime);
    const memoryUsages = this.metrics.map(m => m.memoryUsage.heapUsed);

    return {
      averageResponseTime: responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length,
      maxResponseTime: Math.max(...responseTimes),
      minResponseTime: Math.min(...responseTimes),
      averageMemoryUsage: memoryUsages.reduce((a, b) => a + b, 0) / memoryUsages.length,
      maxMemoryUsage: Math.max(...memoryUsages),
      totalRequests: this.metrics.length
    };
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics = [];
  }

  /**
   * Get recent metrics
   */
  getRecentMetrics(count: number = 10): PerformanceMetrics[] {
    return this.metrics.slice(-count);
  }
}

/**
 * Middleware to track response times
 */
export const performanceMiddleware = (req: any, res: any, next: any) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const responseTime = Date.now() - startTime;
    PerformanceMonitor.getInstance().recordMetrics(responseTime);
  });
  
  next();
};

/**
 * Database query optimization utilities
 */
export class QueryOptimizer {
  /**
   * Create optimized pagination query
   */
  static createPaginationQuery(
    page: number = 1,
    limit: number = 10,
    maxLimit: number = 100
  ): { skip: number; limit: number } {
    const normalizedPage = Math.max(1, page);
    const normalizedLimit = Math.min(Math.max(1, limit), maxLimit);
    
    return {
      skip: (normalizedPage - 1) * normalizedLimit,
      limit: normalizedLimit
    };
  }

  /**
   * Create optimized search query with indexes
   */
  static createSearchQuery(searchTerm: string, fields: string[]): any {
    if (!searchTerm || !fields.length) {
      return {};
    }

    const regex = new RegExp(searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    
    return {
      $or: fields.map(field => ({ [field]: regex }))
    };
  }

  /**
   * Create optimized date range query
   */
  static createDateRangeQuery(
    field: string,
    startDate?: Date,
    endDate?: Date
  ): any {
    const query: any = {};
    
    if (startDate || endDate) {
      query[field] = {};
      
      if (startDate) {
        query[field].$gte = startDate;
      }
      
      if (endDate) {
        query[field].$lte = endDate;
      }
    }
    
    return query;
  }
}

/**
 * Cache utilities for performance optimization
 */
export class CacheManager {
  private static cache = new Map<string, { data: any; expiry: number }>();
  private static defaultTTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Set cache entry
   */
  static set(key: string, data: any, ttl: number = this.defaultTTL): void {
    const expiry = Date.now() + ttl;
    this.cache.set(key, { data, expiry });
  }

  /**
   * Get cache entry
   */
  static get(key: string): any | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }
    
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }

  /**
   * Delete cache entry
   */
  static delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all cache
   */
  static clear(): void {
    this.cache.clear();
  }

  /**
   * Clean expired entries
   */
  static cleanup(): void {
    const now = Date.now();
    
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiry) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get cache statistics
   */
  static getStats(): {
    totalEntries: number;
    expiredEntries: number;
    hitRate: number;
  } {
    const now = Date.now();
    let expiredCount = 0;
    
    for (const entry of this.cache.values()) {
      if (now > entry.expiry) {
        expiredCount++;
      }
    }
    
    return {
      totalEntries: this.cache.size,
      expiredEntries: expiredCount,
      hitRate: 0 // Would need to track hits/misses for accurate calculation
    };
  }
}

/**
 * Memory optimization utilities
 */
export class MemoryOptimizer {
  /**
   * Force garbage collection if available
   */
  static forceGC(): void {
    if (global.gc) {
      global.gc();
    }
  }

  /**
   * Get memory usage statistics
   */
  static getMemoryStats(): {
    heapUsed: string;
    heapTotal: string;
    external: string;
    rss: string;
  } {
    const usage = process.memoryUsage();
    
    return {
      heapUsed: `${Math.round(usage.heapUsed / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(usage.heapTotal / 1024 / 1024)}MB`,
      external: `${Math.round(usage.external / 1024 / 1024)}MB`,
      rss: `${Math.round(usage.rss / 1024 / 1024)}MB`
    };
  }

  /**
   * Check if memory usage is high
   */
  static isMemoryHigh(threshold: number = 500 * 1024 * 1024): boolean {
    return process.memoryUsage().heapUsed > threshold;
  }

  /**
   * Clean up resources
   */
  static cleanup(): void {
    CacheManager.cleanup();
    this.forceGC();
  }
}

/**
 * Performance testing utilities
 */
export class PerformanceTester {
  /**
   * Measure function execution time
   */
  static async measureTime<T>(
    fn: () => Promise<T> | T,
    label?: string
  ): Promise<{ result: T; duration: number }> {
    const startTime = Date.now();
    const result = await fn();
    const duration = Date.now() - startTime;
    
    if (label) {
      console.log(`${label}: ${duration}ms`);
    }
    
    return { result, duration };
  }

  /**
   * Run load test
   */
  static async loadTest(
    fn: () => Promise<any>,
    concurrency: number = 10,
    iterations: number = 100
  ): Promise<{
    totalTime: number;
    averageTime: number;
    maxTime: number;
    minTime: number;
    successCount: number;
    errorCount: number;
  }> {
    const startTime = Date.now();
    const results: number[] = [];
    let successCount = 0;
    let errorCount = 0;

    const batches = Math.ceil(iterations / concurrency);
    
    for (let batch = 0; batch < batches; batch++) {
      const batchSize = Math.min(concurrency, iterations - batch * concurrency);
      const promises = Array.from({ length: batchSize }, async () => {
        const testStart = Date.now();
        
        try {
          await fn();
          const testDuration = Date.now() - testStart;
          results.push(testDuration);
          successCount++;
        } catch (error) {
          errorCount++;
        }
      });
      
      await Promise.all(promises);
    }

    const totalTime = Date.now() - startTime;
    
    return {
      totalTime,
      averageTime: results.length > 0 ? results.reduce((a, b) => a + b, 0) / results.length : 0,
      maxTime: results.length > 0 ? Math.max(...results) : 0,
      minTime: results.length > 0 ? Math.min(...results) : 0,
      successCount,
      errorCount
    };
  }
}

// Automatic cleanup interval
setInterval(() => {
  MemoryOptimizer.cleanup();
}, 10 * 60 * 1000); // Every 10 minutes