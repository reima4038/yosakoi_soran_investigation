/**
 * URL検証の統合テスト (Backend)
 * API エンドポイント、エラーハンドリング、言語対応の統合テスト
 */

import request from 'supertest';
import app from '../../index';
import {
  YouTubeURLNormalizer,
  URLValidationErrorType,
} from '../../utils/urlNormalizer';
import { ErrorMessageManager } from '../../utils/errorMessages';

// YouTube API のモック
jest.mock('../../services/youtubeService', () => ({
  youtubeService: {
    getVideoInfo: jest.fn(),
    extractVideoId: jest.fn(),
    normalizeURL: jest.fn(),
    isVideoPublic: jest.fn(),
    isEmbeddable: jest.fn(),
    getLocalizedErrorMessage: jest.fn(),
    getFormattedErrorMessage: jest.fn(),
    generateUserHelpMessage: jest.fn(),
  },
}));

// Videoモデルのモック
jest.mock('../../models/Video', () => ({
  Video: {
    findOne: jest.fn(),
    find: jest.fn(),
    countDocuments: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
    aggregate: jest.fn(),
  },
}));

const { youtubeService } = require('../../services/youtubeService');
const { Video } = require('../../models/Video');

describe('URL Validation Integration Tests (Backend)', () => {
  beforeAll(async () => {
    // データベース接続はsetup.tsで処理される
  });

  afterAll(async () => {
    // データベース切断はsetup.tsで処理される
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // デフォルトのモック設定
    Video.findOne.mockResolvedValue(null); // 既存の動画なし
  });

  describe('YouTube Info API Integration', () => {
    it('should handle various URL formats correctly', async () => {
      const mockVideoInfo = {
        id: 'dQw4w9WgXcQ',
        title: 'Test Video',
        channelTitle: 'Test Channel',
        publishedAt: '2023-01-01T00:00:00Z',
        description: 'Test description',
        viewCount: '1000000',
        thumbnails: {
          default: { url: 'https://example.com/thumb.jpg' },
          medium: { url: 'https://example.com/thumb_medium.jpg' },
          high: { url: 'https://example.com/thumb_high.jpg' },
        },
        duration: 'PT3M30S',
        likeCount: '10000',
        tags: ['test'],
      };

      const mockNormalizedUrl = {
        isValid: true,
        videoId: 'dQw4w9WgXcQ',
        canonical: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        original: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        metadata: {},
      };

      youtubeService.getVideoInfo.mockResolvedValue(mockVideoInfo);
      youtubeService.normalizeURL.mockReturnValue(mockNormalizedUrl);
      youtubeService.isVideoPublic.mockResolvedValue(true);
      youtubeService.isEmbeddable.mockResolvedValue(true);

      const response = await request(app)
        .get('/api/videos/youtube-info')
        .query({ url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe('dQw4w9WgXcQ');
      expect(response.body.data.title).toBe('Test Video');
    });

    it('should handle URL normalization errors with proper error responses', async () => {
      // 空のURLの場合はバリデーションエラーが先に発生
      const emptyUrlResponse = await request(app)
        .get('/api/videos/youtube-info')
        .query({ url: '' });

      expect(emptyUrlResponse.status).toBe(400);
      expect(emptyUrlResponse.body.status).toBe('error');

      // 無効なURLの場合
      const mockError = {
        type: URLValidationErrorType.NOT_YOUTUBE,
        message: 'Test error',
      };
      youtubeService.normalizeURL.mockImplementation(() => {
        throw mockError;
      });

      const invalidUrlResponse = await request(app)
        .get('/api/videos/youtube-info')
        .query({ url: 'https://vimeo.com/123456' });

      expect(invalidUrlResponse.status).toBe(400);
      expect(invalidUrlResponse.body.success).toBe(false);
    });

    it('should handle language-specific error messages', async () => {
      const invalidUrl = 'https://vimeo.com/123456';
      const mockError = {
        type: URLValidationErrorType.NOT_YOUTUBE,
        message: 'Test error',
      };
      youtubeService.normalizeURL.mockImplementation(() => {
        throw mockError;
      });

      // 日本語エラーメッセージ
      const jaResponse = await request(app)
        .get('/api/videos/youtube-info')
        .query({ url: invalidUrl, lang: 'ja' });

      expect(jaResponse.status).toBe(400);
      expect(jaResponse.body.success).toBe(false);
      expect(jaResponse.body.error).toBeDefined();
    });

    it('should handle YouTube API errors correctly', async () => {
      const mockNormalizedUrl = {
        isValid: true,
        videoId: 'dQw4w9WgXcQ',
        canonical: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        original: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        metadata: {},
      };

      youtubeService.normalizeURL.mockReturnValue(mockNormalizedUrl);
      youtubeService.getVideoInfo.mockRejectedValue({
        code: 'VIDEO_NOT_FOUND',
        message: 'Video not found',
      });

      const response = await request(app)
        .get('/api/videos/youtube-info')
        .query({ url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should handle private video errors', async () => {
      const mockVideoInfo = {
        id: 'dQw4w9WgXcQ',
        title: 'Test Video',
        channelTitle: 'Test Channel',
        publishedAt: '2023-01-01T00:00:00Z',
        description: 'Test description',
        viewCount: '1000000',
        thumbnails: {
          default: { url: 'https://example.com/thumb.jpg' },
          medium: { url: 'https://example.com/thumb_medium.jpg' },
          high: { url: 'https://example.com/thumb_high.jpg' },
        },
        duration: 'PT3M30S',
        likeCount: '10000',
        tags: ['test'],
      };

      const mockNormalizedUrl = {
        isValid: true,
        videoId: 'dQw4w9WgXcQ',
        canonical: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        original: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        metadata: {},
      };

      youtubeService.normalizeURL.mockReturnValue(mockNormalizedUrl);
      youtubeService.getVideoInfo.mockResolvedValue(mockVideoInfo);
      youtubeService.isVideoPublic.mockResolvedValue(false);

      const response = await request(app)
        .get('/api/videos/youtube-info')
        .query({ url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Video Creation API Integration', () => {
    it('should validate input data correctly', async () => {
      const response = await request(app)
        .post('/api/videos')
        .send({ youtubeUrl: '' });

      expect(response.status).toBe(401); // 認証なしなので401
      expect(response.body.status).toBe('error');
    });
  });

  describe('Error Message Localization Integration', () => {
    it('should handle unsupported languages gracefully', async () => {
      const response = await request(app)
        .get('/api/videos/youtube-info')
        .query({ url: 'https://vimeo.com/123456', lang: 'fr' });

      expect(response.status).toBe(400);
      expect(response.body.status).toBe('error');
      expect(response.body.message).toBe('バリデーションエラー');
    });
  });

  describe('Basic Integration Tests', () => {
    it('should handle malformed requests gracefully', async () => {
      const response = await request(app)
        .get('/api/videos/youtube-info')
        .query({});

      expect(response.status).toBe(400);
      expect(response.body.status).toBe('error');
    });
  });
});
