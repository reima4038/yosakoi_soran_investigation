import { apiClient } from './api';
import { logger } from './logger';
import { captureApiError } from './errorMonitoring';

// タイムアウト設定
export interface TimeoutConfig {
  default: number;
  evaluation: number;
  submission: number;
  upload: number;
  retry: number;
  background: number;
}

const TIMEOUT_CONFIG: TimeoutConfig = {
  default: 10000,    // 10秒
  evaluation: 15000, // 15秒（評価データは大きい可能性）
  submission: 25000, // 25秒（提出は重要な操作、少し長めに）
  upload: 60000,     // 60秒（ファイルアップロード）
  retry: 8000,       // 8秒（リトライ時は短めに）
  background: 30000, // 30秒（バックグラウンド処理）
};

// 動的タイムアウト計算
export function calculateDynamicTimeout(
  baseTimeout: number,
  options: {
    retryCount?: number;
    networkSpeed?: 'slow' | 'normal' | 'fast';
    dataSize?: 'small' | 'medium' | 'large';
  } = {}
): number {
  const { retryCount = 0, networkSpeed = 'normal', dataSize = 'medium' } = options;
  
  let timeout = baseTimeout;
  
  // リトライ回数に応じてタイムアウトを調整
  if (retryCount > 0) {
    timeout = Math.max(timeout * 0.8, 5000); // リトライ時は短めに、最低5秒
  }
  
  // ネットワーク速度に応じて調整
  switch (networkSpeed) {
    case 'slow':
      timeout *= 2;
      break;
    case 'fast':
      timeout *= 0.7;
      break;
  }
  
  // データサイズに応じて調整
  switch (dataSize) {
    case 'large':
      timeout *= 1.5;
      break;
    case 'small':
      timeout *= 0.8;
      break;
  }
  
  return Math.min(timeout, 60000); // 最大60秒
}

// リクエストタイプ
export type RequestType = keyof TimeoutConfig;

// タイムアウト付きリクエストの実行
export async function requestWithTimeout<T>(
  requestFn: () => Promise<T>,
  timeout: number,
  operation: string,
  context?: any
): Promise<T> {
  const startTime = performance.now();
  
  return new Promise<T>((resolve, reject) => {
    let isResolved = false;
    
    // タイムアウトタイマー
    const timeoutId = setTimeout(() => {
      if (!isResolved) {
        isResolved = true;
        const duration = performance.now() - startTime;
        
        const timeoutError = new Error(`Request timeout after ${timeout}ms`);
        timeoutError.name = 'TimeoutError';
        
        // タイムアウトエラーをログに記録
        logger.error(`Request timeout: ${operation}`, 'ApiTimeout', {
          timeout,
          duration,
          operation,
          context,
        });
        
        // エラー監視に記録
        captureApiError(timeoutError, {
          url: context?.url || 'unknown',
          method: context?.method || 'unknown',
          operation,
        });
        
        reject(timeoutError);
      }
    }, timeout);

    // 実際のリクエスト実行
    requestFn()
      .then(result => {
        if (!isResolved) {
          isResolved = true;
          clearTimeout(timeoutId);
          
          const duration = performance.now() - startTime;
          logger.debug(`Request completed: ${operation}`, 'ApiTimeout', {
            duration,
            operation,
            context,
          });
          
          resolve(result);
        }
      })
      .catch(error => {
        if (!isResolved) {
          isResolved = true;
          clearTimeout(timeoutId);
          
          const duration = performance.now() - startTime;
          logger.warn(`Request failed: ${operation}`, 'ApiTimeout', {
            duration,
            operation,
            error: error.message,
            context,
          });
          
          reject(error);
        }
      });
  });
}

// 拡張されたAPIクライアント
export class EnhancedApiClient {
  /**
   * タイムアウト付きGETリクエスト
   */
  async get<T>(
    url: string,
    config?: any,
    requestType: RequestType = 'default'
  ): Promise<T> {
    const timeout = TIMEOUT_CONFIG[requestType];
    
    return requestWithTimeout(
      () => apiClient.get<T>(url, config),
      timeout,
      `GET ${url}`,
      { url, method: 'GET', config }
    );
  }

