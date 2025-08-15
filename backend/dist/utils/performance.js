"use strict";
// Performance monitoring and optimization utilities
Object.defineProperty(exports, "__esModule", { value: true });
exports.PerformanceTester = exports.MemoryOptimizer = exports.CacheManager = exports.QueryOptimizer = exports.performanceMiddleware = exports.PerformanceMonitor = void 0;
class PerformanceMonitor {
    constructor() {
        this.metrics = [];
        this.maxMetrics = 1000; // Keep last 1000 metrics
    }
    static getInstance() {
        if (!PerformanceMonitor.instance) {
            PerformanceMonitor.instance = new PerformanceMonitor();
        }
        return PerformanceMonitor.instance;
    }
    /**
     * Record performance metrics
     */
    recordMetrics(responseTime) {
        const metrics = {
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
    getStats() {
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
    clear() {
        this.metrics = [];
    }
    /**
     * Get recent metrics
     */
    getRecentMetrics(count = 10) {
        return this.metrics.slice(-count);
    }
}
exports.PerformanceMonitor = PerformanceMonitor;
/**
 * Middleware to track response times
 */
const performanceMiddleware = (_req, res, next) => {
    const startTime = Date.now();
    res.on('finish', () => {
        const responseTime = Date.now() - startTime;
        PerformanceMonitor.getInstance().recordMetrics(responseTime);
    });
    next();
};
exports.performanceMiddleware = performanceMiddleware;
/**
 * Database query optimization utilities
 */
class QueryOptimizer {
    /**
     * Create optimized pagination query
     */
    static createPaginationQuery(page = 1, limit = 10, maxLimit = 100) {
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
    static createSearchQuery(searchTerm, fields) {
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
    static createDateRangeQuery(field, startDate, endDate) {
        const query = {};
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
exports.QueryOptimizer = QueryOptimizer;
/**
 * Cache utilities for performance optimization
 */
class CacheManager {
    /**
     * Set cache entry
     */
    static set(key, data, ttl = this.defaultTTL) {
        const expiry = Date.now() + ttl;
        this.cache.set(key, { data, expiry });
    }
    /**
     * Get cache entry
     */
    static get(key) {
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
    static delete(key) {
        this.cache.delete(key);
    }
    /**
     * Clear all cache
     */
    static clear() {
        this.cache.clear();
    }
    /**
     * Clean expired entries
     */
    static cleanup() {
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
    static getStats() {
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
exports.CacheManager = CacheManager;
CacheManager.cache = new Map();
CacheManager.defaultTTL = 5 * 60 * 1000; // 5 minutes
/**
 * Memory optimization utilities
 */
class MemoryOptimizer {
    /**
     * Force garbage collection if available
     */
    static forceGC() {
        if (global.gc) {
            global.gc();
        }
    }
    /**
     * Get memory usage statistics
     */
    static getMemoryStats() {
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
    static isMemoryHigh(threshold = 500 * 1024 * 1024) {
        return process.memoryUsage().heapUsed > threshold;
    }
    /**
     * Clean up resources
     */
    static cleanup() {
        CacheManager.cleanup();
        this.forceGC();
    }
}
exports.MemoryOptimizer = MemoryOptimizer;
/**
 * Performance testing utilities
 */
class PerformanceTester {
    /**
     * Measure function execution time
     */
    static async measureTime(fn, label) {
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
    static async loadTest(fn, concurrency = 10, iterations = 100) {
        const startTime = Date.now();
        const results = [];
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
                }
                catch (error) {
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
exports.PerformanceTester = PerformanceTester;
// Automatic cleanup interval
setInterval(() => {
    MemoryOptimizer.cleanup();
}, 10 * 60 * 1000); // Every 10 minutes
//# sourceMappingURL=performance.js.map