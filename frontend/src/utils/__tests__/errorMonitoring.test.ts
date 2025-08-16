import { errorMonitoring, captureApiError, captureComponentError } from '../errorMonitoring';

// Mock console methods
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation();

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

// Mock window and navigator
Object.defineProperty(global, 'window', {
  value: {
    location: {
      href: 'http://localhost:3000/sessions/test123/evaluate',
      pathname: '/sessions/test123/evaluate',
    },
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  },
});

Object.defineProperty(global, 'navigator', {
  value: {
    userAgent: 'Test User Agent',
  },
});

describe('ErrorMonitoring', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    errorMonitoring.clearErrors();
    mockLocalStorage.getItem.mockReturnValue(null);
  });

  describe('Error Capture', () => {
    it('should capture basic error information', () => {
      errorMonitoring.captureError({
        message: 'Test error message',
        stack: 'Error stack trace',
      });

      const errors = errorMonitoring.getAllErrors();
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toBe('Test error message');
      expect(errors[0].stack).toBe('Error stack trace');
      expect(errors[0].url).toBe('http://localhost:3000/sessions/test123/evaluate');
      expect(errors[0].userAgent).toBe('Test User Agent');
    });

    it('should include user and session context', () => {
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify({ id: 'user123' }));

      errorMonitoring.captureError({
        message: 'Context test error',
      });

      const errors = errorMonitoring.getAllErrors();
      expect(errors[0].userId).toBe('user123');
      expect(errors[0].sessionId).toBe('test123');
    });

    it('should handle missing context gracefully', () => {
      mockLocalStorage.getItem.mockImplementation(() => {
        throw new Error('Storage error');
      });

      errorMonitoring.captureError({
        message: 'Error without context',
      });

      const errors = errorMonitoring.getAllErrors();
      expect(errors[0].userId).toBeUndefined();
      expect(errors[0].message).toBe('Error without context');
    });

    it('should add timestamp automatically', () => {
      const beforeTime = new Date().toISOString();
      
      errorMonitoring.captureError({
        message: 'Timestamp test',
      });

      const afterTime = new Date().toISOString();
      const errors = errorMonitoring.getAllErrors();
      
      expect(errors[0].timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(errors[0].timestamp).toBeLessThanOrEqual(afterTime);
    });

    it('should include additional info when provided', () => {
      errorMonitoring.captureError({
        message: 'Error with additional info',
        additionalInfo: {
          type: 'api',
          status: 500,
          endpoint: '/api/test',
        },
      });

      const errors = errorMonitoring.getAllErrors();
      expect(errors[0].additionalInfo).toEqual({
        type: 'api',
        status: 500,
        endpoint: '/api/test',
      });
    });
  });

  describe('Error Statistics', () => {
    beforeEach(() => {
      // Add various types of errors
      errorMonitoring.captureError({
        message: 'JavaScript error',
        additionalInfo: { type: 'javascript' },
      });

      errorMonitoring.captureError({
        message: 'API error',
        additionalInfo: { type: 'api' },
      });

      errorMonitoring.captureError({
        message: 'Network error',
        additionalInfo: { type: 'network' },
      });

      errorMonitoring.captureError({
        message: 'Another API error',
        additionalInfo: { type: 'api' },
      });

      errorMonitoring.captureError({
        message: 'Critical network error',
        additionalInfo: { type: 'network' },
      });
    });

    it('should calculate error statistics correctly', () => {
      const stats = errorMonitoring.getErrorStats();

      expect(stats.totalErrors).toBe(5);
      expect(stats.uniqueErrors).toBe(5); // All different messages
      expect(stats.errorsByType.javascript).toBe(1);
      expect(stats.errorsByType.api).toBe(2);
      expect(stats.errorsByType.network).toBe(2);
    });

    it('should identify recent errors', () => {
      const stats = errorMonitoring.getErrorStats();
      
      // All errors should be recent (within last hour)
      expect(stats.recentErrors.length).toBe(5);
    });

    it('should identify critical errors', () => {
      const stats = errorMonitoring.getErrorStats();
      
      // Network errors should be considered critical
      expect(stats.criticalErrors.length).toBe(2);
      expect(stats.criticalErrors.every(error => 
        error.message.toLowerCase().includes('network')
      )).toBe(true);
    });

    it('should group errors by component', () => {
      errorMonitoring.captureError({
        message: 'Component A error',
        errorBoundary: 'ComponentA',
      });

      errorMonitoring.captureError({
        message: 'Component B error',
        errorBoundary: 'ComponentB',
      });

      errorMonitoring.captureError({
        message: 'Another Component A error',
        errorBoundary: 'ComponentA',
      });

      const stats = errorMonitoring.getErrorStats();
      expect(stats.errorsByComponent.ComponentA).toBe(2);
      expect(stats.errorsByComponent.ComponentB).toBe(1);
    });
  });

  describe('Error Callbacks', () => {
    it('should call registered callbacks when error occurs', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      errorMonitoring.onError(callback1);
      errorMonitoring.onError(callback2);

      const errorInfo = { message: 'Callback test error' };
      errorMonitoring.captureError(errorInfo);

      expect(callback1).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Callback test error' })
      );
      expect(callback2).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Callback test error' })
      );
    });

    it('should remove callbacks when requested', () => {
      const callback = jest.fn();

      errorMonitoring.onError(callback);
      errorMonitoring.offError(callback);

      errorMonitoring.captureError({ message: 'Test error' });

      expect(callback).not.toHaveBeenCalled();
    });

    it('should handle callback errors gracefully', () => {
      const faultyCallback = jest.fn().mockImplementation(() => {
        throw new Error('Callback error');
      });

      errorMonitoring.onError(faultyCallback);

      // Should not throw
      expect(() => {
        errorMonitoring.captureError({ message: 'Test error' });
      }).not.toThrow();

      expect(faultyCallback).toHaveBeenCalled();
    });
  });

  describe('Error Report Generation', () => {
    it('should generate comprehensive error report', () => {
      errorMonitoring.captureError({
        message: 'Test error 1',
        additionalInfo: { type: 'api' },
      });

      errorMonitoring.captureError({
        message: 'Test error 2',
        additionalInfo: { type: 'network' },
      });

      const report = errorMonitoring.generateErrorReport();

      expect(report.stats).toBeDefined();
      expect(report.systemInfo).toBeDefined();
      expect(report.recentErrors).toBeDefined();

      expect(report.stats.totalErrors).toBe(2);
      expect(report.systemInfo.userAgent).toBe('Test User Agent');
      expect(report.systemInfo.url).toBe('http://localhost:3000/sessions/test123/evaluate');
      expect(report.recentErrors).toHaveLength(2);
    });
  });

  describe('Memory Management', () => {
    it('should limit maximum error entries', () => {
      // Add more errors than the maximum (500)
      for (let i = 0; i < 600; i++) {
        errorMonitoring.captureError({
          message: `Error ${i}`,
        });
      }

      const errors = errorMonitoring.getAllErrors();
      expect(errors.length).toBeLessThanOrEqual(500);
    });

    it('should clear all errors when requested', () => {
      errorMonitoring.captureError({ message: 'Error 1' });
      errorMonitoring.captureError({ message: 'Error 2' });

      expect(errorMonitoring.getAllErrors()).toHaveLength(2);

      errorMonitoring.clearErrors();

      expect(errorMonitoring.getAllErrors()).toHaveLength(0);
    });
  });
});