  /**
   * タイムアウト付きPOSTリクエスト
   */
  async post<T>(
    url: string,
    data?: any,
    config?: any,
    requestType: RequestType = 'default'
  ): Promise<T> {
    const timeout = TIMEOUT_CONFIG[requestType];
    
    return requestWithTimeout(
      () => apiClient.post<T>(url, data, config),
      timeout,
      `POST ${url}`,
      { url, method: 'POST', data, config }
    );
  }

  /**
   * タイムアウト付きPUTリクエスト
   */
  async put<T>(
    url: string,
    data?: any,
    config?: any,
    requestType: RequestType = 'default'
  ): Promise<T> {
    const timeout = TIMEOUT_CONFIG[requestType];
    
    return requestWithTimeout(
      () => apiClient.put<T>(url, data, config),
      timeout,
      `PUT ${url}`,
      { url, method: 'PUT', data, config }
    );
  }

  /**
   * タイムアウト付きDELETEリクエスト
   */
  async delete<T>(
    url: string,
    config?: any,
    requestType: RequestType = 'default'
  ): Promise<T> {
    const timeout = TIMEOUT_CONFIG[requestType];
    
    return requestWithTimeout(
      () => apiClient.delete<T>(url, config),
      timeout,
      `DELETE ${url}`,
      { url, method: 'DELETE', config }
    );
  }

  /**
   * 複数のリクエストを並列実行（タイムアウト付き）
   */
  async parallel<T>(
    requests: Array<() => Promise<T>>,
    timeout: number = TIMEOUT_CONFIG.default
  ): Promise<T[]> {
    return requestWithTimeout(
      () => Promise.all(requests.map(req => req())),
      timeout,
      'Parallel requests',
      { requestCount: requests.length }
    );
  }

  /**
   * リクエストのリトライ（指数バックオフ付き）
   */
  async withRetry<T>(
    requestFn: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000,
    operation: string = 'unknown'
  ): Promise<T> {
    let lastError: any;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await requestFn();
        
        if (attempt > 0) {
          logger.info(`Request succeeded after ${attempt} retries: ${operation}`, 'ApiRetry');
        }
        
        return result;
      } catch (error: any) {
        lastError = error;
        
        // 最後の試行の場合はエラーを投げる
        if (attempt === maxRetries) {
          logger.error(`Request failed after ${maxRetries} retries: ${operation}`, 'ApiRetry', {
            error: error.message,
            attempts: attempt + 1,
          });
          break;
        }

        // リトライ可能なエラーかチェック
        if (!this.isRetryableError(error)) {
          logger.warn(`Non-retryable error for ${operation}:`, 'ApiRetry', {
            error: error.message,
            status: error.response?.status,
          });
          break;
        }

        // 指数バックオフで遅延
        const delay = baseDelay * Math.pow(2, attempt);
        logger.info(`Retrying ${operation} in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`, 'ApiRetry');
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError;
  }

  /**
   * エラーがリトライ可能かチェック
   */
  private isRetryableError(error: any): boolean {
    // ネットワークエラーはリトライ可能
    if (!error.response) return true;
    
    const status = error.response.status;
    
    // 5xx エラーはリトライ可能
    if (status >= 500) return true;
    
    // 429 (Too Many Requests) はリトライ可能
    if (status === 429) return true;
    
    // 408 (Request Timeout) はリトライ可能
    if (status === 408) return true;
    
    // その他のクライアントエラー（4xx）はリトライ不可
    return false;
  }

  /**
   * リクエストのキャンセル機能
   */
  createCancellableRequest<T>(
    requestFn: (signal: AbortSignal) => Promise<T>
  ): {
    promise: Promise<T>;
    cancel: () => void;
  } {
    const controller = new AbortController();
    
    const promise = requestFn(controller.signal).catch(error => {
      if (error.name === 'AbortError') {
        logger.info('Request was cancelled', 'ApiCancel');
        throw new Error('Request cancelled');
      }
      throw error;
    });

    return {
      promise,
      cancel: () => {
        controller.abort();
        logger.info('Request cancelled by user', 'ApiCancel');
      },
    };
  }
}

// 拡張されたAPIクライアントのインスタンス
export const enhancedApiClient = new EnhancedApiClient();

