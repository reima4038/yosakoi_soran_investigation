import { renderHook, act } from '@testing-library/react';
import { 
  useURLValidation, 
  useMultipleURLValidation, 
  useURLInput,
  useBatchURLValidation 
} from '../../hooks/useURLValidation';

// タイマーのモック
beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('useURLValidation', () => {
  it('should initialize with default values', () => {
    const { result } = renderHook(() => useURLValidation());

    expect(result.current.validationResult).toBeNull();
    expect(result.current.isValidating).toBe(false);
    expect(result.current.inputState).toBe('empty');
    expect(result.current.hint).toBeNull();
  });

  it('should validate URL with debounce', async () => {
    const { result } = renderHook(() => useURLValidation({ debounceDelay: 300 }));

    act(() => {
      result.current.validate('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    });

    expect(result.current.isValidating).toBe(true);

    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(result.current.isValidating).toBe(false);
    expect(result.current.validationResult?.isValid).toBe(true);
    expect(result.current.validationResult?.normalizedUrl?.videoId).toBe('dQw4w9WgXcQ');
  });

  it('should validate immediately when requested', () => {
    const { result } = renderHook(() => useURLValidation());

    act(() => {
      result.current.validateImmediate('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    });

    expect(result.current.isValidating).toBe(false);
    expect(result.current.validationResult?.isValid).toBe(true);
    expect(result.current.validationResult?.normalizedUrl?.videoId).toBe('dQw4w9WgXcQ');
  });

  it('should handle invalid URL', () => {
    const { result } = renderHook(() => useURLValidation());

    act(() => {
      result.current.validateImmediate('https://vimeo.com/123456');
    });

    expect(result.current.validationResult?.isValid).toBe(false);
    expect(result.current.validationResult?.error?.type).toBe('NOT_YOUTUBE');
  });

  it('should clear validation state', () => {
    const { result } = renderHook(() => useURLValidation());

    act(() => {
      result.current.validateImmediate('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    });

    expect(result.current.validationResult?.isValid).toBe(true);

    act(() => {
      result.current.clear();
    });

    expect(result.current.validationResult).toBeNull();
    expect(result.current.isValidating).toBe(false);
  });

  it('should validate on mount when specified', () => {
    const { result } = renderHook(() => 
      useURLValidation({ 
        validateOnMount: true, 
        initialUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' 
      })
    );

    expect(result.current.validationResult?.isValid).toBe(true);
    expect(result.current.validationResult?.normalizedUrl?.videoId).toBe('dQw4w9WgXcQ');
  });

  it('should update input state correctly', () => {
    const { result } = renderHook(() => useURLValidation());

    // Empty state
    expect(result.current.inputState).toBe('empty');

    // Typing state
    act(() => {
      result.current.validate('https://www.youtube');
    });
    expect(result.current.inputState).toBe('typing');

    // Valid state
    act(() => {
      result.current.validateImmediate('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    });
    expect(result.current.inputState).toBe('valid');

    // Invalid state
    act(() => {
      result.current.validateImmediate('https://vimeo.com/123456');
    });
    expect(result.current.inputState).toBe('invalid');
  });

  it('should provide URL hints', () => {
    const { result } = renderHook(() => useURLValidation());

    act(() => {
      result.current.validate('https://www.youtube.com/channel/test');
    });

    expect(result.current.hint).toContain('動画ページのURL');
  });
});

describe('useMultipleURLValidation', () => {
  it('should initialize with empty state', () => {
    const { result } = renderHook(() => useMultipleURLValidation());

    expect(result.current.validationResults.size).toBe(0);
    expect(result.current.isValidating).toBe(false);
    expect(result.current.getValidURLs()).toEqual([]);
  });

  it('should validate multiple URLs', () => {
    const { result } = renderHook(() => useMultipleURLValidation({ debounceDelay: 100 }));

    act(() => {
      result.current.validateURLImmediate('url1', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
      result.current.validateURLImmediate('url2', 'https://youtu.be/jNQXAC9IVRw');
      result.current.validateURLImmediate('url3', 'https://vimeo.com/123456');
    });

    expect(result.current.validationResults.size).toBe(3);
    expect(result.current.validationResults.get('url1')?.isValid).toBe(true);
    expect(result.current.validationResults.get('url2')?.isValid).toBe(true);
    expect(result.current.validationResults.get('url3')?.isValid).toBe(false);
  });

  it('should get valid URLs only', () => {
    const { result } = renderHook(() => useMultipleURLValidation());

    act(() => {
      result.current.validateURLImmediate('url1', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
      result.current.validateURLImmediate('url2', 'https://vimeo.com/123456');
    });

    const validURLs = result.current.getValidURLs();
    expect(validURLs).toHaveLength(1);
    expect(validURLs[0].id).toBe('url1');
    expect(validURLs[0].normalizedUrl.videoId).toBe('dQw4w9WgXcQ');
  });

  it('should remove URL validation', () => {
    const { result } = renderHook(() => useMultipleURLValidation());

    act(() => {
      result.current.validateURLImmediate('url1', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
      result.current.validateURLImmediate('url2', 'https://youtu.be/jNQXAC9IVRw');
    });

    expect(result.current.validationResults.size).toBe(2);

    act(() => {
      result.current.removeURL('url1');
    });

    expect(result.current.validationResults.size).toBe(1);
    expect(result.current.validationResults.has('url1')).toBe(false);
    expect(result.current.validationResults.has('url2')).toBe(true);
  });

  it('should clear all validations', () => {
    const { result } = renderHook(() => useMultipleURLValidation());

    act(() => {
      result.current.validateURLImmediate('url1', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
      result.current.validateURLImmediate('url2', 'https://youtu.be/jNQXAC9IVRw');
    });

    expect(result.current.validationResults.size).toBe(2);

    act(() => {
      result.current.clear();
    });

    expect(result.current.validationResults.size).toBe(0);
    expect(result.current.isValidating).toBe(false);
  });

  it('should track validation state correctly', () => {
    const { result } = renderHook(() => useMultipleURLValidation({ debounceDelay: 300 }));

    act(() => {
      result.current.validateURL('url1', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
      result.current.validateURL('url2', 'https://youtu.be/jNQXAC9IVRw');
    });

    expect(result.current.isValidating).toBe(true);

    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(result.current.isValidating).toBe(false);
  });
});

describe('useURLInput', () => {
  it('should provide input props', () => {
    const { result } = renderHook(() => useURLInput());

    expect(result.current.inputProps).toHaveProperty('onChange');
    expect(result.current.inputProps).toHaveProperty('onBlur');
    expect(result.current.inputProps).toHaveProperty('onFocus');
    expect(result.current.isFocused).toBe(false);
  });

  it('should track focus state', () => {
    const { result } = renderHook(() => useURLInput());

    act(() => {
      result.current.inputProps.onFocus();
    });

    expect(result.current.isFocused).toBe(true);

    act(() => {
      result.current.inputProps.onBlur();
    });

    expect(result.current.isFocused).toBe(false);
  });

  it('should call validation callbacks', () => {
    const onValidationChange = jest.fn();
    const onValidURL = jest.fn();
    const onInvalidURL = jest.fn();

    const { result } = renderHook(() => 
      useURLInput({
        onValidationChange,
        onValidURL,
        onInvalidURL
      })
    );

    // Valid URL
    act(() => {
      result.current.validateImmediate('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    });

    expect(onValidationChange).toHaveBeenCalledWith(
      expect.objectContaining({ isValid: true })
    );
    expect(onValidURL).toHaveBeenCalledWith(
      expect.objectContaining({ videoId: 'dQw4w9WgXcQ' })
    );

    // Invalid URL
    act(() => {
      result.current.validateImmediate('https://vimeo.com/123456');
    });

    expect(onValidationChange).toHaveBeenCalledWith(
      expect.objectContaining({ isValid: false })
    );
    expect(onInvalidURL).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'NOT_YOUTUBE' })
    );
  });
});

describe('useBatchURLValidation', () => {
  beforeEach(() => {
    jest.useRealTimers(); // バッチ処理では実際のタイマーを使用
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useBatchURLValidation());

    expect(result.current.isValidating).toBe(false);
    expect(result.current.progress).toBe(0);
    expect(result.current.results).toEqual([]);
  });

  it('should validate batch of URLs', async () => {
    const { result } = renderHook(() => useBatchURLValidation({ batchSize: 2, delay: 0 }));

    const urls = [
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      'https://youtu.be/jNQXAC9IVRw',
      'https://vimeo.com/123456',
      'https://www.youtube.com/watch?v=test123456'
    ];

    let batchResults: any;

    await act(async () => {
      batchResults = await result.current.validateBatch(urls);
    });

    expect(batchResults).toHaveLength(4);
    expect(batchResults[0].isValid).toBe(true);
    expect(batchResults[1].isValid).toBe(true);
    expect(batchResults[2].isValid).toBe(false);
    expect(batchResults[3].isValid).toBe(false);

    expect(result.current.isValidating).toBe(false);
    expect(result.current.progress).toBe(1);
    expect(result.current.results).toHaveLength(4);
  });

  it('should handle cancellation', async () => {
    const { result } = renderHook(() => useBatchURLValidation({ batchSize: 1, delay: 100 }));

    const urls = [
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      'https://youtu.be/jNQXAC9IVRw',
      'https://www.youtube.com/watch?v=test123456'
    ];

    act(() => {
      result.current.validateBatch(urls);
    });

    expect(result.current.isValidating).toBe(true);

    act(() => {
      result.current.cancel();
    });

    expect(result.current.isValidating).toBe(false);
  });
});