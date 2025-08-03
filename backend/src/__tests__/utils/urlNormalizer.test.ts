import { YouTubeURLNormalizer, URLValidationErrorType, YOUTUBE_URL_PATTERNS } from '../../utils/urlNormalizer';

describe('YouTubeURLNormalizer', () => {
  describe('normalize', () => {
    // 要件1.1: 追加パラメータを含むURL
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

    // 要件1.2: タイムスタンプ付きURL
    it('should extract video ID from URL with timestamp', () => {
      const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=30s';
      const result = YouTubeURLNormalizer.normalize(url);
      
      expect(result.isValid).toBe(true);
      expect(result.videoId).toBe('dQw4w9WgXcQ');
      expect(result.metadata?.timestamp).toBe(30);
    });

    // 要件1.3: 短縮URL
    it('should extract video ID from shortened URL', () => {
      const url = 'https://youtu.be/dQw4w9WgXcQ?si=SHARE_ID';
      const result = YouTubeURLNormalizer.normalize(url);
      
      expect(result.isValid).toBe(true);
      expect(result.videoId).toBe('dQw4w9WgXcQ');
      expect(result.canonical).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    });

    // 要件1.4: 埋め込みURL
    it('should extract video ID from embed URL', () => {
      const url = 'https://www.youtube.com/embed/dQw4w9WgXcQ?start=30';
      const result = YouTubeURLNormalizer.normalize(url);
      
      expect(result.isValid).toBe(true);
      expect(result.videoId).toBe('dQw4w9WgXcQ');
      expect(result.canonical).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    });

    // モバイル版URL
    it('should extract video ID from mobile URL', () => {
      const url = 'https://m.youtube.com/watch?v=dQw4w9WgXcQ';
      const result = YouTubeURLNormalizer.normalize(url);
      
      expect(result.isValid).toBe(true);
      expect(result.videoId).toBe('dQw4w9WgXcQ');
    });

    // プロトコルなしURL
    it('should handle URL without protocol', () => {
      const url = 'youtube.com/watch?v=dQw4w9WgXcQ';
      const result = YouTubeURLNormalizer.normalize(url);
      
      expect(result.isValid).toBe(true);
      expect(result.videoId).toBe('dQw4w9WgXcQ');
      expect(result.canonical).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    });

    // www なしURL
    it('should handle URL without www', () => {
      const url = 'https://youtube.com/watch?v=dQw4w9WgXcQ';
      const result = YouTubeURLNormalizer.normalize(url);
      
      expect(result.isValid).toBe(true);
      expect(result.videoId).toBe('dQw4w9WgXcQ');
    });

    // 直接ビデオID
    it('should handle direct video ID', () => {
      const videoId = 'dQw4w9WgXcQ';
      const result = YouTubeURLNormalizer.normalize(videoId);
      
      expect(result.isValid).toBe(true);
      expect(result.videoId).toBe(videoId);
      expect(result.canonical).toBe(`https://www.youtube.com/watch?v=${videoId}`);
    });

    // 複雑なタイムスタンプ形式
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

  describe('error handling', () => {
    it('should throw error for empty URL', () => {
      expect(() => YouTubeURLNormalizer.normalize('')).toThrow();
      expect(() => YouTubeURLNormalizer.normalize('')).toThrowError(
        expect.objectContaining({ type: URLValidationErrorType.INVALID_FORMAT })
      );
    });

    it('should throw error for non-YouTube URL', () => {
      expect(() => YouTubeURLNormalizer.normalize('https://vimeo.com/123456')).toThrow();
      expect(() => YouTubeURLNormalizer.normalize('https://vimeo.com/123456')).toThrowError(
        expect.objectContaining({ type: URLValidationErrorType.NOT_YOUTUBE })
      );
    });

    it('should throw error for YouTube URL without video ID', () => {
      expect(() => YouTubeURLNormalizer.normalize('https://www.youtube.com/watch')).toThrow();
      expect(() => YouTubeURLNormalizer.normalize('https://www.youtube.com/watch')).toThrowError(
        expect.objectContaining({ type: URLValidationErrorType.MISSING_VIDEO_ID })
      );
    });

    it('should throw error for invalid video ID format', () => {
      expect(() => YouTubeURLNormalizer.normalize('https://www.youtube.com/watch?v=invalid')).toThrow();
    });
  });

  describe('normalizeMultiple', () => {
    it('should normalize multiple URLs', () => {
      const urls = [
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        'https://youtu.be/jNQXAC9IVRw',
        'invalid-url-not-youtube'
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

  describe('isValidVideoId', () => {
    it('should validate video ID format', () => {
      expect(YouTubeURLNormalizer.isValidVideoId('dQw4w9WgXcQ')).toBe(true);
      expect(YouTubeURLNormalizer.isValidVideoId('jNQXAC9IVRw')).toBe(true);
      expect(YouTubeURLNormalizer.isValidVideoId('invalid')).toBe(false);
      expect(YouTubeURLNormalizer.isValidVideoId('toolongvideoid')).toBe(false);
      expect(YouTubeURLNormalizer.isValidVideoId('')).toBe(false);
    });
  });

  describe('URL patterns', () => {
    it('should have all required patterns defined', () => {
      expect(YOUTUBE_URL_PATTERNS).toBeDefined();
      expect(YOUTUBE_URL_PATTERNS.length).toBeGreaterThan(0);
      
      // 各パターンが必要なプロパティを持っていることを確認
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