// パフォーマンス最適化されたリクエストヘルパー
export async function optimizedRequest<T>(
  cacheKey: string,
  requestFn: () => Promise<T>,
  options: {
    cache?: boolean;
    cacheTtl?: number;
    timeout?: number;
    requestType?: RequestType;
    maxRetries?: number;
    forceRefresh?: boolean;
    networkSpeed?: 'slow' | 'normal' | 'fast';
    dataSize?: 'small' | 'medium' | 'large';
    priority?: 'low' | 'normal' | 'high';
  } = {}
): Promise<T> {
  const {
    cache = true,
    cacheTtl,
    timeout,
    requestType = 'default',
    maxRetries = 2,
    forceRefresh = false,
    networkSpeed = 'normal',
    dataSize = 'medium',
    priority = 'normal',
  } = options;

  // 動的タイムアウト計算
  const baseTimeout = timeout || TIMEOUT_CONFIG[requestType];
  const dynamicTimeout = calculateDynamicTimeout(baseTimeout, {
    networkSpeed,
    dataSize,
  });

  // 優先度に応じたリトライ設定
  const priorityMaxRetries = priority === 'high' ? maxRetries + 1 : 
                            priority === 'low' ? Math.max(maxRetries - 1, 1) : 
                            maxRetries;

  // キャッシュを使用する場合
  if (cache) {
    const { evaluationCache } = await import('./cache');
    
    return evaluationCache.getWithRevalidation(
      cacheKey,
      () => enhancedApiClient.withRetry(
        () => {
          const retryTimeout = calculateDynamicTimeout(dynamicTimeout, { retryCount: 1 });
          return requestWithTimeout(requestFn, retryTimeout, `Cached ${cacheKey}`);
        },
        priorityMaxRetries,
        1000,
        cacheKey
      ),
      {
        ttl: cacheTtl,
        forceRefresh,
        maxStaleAge: priority === 'high' ? 30000 : 60000, // 高優先度は新鮮なデータを要求
      }
    );
  }

  // キャッシュを使用しない場合
  return enhancedApiClient.withRetry(
    () => requestWithTimeout(requestFn, dynamicTimeout, cacheKey),
    priorityMaxRetries,
    1000,
    cacheKey
  );
}

// プリロード機能
export async function preloadData<T>(
  cacheKey: string,
  requestFn: () => Promise<T>,
  options: {
    cacheTtl?: number;
    priority?: 'low' | 'normal' | 'high';
  } = {}
): Promise<void> {
  const { cacheTtl = 10 * 60 * 1000, priority = 'low' } = options;
  
  try {
    logger.debug(`プリロード開始: ${cacheKey}`, 'PreloadService');
    
    await optimizedRequest(
      cacheKey,
      requestFn,
      {
        cache: true,
        cacheTtl,
        timeout: TIMEOUT_CONFIG.background,
        maxRetries: 1,
        priority,
        networkSpeed: 'normal',
        dataSize: 'medium',
      }
    );
    
    logger.debug(`プリロード完了: ${cacheKey}`, 'PreloadService');
  } catch (error) {
    logger.warn(`プリロード失敗: ${cacheKey}`, 'PreloadService', { error });
    // プリロードの失敗は無視（バックグラウンド処理のため）
  }
}

// バッチリクエスト処理
export async function batchOptimizedRequests<T>(
  requests: Array<{
    cacheKey: string;
    requestFn: () => Promise<T>;
    options?: Parameters<typeof optimizedRequest>[2];
  }>,
  options: {
    concurrency?: number;
    failFast?: boolean;
  } = {}
): Promise<Array<T | Error>> {
  const { concurrency = 3, failFast = false } = options;
  
  const results: Array<T | Error> = [];
  
  // 並行実行制御
  for (let i = 0; i < requests.length; i += concurrency) {
    const batch = requests.slice(i, i + concurrency);
    
    const batchPromises = batch.map(async ({ cacheKey, requestFn, options: reqOptions }) => {
      try {
        return await optimizedRequest(cacheKey, requestFn, reqOptions);
      } catch (error) {
        if (failFast) throw error;
        return error as Error;
      }
    });
    
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
    
    // 失敗時の早期終了
    if (failFast && batchResults.some(result => result instanceof Error)) {
      break;
    }
  }
  
  return results;
}