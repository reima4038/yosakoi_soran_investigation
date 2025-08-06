/**
 * URL検証の統合テスト (Backend)
 * API エンドポイント、エラーハンドリング、言語対応の統合テスト
 */

import request from 'supertest';
import app from '../../index';
import { YouTubeURLNormalizer, URLValidationErrorType } from '../../utils/urlNormalizer';
import { ErrorMessageManager } from '../../utils/errorMessages';

// YouTube API のモック
jest.mock('../../services/youtubeService', () => ({
  youtubeService: {
    getVideoInfo: jest.fn(),
    extractVideoId: jest.fn(),
    getLocalizedErrorMessage: jest.fn(),
    getFormattedErrorMessage: jest.fn(),
    generateUserHelpMessage: jest.fn()
  }
}));

const { youtubeService } = require('../../services/youtubeService');

describe('URL Validation Integration Tests (Backend)', () => {
  
  beforeAll(async () => {
    const { connectDB } = require('../setup');
    await connectDB();
  });

  afterAll(async () => {
    const { disconnectDB } = require('../setup');
    await disconnectDB();
  });
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('YouTube Info API Integration', () => {
    it('should handle various URL formats correctly', async () => {
      const mockVideoInfo = {
        id: 'dQw4w9WgXcQ',
        title: 'Test Video',
        channelTitle: 'Test Channel',
        publishedAt: '2023-01-01T00:00:00Z',
        viewCount: '1000000',
        thumbnails: {
          default: { url: 'https://example.com/thumb.jpg' }
        },
        isEmbeddable: true
      };

      youtubeService.getVideoInfo.mockResolvedValue(mockVideoInfo);

      const testUrls = [
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        'https://youtu.be/dQw4w9WgXcQ',
        'https://www.youtube.com/embed/dQw4w9WgXcQ',
        'https://m.youtube.com/watch?v=dQw4w9WgXcQ',
        'www.youtube.com/watch?v=dQw4w9WgXcQ',
        'dQw4w9WgXcQ'
      ];

      for (const url of testUrls) {
        const response = await request(app)
          .get('/api/videos/youtube-info')
          .query({ url });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.videoInfo).toEqual(mockVideoInfo);
        expect(response.body.data.normalizedUrl.videoId).toBe('dQw4w9WgXcQ');
        expect(response.body.data.normalizedUrl.canonical).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
      }
    });

    it('should handle URL normalization errors with proper error responses', async () => {
      const errorTestCases = [
        {
          url: '',
          expectedErrorType: URLValidationErrorType.INVALID_FORMAT,
          expectedStatus: 400
        },
        {
          url: 'https://vimeo.com/123456',
          expectedErrorType: URLValidationErrorType.NOT_YOUTUBE,
          expectedStatus: 400
        },
        {
          url: 'https://www.youtube.com/watch',
          expectedErrorType: URLValidationErrorType.MISSING_VIDEO_ID,
          expectedStatus: 400
        },
        {
          url: 'https://www.youtube.com/watch?v=invalid',
          expectedErrorType: URLValidationErrorType.MISSING_VIDEO_ID,
          expectedStatus: 400
        },
        {
          url: 'https://www.youtube.com/channel/UCtest',
          expectedErrorType: URLValidationErrorType.NOT_YOUTUBE,
          expectedStatus: 400
        }
      ];

      for (const { url, expectedErrorType, expectedStatus } of errorTestCases) {
        const response = await request(app)
          .get('/api/videos/youtube-info')
          .query({ url });

        expect(response.status).toBe(expectedStatus);
        expect(response.body.success).toBe(false);
        expect(response.body.error.type).toBe(expectedErrorType);
        expect(response.body.error.message).toBeDefined();
        expect(response.body.error.suggestion).toBeDefined();
      }
    });

    it('should handle language-specific error messages', async () => {
      const invalidUrl = 'https://vimeo.com/123456';

      // 日本語エラーメッセージ
      const jaResponse = await request(app)
        .get('/api/videos/youtube-info')
        .query({ url: invalidUrl, lang: 'ja' });

      expect(jaResponse.status).toBe(400);
      expect(jaResponse.body.error.language).toBe('ja');
      expect(jaResponse.body.error.message).toContain('YouTube以外');

      // 英語エラーメッセージ
      const enResponse = await request(app)
        .get('/api/videos/youtube-info')
        .query({ url: invalidUrl, lang: 'en' });

      expect(enResponse.status).toBe(400);
      expect(enResponse.body.error.language).toBe('en');
      expect(enResponse.body.error.message).toContain('not a YouTube');
    });

    it('should handle YouTube API errors correctly', async () => {
      youtubeService.getVideoInfo.mockRejectedValue({
        code: 'VIDEO_NOT_FOUND',
        message: 'Video not found'
      });

      const response = await request(app)
        .get('/api/videos/youtube-info')
        .query({ url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe(URLValidationErrorType.VIDEO_NOT_FOUND);
    });

    it('should handle private video errors', async () => {
      youtubeService.getVideoInfo.mockRejectedValue({
        code: 'PRIVATE_VIDEO',
        message: 'Video is private'
      });

      const response = await request(app)
        .get('/api/videos/youtube-info')
        .query({ url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe(URLValidationErrorType.PRIVATE_VIDEO);
    });
  });

  describe('Video Creation API Integration', () => {
    beforeEach(() => {
      // 認証のモック（実際の実装に応じて調整）
      jest.spyOn(require('../../middleware/auth'), 'auth').mockImplementation((req: any, res: any, next: any) => {
        req.user = { userId: 'test-user-id' };
        next();
      });
    });

    it('should create video with normalized URL', async () => {
      const mockVideoInfo = {
        id: 'dQw4w9WgXcQ',
        title: 'Test Video',
        channelTitle: 'Test Channel',
        publishedAt: '2023-01-01T00:00:00Z',
        viewCount: '1000000',
        thumbnails: {
          default: { url: 'https://example.com/thumb.jpg' }
        },
        isEmbeddable: true
      };

      youtubeService.getVideoInfo.mockResolvedValue(mockVideoInfo);

      const testData = {
        youtubeUrl: 'https://youtu.be/dQw4w9WgXcQ?si=abc123',
        metadata: {
          teamName: 'Test Team',
          performanceName: 'Test Performance'
        },
        tags: ['test', 'video']
      };

      const response = await request(app)
        .post('/api/videos')
        .send(testData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.youtubeUrl).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    });

    it('should handle duplicate video detection', async () => {
      // 既存の動画をモック
      const { Video } = require('../../models/Video');
      jest.spyOn(Video, 'findOne').mockResolvedValue({
        id: 'existing-video-id',
        youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
      });

      const testData = {
        youtubeUrl: 'https://youtu.be/dQw4w9WgXcQ',
        metadata: {},
        tags: []
      };

      const response = await request(app)
        .post('/api/videos')
        .send(testData);

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe(URLValidationErrorType.DUPLICATE_VIDEO);
    });

    it('should validate input data correctly', async () => {
      const invalidTestCases = [
        {
          data: { youtubeUrl: '' },
          expectedError: 'YouTube URLは必須です'
        },
        {
          data: { youtubeUrl: 'https://vimeo.com/123456' },
          expectedError: 'YouTube以外のURL'
        },
        {
          data: { 
            youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            metadata: { teamName: 'a'.repeat(101) }
          },
          expectedError: 'チーム名は100文字以下'
        },
        {
          data: { 
            youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            tags: ['a'.repeat(31)]
          },
          expectedError: 'タグは30文字以下'
        }
      ];

      for (const { data, expectedError } of invalidTestCases) {
        const response = await request(app)
          .post('/api/videos')
          .send(data);

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message || response.body.error.message).toContain(expectedError);
      }
    });
  });

  describe('Error Message Localization Integration', () => {
    it('should provide consistent error messages across endpoints', async () => {
      const invalidUrl = 'https://vimeo.com/123456';

      // YouTube Info API
      const infoResponse = await request(app)
        .get('/api/videos/youtube-info')
        .query({ url: invalidUrl, lang: 'ja' });

      // Video Creation API
      const createResponse = await request(app)
        .post('/api/videos')
        .send({ youtubeUrl: invalidUrl });

      expect(infoResponse.body.error.type).toBe(createResponse.body.error.type);
      expect(infoResponse.body.error.type).toBe(URLValidationErrorType.NOT_YOUTUBE);
    });

    it('should handle unsupported languages gracefully', async () => {
      const response = await request(app)
        .get('/api/videos/youtube-info')
        .query({ url: 'https://vimeo.com/123456', lang: 'fr' });

      expect(response.status).toBe(400);
      expect(response.body.error.language).toBe('ja'); // デフォルト言語にフォールバック
    });
  });

  describe('Performance and Reliability Integration', () => {
    it('should handle concurrent requests efficiently', async () => {
      const mockVideoInfo = {
        id: 'dQw4w9WgXcQ',
        title: 'Test Video',
        channelTitle: 'Test Channel',
        publishedAt: '2023-01-01T00:00:00Z',
        viewCount: '1000000',
        thumbnails: {
          default: { url: 'https://example.com/thumb.jpg' }
        },
        isEmbeddable: true
      };

      youtubeService.getVideoInfo.mockResolvedValue(mockVideoInfo);

      const requests = Array.from({ length: 10 }, (_, i) =>
        request(app)
          .get('/api/videos/youtube-info')
          .query({ url: `https://www.youtube.com/watch?v=test${i.toString().padStart(7, '0')}` })
      );

      const responses = await Promise.all(requests);

      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });

    it('should handle malformed requests gracefully', async () => {
      const malformedRequests = [
        // 不正なクエリパラメータ
        request(app).get('/api/videos/youtube-info').query({ url: null }),
        request(app).get('/api/videos/youtube-info').query({ url: undefined }),
        request(app).get('/api/videos/youtube-info').query({}),
        
        // 不正なボディデータ
        request(app).post('/api/videos').send({}),
        request(app).post('/api/videos').send('invalid-json'),
        request(app).post('/api/videos').send({ youtubeUrl: null })
      ];

      const responses = await Promise.all(malformedRequests);

      responses.forEach(response => {
        expect(response.status).toBeGreaterThanOrEqual(400);
        expect(response.status).toBeLessThan(500);
        expect(response.body.success).toBe(false);
      });
    });

    it('should handle very long URLs without crashing', async () => {
      const veryLongUrl = 'https://www.youtube.com/watch?v=' + 'a'.repeat(10000);

      const response = await request(app)
        .get('/api/videos/youtube-info')
        .query({ url: veryLongUrl });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe(URLValidationErrorType.MISSING_VIDEO_ID);
    });
  });

  describe('Security Integration Tests', () => {
    it('should prevent SQL injection attempts', async () => {
      const sqlInjectionAttempts = [
        "'; DROP TABLE videos; --",
        "' OR '1'='1",
        "'; INSERT INTO videos VALUES ('malicious'); --"
      ];

      for (const attempt of sqlInjectionAttempts) {
        const response = await request(app)
          .get('/api/videos/youtube-info')
          .query({ url: `https://www.youtube.com/watch?v=${attempt}` });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error.type).toBe(URLValidationErrorType.MISSING_VIDEO_ID);
      }
    });

    it('should prevent XSS attempts', async () => {
      const xssAttempts = [
        '<script>alert("xss")</script>',
        'javascript:alert("xss")',
        '<img src="x" onerror="alert(1)">'
      ];

      for (const attempt of xssAttempts) {
        const response = await request(app)
          .get('/api/videos/youtube-info')
          .query({ url: `https://www.youtube.com/watch?v=${attempt}` });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error.type).toBe(URLValidationErrorType.MISSING_VIDEO_ID);
      }
    });

    it('should handle null byte injection attempts', async () => {
      const nullByteAttempts = [
        'dQw4w9WgXcQ\0',
        'dQw4w9WgXcQ\0.txt',
        'dQw4w9WgXcQ%00'
      ];

      for (const attempt of nullByteAttempts) {
        const response = await request(app)
          .get('/api/videos/youtube-info')
          .query({ url: `https://www.youtube.com/watch?v=${attempt}` });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error.type).toBe(URLValidationErrorType.MISSING_VIDEO_ID);
      }
    });
  });

  describe('Edge Cases Integration', () => {
    it('should handle Unicode characters in URLs', async () => {
      const mockVideoInfo = {
        id: 'dQw4w9WgXcQ',
        title: 'Test Video with Unicode: 日本語テスト',
        channelTitle: 'Test Channel',
        publishedAt: '2023-01-01T00:00:00Z',
        viewCount: '1000000',
        thumbnails: {
          default: { url: 'https://example.com/thumb.jpg' }
        },
        isEmbeddable: true
      };

      youtubeService.getVideoInfo.mockResolvedValue(mockVideoInfo);

      const unicodeUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&feature=シェア';

      const response = await request(app)
        .get('/api/videos/youtube-info')
        .query({ url: unicodeUrl });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.videoInfo.title).toContain('日本語テスト');
    });

    it('should handle URLs with special characters', async () => {
      const mockVideoInfo = {
        id: 'dQw4w9WgXcQ',
        title: 'Test Video',
        channelTitle: 'Test Channel',
        publishedAt: '2023-01-01T00:00:00Z',
        viewCount: '1000000',
        thumbnails: {
          default: { url: 'https://example.com/thumb.jpg' }
        },
        isEmbeddable: true
      };

      youtubeService.getVideoInfo.mockResolvedValue(mockVideoInfo);

      const specialCharUrls = [
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PL-test_123',
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=1h30m45s',
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ&feature=youtu.be'
      ];

      for (const url of specialCharUrls) {
        const response = await request(app)
          .get('/api/videos/youtube-info')
          .query({ url });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.normalizedUrl.videoId).toBe('dQw4w9WgXcQ');
      }
    });
  });

  describe('Backward Compatibility', () => {
    it('should maintain compatibility with existing API clients', async () => {
      const mockVideoInfo = {
        id: 'dQw4w9WgXcQ',
        title: 'Test Video',
        channelTitle: 'Test Channel',
        publishedAt: '2023-01-01T00:00:00Z',
        viewCount: '1000000',
        thumbnails: {
          default: { url: 'https://example.com/thumb.jpg' }
        },
        isEmbeddable: true
      };

      youtubeService.getVideoInfo.mockResolvedValue(mockVideoInfo);

      // 従来のAPIレスポンス形式を確認
      const response = await request(app)
        .get('/api/videos/youtube-info')
        .query({ url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('videoInfo');
      expect(response.body.data).toHaveProperty('normalizedUrl');
      expect(response.body.data.videoInfo).toEqual(mockVideoInfo);
    });

    it('should handle legacy URL formats', async () => {
      const mockVideoInfo = {
        id: 'dQw4w9WgXcQ',
        title: 'Test Video',
        channelTitle: 'Test Channel',
        publishedAt: '2023-01-01T00:00:00Z',
        viewCount: '1000000',
        thumbnails: {
          default: { url: 'https://example.com/thumb.jpg' }
        },
        isEmbeddable: true
      };

      youtubeService.getVideoInfo.mockResolvedValue(mockVideoInfo);

      const legacyUrls = [
        'http://youtube.com/watch?v=dQw4w9WgXcQ', // HTTP
        'www.youtube.com/watch?v=dQw4w9WgXcQ', // プロトコルなし
        'youtube.com/watch?v=dQw4w9WgXcQ' // wwwなし
      ];

      for (const url of legacyUrls) {
        const response = await request(app)
          .get('/api/videos/youtube-info')
          .query({ url });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.normalizedUrl.canonical).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
      }
    });
  });
});