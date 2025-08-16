import { logger, LogLevel, withPerformanceTracking } from '../logger';

// Mock performance.now
const mockPerformanceNow = jest.fn();
Object.defineProperty(global, 'performance', {
  value: {
    now: mockPerformanceNow,
  },
});

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(global, 'localStorage', {
  value: mockLocalStorage,
});

// Mock window.location
Object.defineProperty(global, 'window', {
  value: {
    location: {
      href: 'http://localhost:3000/test',
      pathname: '/test',
    },
  },
});

// Mock navigator
Object.defineProperty(global, 'navigator', {
  value: {
    userAgent: 'Test User Agent',
  },
});

describe('Logger', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    logger.clearLogs();
    mockPerformanceNow.mockReturnValue(1000);
    mockLocalStorage.getItem.mockReturnValue(null);
  });

  describe('Basic Logging', () => {
    it('should log debug messages', () => {
      const consoleSpy = jest.spyOn(console, 'debug').mockImplementation();
      
      logger.setLogLevel(LogLevel.DEBUG);
      logger.debug('Debug message', 'TestContext', { key: 'value' });

      const logs = logger.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].level).toBe(LogLevel.DEBUG);
      expect(logs[0].message).toBe('Debug message');
      expect(logs[0].context).toBe('TestContext');
      expect(logs[0].data).toEqual({ key: 'value' });

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should log info messages', () => {
      const consoleSpy = jest.spyOn(console, 'info').mockImplementation();
      
      logger.info('Info message', 'TestContext');

      const logs = logger.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].level).toBe(LogLevel.INFO);
      expect(logs[0].message).toBe('Info message');

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should log warning messages', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      logger.warn('Warning message', 'TestContext');

      const logs = logger.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].level).toBe(LogLevel.WARN);
      expect(logs[0].message).toBe('Warning message');

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should log error messages with stack trace', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const error = new Error('Test error');
      
      logger.error('Error message', 'TestContext', { key: 'value' }, error);

      const logs = logger.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].level).toBe(LogLevel.ERROR);
      expect(logs[0].message).toBe('Error message');
      expect(logs[0].stackTrace).toBe(error.stack);

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('Log Level Filtering', () => {
    it('should respect log level settings', () => {
      logger.setLogLevel(LogLevel.WARN);

      logger.debug('Debug message');
      logger.info('Info message');
      logger.warn('Warning message');
      logger.error('Error message');

      const logs = logger.getLogs();
      expect(logs).toHaveLength(2); // Only WARN and ERROR
      expect(logs[0].level).toBe(LogLevel.WARN);
      expect(logs[1].level).toBe(LogLevel.ERROR);
    });

    it('should filter logs by level when retrieving', () => {
      logger.setLogLevel(LogLevel.DEBUG);

      logger.debug('Debug message');
      logger.info('Info message');
      logger.warn('Warning message');
      logger.error('Error message');

      const errorLogs = logger.getLogs(LogLevel.ERROR);
      expect(errorLogs).toHaveLength(1);
      expect(errorLogs[0].level).toBe(LogLevel.ERROR);

      const warnAndAbove = logger.getLogs(LogLevel.WARN);
      expect(warnAndAbove).toHaveLength(2);
    });

    it('should filter logs by context', () => {
      logger.info('Message 1', 'Context1');
      logger.info('Message 2', 'Context2');
      logger.info('Message 3', 'Context1');

      const context1Logs = logger.getLogs(undefined, 'Context1');
      expect(context1Logs).toHaveLength(2);
      expect(context1Logs.every(log => log.context === 'Context1')).toBe(true);
    });

    it('should limit logs when specified', () => {
      for (let i = 0; i < 10; i++) {
        logger.info(`Message ${i}`);
      }

      const limitedLogs = logger.getLogs(undefined, undefined, 5);
      expect(limitedLogs).toHaveLength(5);
    });
  });

  describe('Performance Tracking', () => {
    it('should record performance metrics', () => {
      mockPerformanceNow.mockReturnValueOnce(1000).mockReturnValueOnce(1500);

      logger.recordPerformance('testOperation', 1000, true, undefined, { key: 'value' });

      const metrics = logger.getPerformanceMetrics();
      expect(metrics).toHaveLength(1);
      expect(metrics[0].operation).toBe('testOperation');
      expect(metrics[0].duration).toBe(500);
      expect(metrics[0].success).toBe(true);
      expect(metrics[0].additionalData).toEqual({ key: 'value' });
    });

    it('should record failed operations', () => {
      mockPerformanceNow.mockReturnValueOnce(1000).mockReturnValueOnce(1200);

      logger.recordPerformance('failedOperation', 1000, false, 'Operation failed');

      const metrics = logger.getPerformanceMetrics();
      expect(metrics).toHaveLength(1);
      expect(metrics[0].success).toBe(false);
      expect(metrics[0].errorMessage).toBe('Operation failed');
    });

    it('should filter performance metrics by operation', () => {
      logger.recordPerformance('operation1', 1000, true);
      logger.recordPerformance('operation2', 1000, true);
      logger.recordPerformance('operation1', 1000, true);

      const operation1Metrics = logger.getPerformanceMetrics('operation1');
      expect(operation1Metrics).toHaveLength(2);
      expect(operation1Metrics.every(m => m.operation === 'operation1')).toBe(true);
    });
  });

  describe('User and Session Context', () => {
    it('should include user ID from localStorage', () => {
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify({ id: 'user123' }));

      logger.info('Test message');

      const logs = logger.getLogs();
      expect(logs[0].userId).toBe('user123');
    });

    it('should extract session ID from URL', () => {
      Object.defineProperty(global, 'window', {
        value: {
          location: {
            href: 'http://localhost:3000/sessions/session123/evaluate',
            pathname: '/sessions/session123/evaluate',
          },
        },
      });

      logger.info('Test message');

      const logs = logger.getLogs();
      expect(logs[0].sessionId).toBe('session123');
    });

    it('should handle missing user data gracefully', () => {
      mockLocalStorage.getItem.mockImplementation(() => {
        throw new Error('Storage error');
      });

      logger.info('Test message');

      const logs = logger.getLogs();
      expect(logs[0].userId).toBeUndefined();
    });
  });

  describe('Diagnostic Report', () => {
    it('should generate comprehensive diagnostic report', () => {
      // Add some logs and metrics
      logger.info('Info message');
      logger.warn('Warning message');
      logger.error('Error message');
      logger.recordPerformance('testOp', 1000, true);
      logger.recordPerformance('slowOp', 1000, true, undefined, { duration: 4000 });

      mockPerformanceNow.mockReturnValue(5000);

      const report = logger.generateDiagnosticReport();

      expect(report.logs).toHaveLength(3);
      expect(report.performanceMetrics).toHaveLength(2);
      expect(report.systemInfo.userAgent).toBe('Test User Agent');
      expect(report.systemInfo.url).toBe('http://localhost:3000/test');
      expect(report.summary.totalLogs).toBe(3);
      expect(report.summary.errorCount).toBe(1);
      expect(report.summary.warningCount).toBe(1);
    });

    it('should calculate average performance correctly', () => {
      logger.recordPerformance('operation1', 1000, true);
      mockPerformanceNow.mockReturnValue(1500);
      logger.recordPerformance('operation1', 1000, true);
      mockPerformanceNow.mockReturnValue(2000);
      logger.recordPerformance('operation1', 1000, true);

      const report = logger.generateDiagnosticReport();
      expect(report.summary.averagePerformance.operation1).toBe(1000); // (500 + 1000 + 1500) / 3
    });

    it('should identify slow operations', () => {
      mockPerformanceNow.mockReturnValue(4500);
      logger.recordPerformance('slowOperation', 1000, true);

      const report = logger.generateDiagnosticReport();
      expect(report.summary.slowOperations).toHaveLength(1);
      expect(report.summary.slowOperations[0].operation).toBe('slowOperation');
    });
  });

  describe('Log Management', () => {
    it('should limit maximum log entries', () => {
      // Add more logs than the maximum
      for (let i = 0; i < 1200; i++) {
        logger.info(`Message ${i}`);
      }

      const logs = logger.getLogs();
      expect(logs.length).toBeLessThanOrEqual(1000); // Default max is 1000
    });

    it('should clear all logs', () => {
      logger.info('Message 1');
      logger.warn('Message 2');
      logger.recordPerformance('test', 1000, true);

      logger.clearLogs();

      expect(logger.getLogs()).toHaveLength(0);
      expect(logger.getPerformanceMetrics()).toHaveLength(0);
    });

    it('should export logs as JSON', () => {
      logger.info('Test message');
      logger.recordPerformance('test', 1000, true);

      const exported = logger.exportLogs();
      const parsed = JSON.parse(exported);

      expect(parsed.logs).toBeDefined();
      expect(parsed.performanceMetrics).toBeDefined();
      expect(parsed.systemInfo).toBeDefined();
      expect(parsed.summary).toBeDefined();
    });
  });
});

