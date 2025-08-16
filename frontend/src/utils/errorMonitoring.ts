import { logger } from './logger';

// エラー情報の型定義
export interface ErrorInfo {
  message: string;
  stack?: string;
  componentStack?: string;
  errorBoundary?: string;
  url: string;
  userAgent: string;
  timestamp: string;
  userId?: string;
  sessionId?: string;
  additionalInfo?: any;
}

// エラー統計の型定義
export interface ErrorStats {
  totalErrors: number;
  uniqueErrors: number;
  errorsByType: { [type: string]: number };
  errorsByComponent: { [component: string]: number };
  recentErrors: ErrorInfo[];
  criticalErrors: ErrorInfo[];
}

class ErrorMonitoring {
  private errors: ErrorInfo[] = [];
  private maxErrors = 500;
  private errorCallbacks: ((error: ErrorInfo) => void)[] = [];

  constructor() {
    this.setupGlobalErrorHandlers();
  }

  // グローバルエラーハンドラーの設定
  private setupGlobalErrorHandlers() {
    // JavaScript エラーのキャッチ
    window.addEventListener('error', (event) => {
      this.captureError({
        message: event.message,
        stack: event.error?.stack,
        url: event.filename || window.location.href,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
        additionalInfo: {
          lineno: event.lineno,
          colno: event.colno,
          type: 'javascript',
        },
      });
    });

    // Promise の未処理拒否のキャッチ
    window.addEventListener('unhandledrejection', (event) => {
      this.captureError({
        message: `Unhandled Promise Rejection: ${event.reason}`,
        stack: event.reason?.stack,
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
        additionalInfo: {
          type: 'unhandled-promise',
          reason: event.reason,
        },
      });
    });

    // リソース読み込みエラーのキャッチ
    window.addEventListener('error', (event) => {
      if (event.target !== window) {
        this.captureError({
          message: `Resource loading error: ${(event.target as any)?.src || (event.target as any)?.href}`,
          url: window.location.href,
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString(),
          additionalInfo: {
            type: 'resource',
            element: (event.target as any)?.tagName,
            source: (event.target as any)?.src || (event.target as any)?.href,
          },
        });
      }
    }, true);
  }

  // エラーの記録
  captureError(errorInfo: Partial<ErrorInfo>) {
    const fullErrorInfo: ErrorInfo = {
      message: errorInfo.message || 'Unknown error',
      stack: errorInfo.stack,
      componentStack: errorInfo.componentStack,
      errorBoundary: errorInfo.errorBoundary,
      url: errorInfo.url || window.location.href,
      userAgent: errorInfo.userAgent || navigator.userAgent,
      timestamp: errorInfo.timestamp || new Date().toISOString(),
      userId: errorInfo.userId || this.getCurrentUserId(),
      sessionId: errorInfo.sessionId || this.getCurrentSessionId(),
      additionalInfo: errorInfo.additionalInfo,
    };

    this.errors.push(fullErrorInfo);

    // 最大エラー数を超えた場合、古いものを削除
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(-this.maxErrors);
    }

    // ログに記録
    logger.error(
      fullErrorInfo.message,
      'ErrorMonitoring',
      {
        stack: fullErrorInfo.stack,
        componentStack: fullErrorInfo.componentStack,
        additionalInfo: fullErrorInfo.additionalInfo,
      }
    );

    // コールバック関数の実行
    this.errorCallbacks.forEach(callback => {
      try {
        callback(fullErrorInfo);
      } catch (e) {
        console.error('Error in error callback:', e);
      }
    });

