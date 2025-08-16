// ログレベルの定義
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

// ログエントリの型定義
export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: string;
  data?: any;
  userId?: string;
  sessionId?: string;
  userAgent: string;
  url: string;
  stackTrace?: string;
}

// パフォーマンスメトリクスの型定義
export interface PerformanceMetrics {
  timestamp: string;
  operation: string;
  duration: number;
  success: boolean;
  errorMessage?: string;
  userId?: string;
  sessionId?: string;
  additionalData?: any;
}

class Logger {
  private logs: LogEntry[] = [];
  private performanceMetrics: PerformanceMetrics[] = [];
  private maxLogEntries = 1000;
  private maxMetricsEntries = 500;
  private currentLogLevel = LogLevel.INFO;

  constructor() {
    // 本番環境では警告レベル以上のみログ
    if (process.env.NODE_ENV === 'production') {
      this.currentLogLevel = LogLevel.WARN;
    }
  }

  // ログレベルの設定
  setLogLevel(level: LogLevel) {
    this.currentLogLevel = level;
  }

  // ログエントリの作成
  private createLogEntry(
    level: LogLevel,
    message: string,
    context?: string,
    data?: any,
    error?: Error
  ): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      data,
      userId: this.getCurrentUserId(),
      sessionId: this.getCurrentSessionId(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      stackTrace: error?.stack,
    };
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

  // ログの追加
  private addLog(entry: LogEntry) {
    if (entry.level >= this.currentLogLevel) {
      this.logs.push(entry);
      
      // 最大エントリ数を超えた場合、古いものを削除
      if (this.logs.length > this.maxLogEntries) {
        this.logs = this.logs.slice(-this.maxLogEntries);
      }

      // コンソールにも出力
      this.outputToConsole(entry);
    }
  }

