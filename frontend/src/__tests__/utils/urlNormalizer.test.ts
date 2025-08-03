import { 
  YouTubeURLNormalizer, 
  DebouncedValidator, 
  URLValidationState,
  URLValidationErrorType,
  YOUTUBE_URL_PATTERNS 
} from '../../utils/urlNormalizer';

describe('YouTubeURLNormalizer (Frontend)', () => {
  describe('normalize', () => {
    it('should extract video ID from URL with additional query parameters', () => {
      const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PLrAXtmRdnEQy8VJqQzNlkVjYoungUdmzP&index=1';
      const result = YouTubeURLNormalizer.normalize(url);
      
      expect(result.isValid).toBe(true);
      expect(result.videoId).toBe('dQw4w9WgXcQ');
      expect(result.canonical).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
      expect(result.original).toBe(url);
      expect(result.metadata?.playlist).toBe('PLrAXtmRdnEQy8VJqQzNlkVjYoungUdmzP');
      expect(result.metadata?.index).toBe(1);
    });

    it('should extract video ID from URL with timestamp', () => {
      const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=30s';
      const result = YouTubeURLNormalizer.normalize(url);
      
      expect(result.isValid).toBe(true);
      expect(result.videoId).toBe('dQw4w9WgXcQ');
      expect(result.metadata?.timestamp).toBe(30);
    });

    it('should extract video ID from shortened URL', () => {
      const url = 'https://youtu.be/dQw4w9WgXcQ?si=SHARE_ID';
      const result = YouTubeURLNormalizer.normalize(url);
      
      expect(result.isValid).toBe(true);
      expect(result.videoId).toBe('dQw4w9WgXcQ');
      expect(result.canonical).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    });

    it('should extract video ID from embed URL', () => {
      const url = 'https://www.youtube.com/embed/dQw4w9WgXcQ?start=30';
      const result = YouTubeURLNormalizer.normalize(url);
      
      expect(result.isValid).toBe(true);
      expect(result.videoId).toBe('dQw4w9WgXcQ');
      expect(result.canonical).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    });

    it('should handle URL without protocol', () => {
      const url = 'youtube.com/watch?v=dQw4w9WgXcQ';
      const result = YouTubeURLNormalizer.normalize(url);
      
      expect(result.isValid).toBe(true);
      expect(result.videoId).toBe('dQw4w9WgXcQ');
      expect(result.canonical).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    });

    it('should handle direct video ID', () => {
      const videoId = 'dQw4w9WgXcQ';
      const result = YouTubeURLNormalizer.normalize(videoId);
      
      expect(result.isValid).toBe(true);
      expect(result.videoId).toBe(videoId);
      expect(result.canonical).toBe(`https://www.youtube.com/watch?v=${videoId}`);
    });

    it('should parse complex timestamp formats', () => {
      const testCases = [
        { url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=1h30m45s', expected: 5445 },
        { url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=30m', expected: 1800 },
        { url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=45', expected: 45 }
      ];

      testCases.forEach(({ url, expected }) => {
        const result = YouTubeURLNormalizer.normalize(url);
        expect(result.metadata?.timestamp).toBe(expected);
      });
    });
  });

  describe('validateQuick', () => {
    it('should return valid result for valid YouTube URL', () => {
      const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
      const result = YouTubeURLNormalizer.validateQuick(url);
      
      expect(result.isValid).toBe(true);
      expect(result.normalizedUrl?.videoId).toBe('dQw4w9WgXcQ');
      expect(result.error).toBeUndefined();
    });

    it('should return invalid result for non-YouTube URL', () => {
      const url = 'https://vimeo.com/123456';
      const result = YouTubeURLNormalizer.validateQuick(url);
      
      expect(result.isValid).toBe(false);
      expect(result.error?.type).toBe(URLValidationErrorType.NOT_YOUTUBE);
      expect(result.normalizedUrl).toBeUndefined();
    });

    it('should return invalid result for empty URL', () => {
      const result = YouTubeURLNormalizer.validateQuick('');
      
      expect(result.isValid).toBe(false);
      expect(result.error?.type).toBe(URLValidationErrorType.INVALID_FORMAT);
    });

    it('should return invalid result for URL without video ID', () => {
      const url = 'https://www.youtube.com/watch';
      const result = YouTubeURLNormalizer.validateQuick(url);
      
      expect(result.isValid).toBe(false);
      expect(result.error?.type).toBe(URLValidationErrorType.MISSING_VIDEO_ID);
    });
  });

  describe('getInputState', () => {
    it('should return "empty" for empty input', () => {
      expect(YouTubeURLNormalizer.getInputState('')).toBe('empty');
      expect(YouTubeURLNormalizer.getInputState('   ')).toBe('empty');
    });

    it('should return "valid" for valid YouTube URL', () => {
      expect(YouTubeURLNormalizer.getInputState('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('valid');
      expect(YouTubeURLNormalizer.getInputState('dQw4w9WgXcQ')).toBe('valid');
    });

    it('should return "typing" for partial YouTube URL', () => {
      expect(YouTubeURLNormalizer.getInputState('https://www.youtube')).toBe('typing');
      expect(YouTubeURLNormalizer.getInputState('youtube.com')).toBe('typing');
      expect(YouTubeURLNormalizer.getInputState('dQw4w9')).toBe('typing');
    });

    it('should return "invalid" for non-YouTube URL', () => {
      expect(YouTubeURLNormalizer.getInputState('https://vimeo.com/123456')).toBe('invalid');
      expect(YouTubeURLNormalizer.getInputState('invalid-text')).toBe('invalid');
    });
  });

  describe('getURLHint', () => {
    it('should return null for empty input', () => {
      expect(YouTubeURLNormalizer.getURLHint('')).toBeNull();
      expect(YouTubeURLNormalizer.getURLHint('   ')).toBeNull();
    });

    it('should return hint for incomplete YouTube URL', () => {
      const hint = YouTubeURLNormalizer.getURLHint('https://www.youtube.com/channel/test');
      expect(hint).toContain('動画ページのURL');
    });

    it('should return hint for non-YouTube URL', () => {
      const hint = YouTubeURLNormalizer.getURLHint('https://vimeo.com/123456');
      expect(hint).toContain('YouTube以外のURL');
    });

    it('should return hint for short incomplete URL', () => {
      const hint = YouTubeURLNormalizer.getURLHint('youtu');
      expect(hint).toContain('不完全');
    });
  });

  describe('isValidVideoId', () => {
    it('should validate correct video ID format', () => {
      expect(YouTubeURLNormalizer.isValidVideoId('dQw4w9WgXcQ')).toBe(true);
      expect(YouTubeURLNormalizer.isValidVideoId('jNQXAC9IVRw')).toBe(true);
    });

    it('should reject invalid video ID format', () => {
      expect(YouTubeURLNormalizer.isValidVideoId('invalid')).toBe(false);
      expect(YouTubeURLNormalizer.isValidVideoId('toolongvideoid')).toBe(false);
      expect(YouTubeURLNormalizer.isValidVideoId('')).toBe(false);
    });
  });

  describe('normalizeMultiple', () => {
    it('should normalize multiple URLs', () => {
      const urls = [
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        'https://youtu.be/jNQXAC9IVRw',
        'https://example.com/not-youtube'
      ];

      const results = YouTubeURLNormalizer.normalizeMultiple(urls);
      
      expect(results).toHaveLength(3);
      expect(results[0].isValid).toBe(true);
      expect(results[0].videoId).toBe('dQw4w9WgXcQ');
      expect(results[1].isValid).toBe(true);
      expect(results[1].videoId).toBe('jNQXAC9IVRw');
      expect(results[2].isValid).toBe(false);
    });
  });

  describe('URL patterns', () => {
    it('should have all required patterns defined', () => {
      expect(YOUTUBE_URL_PATTERNS).toBeDefined();
      expect(YOUTUBE_URL_PATTERNS.length).toBeGreaterThan(0);
      
      YOUTUBE_URL_PATTERNS.forEach(pattern => {
        expect(pattern.pattern).toBeInstanceOf(RegExp);
        expect(typeof pattern.extractor).toBe('function');
        expect(typeof pattern.description).toBe('string');
      });
    });

    it('should extract video IDs using all patterns', () => {
      const testUrls = [
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        'https://m.youtube.com/watch?v=dQw4w9WgXcQ',
        'https://youtu.be/dQw4w9WgXcQ',
        'https://www.youtube.com/embed/dQw4w9WgXcQ',
        'www.youtube.com/watch?v=dQw4w9WgXcQ',
        'm.youtube.com/watch?v=dQw4w9WgXcQ',
        'youtu.be/dQw4w9WgXcQ',
        'dQw4w9WgXcQ'
      ];

      testUrls.forEach(url => {
        const result = YouTubeURLNormalizer.normalize(url);
        expect(result.isValid).toBe(true);
        expect(result.videoId).toBe('dQw4w9WgXcQ');
      });
    });
  });
});

describe('DebouncedValidator', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should debounce validation calls', () => {
    const validator = new DebouncedValidator(300);
    const callback = jest.fn();

    validator.validate('https://www.youtube.com/watch?v=dQw4w9WgXcQ', callback);
    validator.validate('https://www.youtube.com/watch?v=jNQXAC9IVRw', callback);
    validator.validate('https://youtu.be/test123456', callback);

    expect(callback).not.toHaveBeenCalled();

    jest.advanceTimersByTime(300);

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({
        isValid: false // 最後のURLは無効
      })
    );
  });

  it('should validate immediately when requested', () => {
    const validator = new DebouncedValidator(300);
    const callback = jest.fn();

    validator.validateImmediate('https://www.youtube.com/watch?v=dQw4w9WgXcQ', callback);

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({
        isValid: true,
        normalizedUrl: expect.objectContaining({
          videoId: 'dQw4w9WgXcQ'
        })
      })
    );
  });

  it('should clear pending validation', () => {
    const validator = new DebouncedValidator(300);
    const callback = jest.fn();

    validator.validate('https://www.youtube.com/watch?v=dQw4w9WgXcQ', callback);
    validator.clear();

    jest.advanceTimersByTime(300);

    expect(callback).not.toHaveBeenCalled();
  });
});