    // 重要なエラーの場合は即座に報告
    if (this.isCriticalError(fullErrorInfo)) {
      this.reportCriticalError(fullErrorInfo);
    }
  }

  // 現在のユーザーIDを取得
  private getCurrentUserId(): string | undefined {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      return user.id;
    } catch {
      return undefined;
    }
  }

  // 現在のセッションIDを取得
  private getCurrentSessionId(): string | undefined {
    const path = window.location.pathname;
    const match = path.match(/\/sessions\/([^\/]+)/);
    return match ? match[1] : undefined;
  }

  // 重要なエラーかどうかの判定
  private isCriticalError(error: ErrorInfo): boolean {
    const criticalPatterns = [
      /network error/i,
      /failed to fetch/i,
      /evaluation.*failed/i,
      /session.*not found/i,
      /authentication.*failed/i,
    ];

    return criticalPatterns.some(pattern => pattern.test(error.message));
  }

  // 重要なエラーの報告
  private reportCriticalError(error: ErrorInfo) {
    // 本番環境では外部サービス（Sentry、LogRocket等）に送信
    if (process.env.NODE_ENV === 'production') {
      // 実際の実装では外部サービスのAPIを呼び出し
      console.error('Critical error reported:', error);
    }
  }

  // エラーコールバックの追加
  onError(callback: (error: ErrorInfo) => void) {
    this.errorCallbacks.push(callback);
  }

  // エラーコールバックの削除
  offError(callback: (error: ErrorInfo) => void) {
    const index = this.errorCallbacks.indexOf(callback);
    if (index > -1) {
      this.errorCallbacks.splice(index, 1);
    }
  }

  // エラー統計の取得
  getErrorStats(): ErrorStats {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    // 最近のエラー（1時間以内）
    const recentErrors = this.errors.filter(
      error => new Date(error.timestamp) > oneHourAgo
    );

    // 重要なエラー
    const criticalErrors = this.errors.filter(error => this.isCriticalError(error));

    // エラータイプ別の集計
    const errorsByType: { [type: string]: number } = {};
    this.errors.forEach(error => {
      const type = error.additionalInfo?.type || 'unknown';
      errorsByType[type] = (errorsByType[type] || 0) + 1;
    });

    // コンポーネント別の集計
    const errorsByComponent: { [component: string]: number } = {};
    this.errors.forEach(error => {
      const component = error.errorBoundary || 'unknown';
      errorsByComponent[component] = (errorsByComponent[component] || 0) + 1;
    });

    // ユニークエラーの計算
    const uniqueErrorMessages = new Set(this.errors.map(error => error.message));

    return {
      totalErrors: this.errors.length,
      uniqueErrors: uniqueErrorMessages.size,
      errorsByType,
      errorsByComponent,
      recentErrors: recentErrors.slice(-20), // 最新20件
      criticalErrors: criticalErrors.slice(-10), // 最新10件
    };
  }

  // 全エラーの取得
  getAllErrors(): ErrorInfo[] {
    return [...this.errors];
  }

  // エラーのクリア
  clearErrors() {
    this.errors = [];
  }

  // エラーレポートの生成
  generateErrorReport(): {
    stats: ErrorStats;
    systemInfo: {
      userAgent: string;
      url: string;
      timestamp: string;
      userId?: string;
      sessionId?: string;
    };
    recentErrors: ErrorInfo[];
  } {
    return {
      stats: this.getErrorStats(),
      systemInfo: {
        userAgent: navigator.userAgent,
        url: window.location.href,
        timestamp: new Date().toISOString(),
        userId: this.getCurrentUserId(),
        sessionId: this.getCurrentSessionId(),
      },
      recentErrors: this.errors.slice(-50), // 最新50件
    };
  }
}

// React Error Boundary用のエラーハンドラー
export function captureComponentError(
  error: Error,
  errorInfo: { componentStack: string },
  errorBoundary?: string
) {
  errorMonitoring.captureError({
    message: error.message,
    stack: error.stack,
    componentStack: errorInfo.componentStack,
    errorBoundary,
    additionalInfo: {
      type: 'react-component',
    },
  });
}

// API エラー用のヘルパー関数
export function captureApiError(
  error: any,
  context: {
    url: string;
    method: string;
    status?: number;
    operation: string;
  }
) {
  errorMonitoring.captureError({
    message: `API Error: ${context.operation} - ${error.message}`,
    stack: error.stack,
    additionalInfo: {
      type: 'api',
      url: context.url,
      method: context.method,
      status: context.status || error.response?.status,
      operation: context.operation,
      responseData: error.response?.data,
    },
  });
}

// シングルトンインスタンス
export const errorMonitoring = new ErrorMonitoring();