describe('captureApiError', () => {
  beforeEach(() => {
    errorMonitoring.clearErrors();
  });

  it('should capture API error with context', () => {
    const error = {
      message: 'Request failed',
      response: {
        status: 404,
        data: { message: 'Not found' },
      },
    };

    const context = {
      url: '/api/evaluations/123',
      method: 'GET',
      status: 404,
      operation: 'fetchEvaluation',
    };

    captureApiError(error, context);

    const errors = errorMonitoring.getAllErrors();
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toBe('API Error: fetchEvaluation - Request failed');
    expect(errors[0].additionalInfo.type).toBe('api');
    expect(errors[0].additionalInfo.url).toBe('/api/evaluations/123');
    expect(errors[0].additionalInfo.method).toBe('GET');
    expect(errors[0].additionalInfo.status).toBe(404);
    expect(errors[0].additionalInfo.operation).toBe('fetchEvaluation');
  });

  it('should handle errors without response', () => {
    const error = {
      message: 'Network Error',
      code: 'NETWORK_ERROR',
    };

    const context = {
      url: '/api/test',
      method: 'POST',
      operation: 'testOperation',
    };

    captureApiError(error, context);

    const errors = errorMonitoring.getAllErrors();
    expect(errors[0].additionalInfo.status).toBeUndefined();
  });
});

describe('captureComponentError', () => {
  beforeEach(() => {
    errorMonitoring.clearErrors();
  });

  it('should capture React component error', () => {
    const error = new Error('Component render error');
    const errorInfo = {
      componentStack: 'Component stack trace',
    };

    captureComponentError(error, errorInfo, 'TestComponent');

    const errors = errorMonitoring.getAllErrors();
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toBe('Component render error');
    expect(errors[0].componentStack).toBe('Component stack trace');
    expect(errors[0].errorBoundary).toBe('TestComponent');
    expect(errors[0].additionalInfo.type).toBe('react-component');
  });

  it('should handle component error without boundary name', () => {
    const error = new Error('Component error');
    const errorInfo = {
      componentStack: 'Stack trace',
    };

    captureComponentError(error, errorInfo);

    const errors = errorMonitoring.getAllErrors();
    expect(errors[0].errorBoundary).toBeUndefined();
  });
});