describe('URLValidationState', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should manage validation state correctly', () => {
    const state = new URLValidationState(300);
    const listener = jest.fn();

    const unsubscribe = state.addListener(listener);

    expect(state.getCurrentResult()).toBeNull();
    expect(state.getIsValidating()).toBe(false);

    state.validate('https://www.youtube.com/watch?v=dQw4w9WgXcQ');

    expect(state.getIsValidating()).toBe(true);
    expect(listener).toHaveBeenCalledWith(null, true);

    jest.advanceTimersByTime(300);

    expect(state.getIsValidating()).toBe(false);
    expect(state.getCurrentResult()?.isValid).toBe(true);
    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({ isValid: true }),
      false
    );

    unsubscribe();
    state.clear();

    expect(state.getCurrentResult()).toBeNull();
    expect(state.getIsValidating()).toBe(false);
  });

  it('should handle multiple listeners', () => {
    const state = new URLValidationState(300);
    const listener1 = jest.fn();
    const listener2 = jest.fn();

    state.addListener(listener1);
    state.addListener(listener2);

    state.validateImmediate('https://www.youtube.com/watch?v=dQw4w9WgXcQ');

    expect(listener1).toHaveBeenCalledTimes(2); // validating + result
    expect(listener2).toHaveBeenCalledTimes(2); // validating + result
  });

  it('should allow listener unsubscription', () => {
    const state = new URLValidationState(300);
    const listener = jest.fn();

    const unsubscribe = state.addListener(listener);
    unsubscribe();

    state.validateImmediate('https://www.youtube.com/watch?v=dQw4w9WgXcQ');

    expect(listener).not.toHaveBeenCalled();
  });
});