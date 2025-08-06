export interface PerformanceMetrics {
    responseTime: number;
    memoryUsage: NodeJS.MemoryUsage;
    cpuUsage: NodeJS.CpuUsage;
    timestamp: Date;
}
export declare class PerformanceMonitor {
    private static instance;
    private metrics;
    private maxMetrics;
    private constructor();
    static getInstance(): PerformanceMonitor;
    /**
     * Record performance metrics
     */
    recordMetrics(responseTime: number): void;
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
    };
    /**
     * Clear all metrics
     */
    clear(): void;
    /**
     * Get recent metrics
     */
    getRecentMetrics(count?: number): PerformanceMetrics[];
}
/**
 * Middleware to track response times
 */
export declare const performanceMiddleware: (req: any, res: any, next: any) => void;
/**
 * Database query optimization utilities
 */
export declare class QueryOptimizer {
    /**
     * Create optimized pagination query
     */
    static createPaginationQuery(page?: number, limit?: number, maxLimit?: number): {
        skip: number;
        limit: number;
    };
    /**
     * Create optimized search query with indexes
     */
    static createSearchQuery(searchTerm: string, fields: string[]): any;
    /**
     * Create optimized date range query
     */
    static createDateRangeQuery(field: string, startDate?: Date, endDate?: Date): any;
}
/**
 * Cache utilities for performance optimization
 */
export declare class CacheManager {
    private static cache;
    private static defaultTTL;
    /**
     * Set cache entry
     */
    static set(key: string, data: any, ttl?: number): void;
    /**
     * Get cache entry
     */
    static get(key: string): any | null;
    /**
     * Delete cache entry
     */
    static delete(key: string): void;
    /**
     * Clear all cache
     */
    static clear(): void;
    /**
     * Clean expired entries
     */
    static cleanup(): void;
    /**
     * Get cache statistics
     */
    static getStats(): {
        totalEntries: number;
        expiredEntries: number;
        hitRate: number;
    };
}
/**
 * Memory optimization utilities
 */
export declare class MemoryOptimizer {
    /**
     * Force garbage collection if available
     */
    static forceGC(): void;
    /**
     * Get memory usage statistics
     */
    static getMemoryStats(): {
        heapUsed: string;
        heapTotal: string;
        external: string;
        rss: string;
    };
    /**
     * Check if memory usage is high
     */
    static isMemoryHigh(threshold?: number): boolean;
    /**
     * Clean up resources
     */
    static cleanup(): void;
}
/**
 * Performance testing utilities
 */
export declare class PerformanceTester {
    /**
     * Measure function execution time
     */
    static measureTime<T>(fn: () => Promise<T> | T, label?: string): Promise<{
        result: T;
        duration: number;
    }>;
    /**
     * Run load test
     */
    static loadTest(fn: () => Promise<any>, concurrency?: number, iterations?: number): Promise<{
        totalTime: number;
        averageTime: number;
        maxTime: number;
        minTime: number;
        successCount: number;
        errorCount: number;
    }>;
}
//# sourceMappingURL=performance.d.ts.map