  // コンソール出力
  private outputToConsole(entry: LogEntry) {
    const logMessage = `[${entry.timestamp}] ${LogLevel[entry.level]} ${entry.context ? `[${entry.context}]` : ''} ${entry.message}`;
    
    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(logMessage, entry.data);
        break;
      case LogLevel.INFO:
        console.info(logMessage, entry.data);
        break;
      case LogLevel.WARN:
        console.warn(logMessage, entry.data);
        break;
      case LogLevel.ERROR:
        console.error(logMessage, entry.data, entry.stackTrace);
        break;
    }
  }

  // デバッグログ
  debug(message: string, context?: string, data?: any) {
    this.addLog(this.createLogEntry(LogLevel.DEBUG, message, context, data));
  }

  // 情報ログ
  info(message: string, context?: string, data?: any) {
    this.addLog(this.createLogEntry(LogLevel.INFO, message, context, data));
  }

  // 警告ログ
  warn(message: string, context?: string, data?: any) {
    this.addLog(this.createLogEntry(LogLevel.WARN, message, context, data));
  }

  // エラーログ
  error(message: string, context?: string, data?: any, error?: Error) {
    this.addLog(this.createLogEntry(LogLevel.ERROR, message, context, data, error));
  }

  // パフォーマンスメトリクスの記録
  recordPerformance(
    operation: string,
    startTime: number,
    success: boolean,
    errorMessage?: string,
    additionalData?: any
  ) {
    const duration = performance.now() - startTime;
    const metric: PerformanceMetrics = {
      timestamp: new Date().toISOString(),
      operation,
      duration,
      success,
      errorMessage,
      userId: this.getCurrentUserId(),
      sessionId: this.getCurrentSessionId(),
      additionalData,
    };

    this.performanceMetrics.push(metric);

    // 最大エントリ数を超えた場合、古いものを削除
    if (this.performanceMetrics.length > this.maxMetricsEntries) {
      this.performanceMetrics = this.performanceMetrics.slice(-this.maxMetricsEntries);
    }

    // パフォーマンス情報をログに記録
    if (success) {
      this.info(`Operation completed: ${operation} (${duration.toFixed(2)}ms)`, 'Performance', additionalData);
    } else {
      this.warn(`Operation failed: ${operation} (${duration.toFixed(2)}ms) - ${errorMessage}`, 'Performance', additionalData);
    }
  }

  // ログの取得
  getLogs(level?: LogLevel, context?: string, limit?: number): LogEntry[] {
    let filteredLogs = this.logs;

    if (level !== undefined) {
      filteredLogs = filteredLogs.filter(log => log.level >= level);
    }

    if (context) {
      filteredLogs = filteredLogs.filter(log => log.context === context);
    }

    if (limit) {
      filteredLogs = filteredLogs.slice(-limit);
    }

    return filteredLogs;
  }

  // パフォーマンスメトリクスの取得
  getPerformanceMetrics(operation?: string, limit?: number): PerformanceMetrics[] {
    let filteredMetrics = this.performanceMetrics;

    if (operation) {
      filteredMetrics = filteredMetrics.filter(metric => metric.operation === operation);
    }

    if (limit) {
      filteredMetrics = filteredMetrics.slice(-limit);
    }

    return filteredMetrics;
  }

  // 診断情報の生成
  generateDiagnosticReport(): {
    logs: LogEntry[];
    performanceMetrics: PerformanceMetrics[];
    systemInfo: {
      userAgent: string;
      url: string;
      timestamp: string;
      userId?: string;
      sessionId?: string;
      memoryUsage?: any;
      connectionType?: string;
    };
    summary: {
      totalLogs: number;
      errorCount: number;
      warningCount: number;
      averagePerformance: { [operation: string]: number };
      slowOperations: PerformanceMetrics[];
    };
  } {
    const errorLogs = this.logs.filter(log => log.level === LogLevel.ERROR);
    const warningLogs = this.logs.filter(log => log.level === LogLevel.WARN);

    // 操作別の平均パフォーマンス
    const performanceByOperation: { [operation: string]: number[] } = {};
    this.performanceMetrics.forEach(metric => {
      if (!performanceByOperation[metric.operation]) {
        performanceByOperation[metric.operation] = [];
      }
      performanceByOperation[metric.operation].push(metric.duration);
    });

    const averagePerformance: { [operation: string]: number } = {};
    Object.keys(performanceByOperation).forEach(operation => {
      const durations = performanceByOperation[operation];
      averagePerformance[operation] = durations.reduce((a, b) => a + b, 0) / durations.length;
    });

    // 遅い操作（3秒以上）
    const slowOperations = this.performanceMetrics.filter(metric => metric.duration > 3000);

    return {
      logs: this.logs.slice(-100), // 最新100件
      performanceMetrics: this.performanceMetrics.slice(-50), // 最新50件
      systemInfo: {
        userAgent: navigator.userAgent,
        url: window.location.href,
        timestamp: new Date().toISOString(),
        userId: this.getCurrentUserId(),
        sessionId: this.getCurrentSessionId(),
        memoryUsage: (performance as any).memory ? {
          usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
          totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
          jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit,
        } : undefined,
        connectionType: (navigator as any).connection?.effectiveType,
      },
      summary: {
        totalLogs: this.logs.length,
        errorCount: errorLogs.length,
        warningCount: warningLogs.length,
        averagePerformance,
        slowOperations,
      },
    };
  }

  // ログのクリア
  clearLogs() {
    this.logs = [];
    this.performanceMetrics = [];
  }

  // ログのエクスポート（JSON形式）
  exportLogs(): string {
    return JSON.stringify(this.generateDiagnosticReport(), null, 2);
  }
}

// シングルトンインスタンス
export const logger = new Logger();

// パフォーマンス測定用のデコレータ関数
export function measurePerformance(operationName: string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const startTime = performance.now();
      let success = true;
      let errorMessage: string | undefined;

      try {
        const result = await method.apply(this, args);
        return result;
      } catch (error: any) {
        success = false;
        errorMessage = error.message;
        throw error;
      } finally {
        logger.recordPerformance(operationName, startTime, success, errorMessage, {
          args: args.length,
          method: propertyName,
        });
      }
    };
  };
}

// パフォーマンス測定用のヘルパー関数
export function withPerformanceTracking<T>(
  operationName: string,
  operation: () => Promise<T>,
  additionalData?: any
): Promise<T> {
  const startTime = performance.now();
  
  return operation()
    .then(result => {
      logger.recordPerformance(operationName, startTime, true, undefined, additionalData);
      return result;
    })
    .catch(error => {
      logger.recordPerformance(operationName, startTime, false, error.message, additionalData);
      throw error;
    });
}