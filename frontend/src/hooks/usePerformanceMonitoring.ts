import React, { useState, useEffect, useRef } from 'react';
import { logger } from '../utils/logger';

export interface PerformanceMetrics {
  loadTime: number;
  renderTime: number;
  interactionTime: number;
  cacheHitRate: number;
  errorRate: number;
}

export interface PerformanceThresholds {
  loadTime: number;
  renderTime: number;
  interactionTime: number;
}

const DEFAULT_THRESHOLDS: PerformanceThresholds = {
  loadTime: 3000,    // 3秒
  renderTime: 100,   // 100ms
  interactionTime: 50, // 50ms
};

export function usePerformanceMonitoring(
  componentName: string,
  thresholds: Partial<PerformanceThresholds> = {}
) {
  const [metrics, setMetrics] = useState<Partial<PerformanceMetrics>>({});
  const [isSlowLoading, setIsSlowLoading] = useState(false);
  const startTimeRef = useRef<number>(performance.now());
  const renderStartRef = useRef<number>(0);
  const interactionCountRef = useRef<number>(0);
  const errorCountRef = useRef<number>(0);
  const cacheHitsRef = useRef<number>(0);
  const cacheMissesRef = useRef<number>(0);

  const finalThresholds = { ...DEFAULT_THRESHOLDS, ...thresholds };

  // コンポーネントマウント時の初期化
  useEffect(() => {
    startTimeRef.current = performance.now();
    renderStartRef.current = performance.now();
    
    logger.debug(`パフォーマンス監視開始: ${componentName}`, 'PerformanceMonitor');
    
    return () => {
      const totalTime = performance.now() - startTimeRef.current;
      logger.info(`パフォーマンス監視終了: ${componentName}`, 'PerformanceMonitor', {
        totalTime,
        metrics: metrics,
      });
    };
  }, [componentName]);

  // レンダリング時間の測定
  useEffect(() => {
    const renderTime = performance.now() - renderStartRef.current;
    
    setMetrics(prev => ({
      ...prev,
      renderTime,
    }));

    if (renderTime > finalThresholds.renderTime) {
      logger.warn(`遅いレンダリング検出: ${componentName}`, 'PerformanceMonitor', {
        renderTime,
        threshold: finalThresholds.renderTime,
      });
    }
  });

  // ローディング完了の記録
  const recordLoadComplete = () => {
    const loadTime = performance.now() - startTimeRef.current;
    
    setMetrics(prev => ({
      ...prev,
      loadTime,
    }));

    setIsSlowLoading(loadTime > finalThresholds.loadTime);

    if (loadTime > finalThresholds.loadTime) {
      logger.warn(`遅いローディング検出: ${componentName}`, 'PerformanceMonitor', {
        loadTime,
        threshold: finalThresholds.loadTime,
      });
    } else {
      logger.debug(`ローディング完了: ${componentName}`, 'PerformanceMonitor', {
        loadTime,
      });
    }
  };

  // インタラクション時間の記録
  const recordInteraction = (interactionName: string) => {
    const interactionStart = performance.now();
    interactionCountRef.current++;

    return () => {
      const interactionTime = performance.now() - interactionStart;
      
      setMetrics(prev => ({
        ...prev,
        interactionTime: (prev.interactionTime || 0 + interactionTime) / 2, // 平均値
      }));

      if (interactionTime > finalThresholds.interactionTime) {
        logger.warn(`遅いインタラクション検出: ${componentName}`, 'PerformanceMonitor', {
          interactionName,
          interactionTime,
          threshold: finalThresholds.interactionTime,
        });
      }
    };
  };

  // エラーの記録
  const recordError = (error: Error, context?: any) => {
    errorCountRef.current++;
    
    const errorRate = errorCountRef.current / (interactionCountRef.current || 1);
    
    setMetrics(prev => ({
      ...prev,
      errorRate,
    }));

    logger.error(`エラー記録: ${componentName}`, 'PerformanceMonitor', {
      error: error.message,
      errorRate,
      context,
    });
  };

  // キャッシュヒット/ミスの記録
  const recordCacheHit = () => {
    cacheHitsRef.current++;
    updateCacheHitRate();
  };

  const recordCacheMiss = () => {
    cacheMissesRef.current++;
    updateCacheHitRate();
  };

  const updateCacheHitRate = () => {
    const total = cacheHitsRef.current + cacheMissesRef.current;
    const hitRate = total > 0 ? cacheHitsRef.current / total : 0;
    
    setMetrics(prev => ({
      ...prev,
      cacheHitRate: hitRate,
    }));
  };

  // パフォーマンス警告の生成
  const getPerformanceWarnings = (): string[] => {
    const warnings: string[] = [];
    
    if (metrics.loadTime && metrics.loadTime > finalThresholds.loadTime) {
      warnings.push(`ローディング時間が遅い (${Math.round(metrics.loadTime)}ms)`);
    }
    
    if (metrics.renderTime && metrics.renderTime > finalThresholds.renderTime) {
      warnings.push(`レンダリング時間が遅い (${Math.round(metrics.renderTime)}ms)`);
    }
    
    if (metrics.interactionTime && metrics.interactionTime > finalThresholds.interactionTime) {
      warnings.push(`インタラクション応答が遅い (${Math.round(metrics.interactionTime)}ms)`);
    }
    
    if (metrics.errorRate && metrics.errorRate > 0.1) {
      warnings.push(`エラー率が高い (${Math.round(metrics.errorRate * 100)}%)`);
    }
    
    if (metrics.cacheHitRate && metrics.cacheHitRate < 0.7) {
      warnings.push(`キャッシュヒット率が低い (${Math.round(metrics.cacheHitRate * 100)}%)`);
    }
    
    return warnings;
  };

  // パフォーマンス推奨事項の生成
  const getPerformanceRecommendations = (): string[] => {
    const recommendations: string[] = [];
    
    if (isSlowLoading) {
      recommendations.push('データのプリロードやキャッシュの活用を検討してください');
    }
    
    if (metrics.cacheHitRate && metrics.cacheHitRate < 0.5) {
      recommendations.push('キャッシュ戦略の見直しを検討してください');
    }
    
    if (metrics.errorRate && metrics.errorRate > 0.05) {
      recommendations.push('エラーハンドリングの改善を検討してください');
    }
    
    return recommendations;
  };

  return {
    metrics,
    isSlowLoading,
    recordLoadComplete,
    recordInteraction,
    recordError,
    recordCacheHit,
    recordCacheMiss,
    getPerformanceWarnings,
    getPerformanceRecommendations,
  };
}

// パフォーマンス監視用のHOC
export function withPerformanceMonitoring<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  componentName: string,
  thresholds?: Partial<PerformanceThresholds>
): React.ComponentType<P> {
  return function PerformanceMonitoredComponent(props: P) {
    const performanceMonitor = usePerformanceMonitoring(componentName, thresholds);
    
    React.useEffect(() => {
      performanceMonitor.recordLoadComplete();
    }, [performanceMonitor]);

    return React.createElement(WrappedComponent, props);
  };
}