describe('withPerformanceTracking', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    logger.clearLogs();
    mockPerformanceNow.mockReturnValue(1000);
  });

  it('should track successful operations', async () => {
    const mockOperation = jest.fn().mockResolvedValue('success');
    mockPerformanceNow.mockReturnValueOnce(1000).mockReturnValueOnce(1500);

    const result = await withPerformanceTracking('testOperation', mockOperation, { key: 'value' });

    expect(result).toBe('success');
    expect(mockOperation).toHaveBeenCalled();

    const metrics = logger.getPerformanceMetrics();
    expect(metrics).toHaveLength(1);
    expect(metrics[0].operation).toBe('testOperation');
    expect(metrics[0].duration).toBe(500);
    expect(metrics[0].success).toBe(true);
    expect(metrics[0].additionalData).toEqual({ key: 'value' });
  });

  it('should track failed operations', async () => {
    const error = new Error('Operation failed');
    const mockOperation = jest.fn().mockRejectedValue(error);
    mockPerformanceNow.mockReturnValueOnce(1000).mockReturnValueOnce(1300);

    await expect(
      withPerformanceTracking('failedOperation', mockOperation)
    ).rejects.toThrow('Operation failed');

    const metrics = logger.getPerformanceMetrics();
    expect(metrics).toHaveLength(1);
    expect(metrics[0].operation).toBe('failedOperation');
    expect(metrics[0].duration).toBe(300);
    expect(metrics[0].success).toBe(false);
    expect(metrics[0].errorMessage).toBe('Operation failed');
  });
});