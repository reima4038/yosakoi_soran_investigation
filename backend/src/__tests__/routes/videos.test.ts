import request from 'supertest';
import express from 'express';
import videosRouter from '../../routes/videos';
import { youtubeService } from '../../services/youtubeService';
import { Video } from '../../models/Video';
import { URLValidationErrorType } from '../../utils/urlNormalizer';

// Express アプリケーションのセットアップ
const app = express();
app.use(express.json());
app.use('/api/videos', videosRouter);

// モック
jest.mock('../../services/youtubeService');
jest.mock('../../models/Video');
jest.mock('../../middleware', () => ({
  auth: (req: any, res: any, next: any) => {
    req.user = { userId: 'test-user-id', role: 'user' };
    next();
  }
}));

const mockYoutubeService = youtubeService as jest.Mocked<typeof youtubeService>;
const mockVideo = Video as jest.Mocked<typeof Video>;

describe('Videos API Routes - Enhanced', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/videos/youtube-info - Enhanced', () => {
    const mockVideoInfo = {
      id: 'dQw4w9WgXcQ',
      title: 'Test Video',
      channelTitle: 'Test Channel',
      publishedAt: '2023-01-01T00:00:00Z',
      description: 'Test description',
      thumbnails: {
        default: { url: 'https://example.com/thumb.jpg' },
        medium: { url: 'https://example.com/thumb_medium.jpg' },
        high: { url: 'https://example.com/thumb_high.jpg' }
      },
      duration: 'PT3M30S',
      viewCount: '1000',
      likeCount: '100',
      tags: ['test']
    };

    const mockNormalizedUrl = {
      original: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=test',
      canonical: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      videoId: 'dQw4w9WgXcQ',
      isValid: true,
      metadata: {
        playlist: 'test'
      }
    };

    it('should return video info with normalized URL for valid YouTube URL', async () => {
      mockYoutubeService.normalizeURL.mockReturnValue(mockNormalizedUrl);
      mockVideo.findOne.mockResolvedValue(null);
      mockYoutubeService.getVideoInfo.mockResolvedValue(mockVideoInfo);
      mockYoutubeService.isVideoPublic.mockResolvedValue(true);
      mockYoutubeService.isEmbeddable.mockResolvedValue(true);

      const response = await request(app)
        .get('/api/videos/youtube-info')
        .query({ url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=test' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe('dQw4w9WgXcQ');
      expect(response.body.data.normalizedUrl).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
      expect(response.body.data.originalUrl).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=test');
      expect(response.body.data.metadata.playlist).toBe('test');
      expect(response.body.language).toBe('ja'); // デフォルト言語
    });

    it('should return English error message when lang=en is specified', async () => {
      const urlError = new Error('YouTube以外のURLは登録できません');
      (urlError as any).type = URLValidationErrorType.NOT_YOUTUBE;
      
      mockYoutubeService.normalizeURL.mockImplementation(() => {
        throw urlError;
      });

      const response = await request(app)
        .get('/api/videos/youtube-info')
        .query({ 
          url: 'https://vimeo.com/123456',
          lang: 'en'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('Only YouTube URLs are supported');
      expect(response.body.error.language).toBe('en');
      expect(response.body.error.suggestion).toBe('Please enter a YouTube (youtube.com or youtu.be) URL');
    });

    it('should return Japanese error message by default', async () => {
      const urlError = new Error('YouTube以外のURLは登録できません');
      (urlError as any).type = URLValidationErrorType.NOT_YOUTUBE;
      
      mockYoutubeService.normalizeURL.mockImplementation(() => {
        throw urlError;
      });

      const response = await request(app)
        .get('/api/videos/youtube-info')
        .query({ url: 'https://vimeo.com/123456' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('YouTube以外のURLは登録できません');
      expect(response.body.error.language).toBe('ja');
      expect(response.body.error.suggestion).toBe('YouTube（youtube.com または youtu.be）のURLを入力してください');
    });

    it('should return duplicate error when video already exists', async () => {
      const existingVideo = {
        _id: 'existing-id',
        title: 'Existing Video',
        createdAt: new Date()
      };

      mockYoutubeService.normalizeURL.mockReturnValue(mockNormalizedUrl);
      mockVideo.findOne.mockResolvedValue(existingVideo as any);

      const response = await request(app)
        .get('/api/videos/youtube-info')
        .query({ url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' });

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe(URLValidationErrorType.DUPLICATE_VIDEO);
      expect(response.body.existingVideo.id).toBe('existing-id');
    });

    it('should return private video error when video is not public', async () => {
      mockYoutubeService.normalizeURL.mockReturnValue(mockNormalizedUrl);
      mockVideo.findOne.mockResolvedValue(null);
      mockYoutubeService.getVideoInfo.mockResolvedValue(mockVideoInfo);
      mockYoutubeService.isVideoPublic.mockResolvedValue(false);

      const response = await request(app)
        .get('/api/videos/youtube-info')
        .query({ url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe(URLValidationErrorType.PRIVATE_VIDEO);
      expect(response.body.error.message).toBe('この動画は非公開のため登録できません');
    });

    it('should handle YouTube API errors properly', async () => {
      const apiError = new Error('Video not found');
      (apiError as any).code = 'VIDEO_NOT_FOUND';

      mockYoutubeService.normalizeURL.mockReturnValue(mockNormalizedUrl);
      mockVideo.findOne.mockResolvedValue(null);
      mockYoutubeService.getVideoInfo.mockRejectedValue(apiError);

      const response = await request(app)
        .get('/api/videos/youtube-info')
        .query({ url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe(URLValidationErrorType.VIDEO_NOT_FOUND);
    });

    it('should detect language from Accept-Language header', async () => {
      mockYoutubeService.normalizeURL.mockReturnValue(mockNormalizedUrl);
      mockVideo.findOne.mockResolvedValue(null);
      mockYoutubeService.getVideoInfo.mockResolvedValue(mockVideoInfo);
      mockYoutubeService.isVideoPublic.mockResolvedValue(true);
      mockYoutubeService.isEmbeddable.mockResolvedValue(true);

      const response = await request(app)
        .get('/api/videos/youtube-info')
        .query({ url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' })
        .set('Accept-Language', 'en-US,en;q=0.9');

      expect(response.status).toBe(200);
      expect(response.body.language).toBe('en');
      expect(response.headers['content-language']).toBe('en');
    });

    it('should include example URL in error response when requested', async () => {
      const urlError = new Error('ビデオIDが見つかりません');
      (urlError as any).type = URLValidationErrorType.MISSING_VIDEO_ID;
      
      mockYoutubeService.normalizeURL.mockImplementation(() => {
        throw urlError;
      });

      const response = await request(app)
        .get('/api/videos/youtube-info')
        .query({ url: 'https://www.youtube.com/watch' });

      expect(response.status).toBe(400);
      expect(response.body.error.example).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    });
  });

  describe('POST /api/videos - Enhanced', () => {
    const mockVideoData = {
      youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      metadata: {
        teamName: 'Test Team',
        performanceName: 'Test Performance'
      },
      tags: ['test', 'video']
    };

    const mockNormalizedUrl = {
      original: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      canonical: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      videoId: 'dQw4w9WgXcQ',
      isValid: true
    };

    const mockVideoInfo = {
      id: 'dQw4w9WgXcQ',
      title: 'Test Video',
      channelTitle: 'Test Channel',
      publishedAt: '2023-01-01T00:00:00Z',
      description: 'Test description',
      thumbnails: {
        default: { url: 'https://example.com/thumb.jpg' },
        medium: { url: 'https://example.com/thumb_medium.jpg' },
        high: { url: 'https://example.com/thumb_high.jpg' }
      },
      duration: 'PT3M30S',
      viewCount: '1000',
      likeCount: '100',
      tags: ['test']
    };

    it('should register video successfully with enhanced response', async () => {
      const savedVideo = {
        _id: 'new-video-id',
        youtubeId: 'dQw4w9WgXcQ',
        title: 'Test Video',
        toObject: () => ({
          _id: 'new-video-id',
          youtubeId: 'dQw4w9WgXcQ',
          title: 'Test Video'
        })
      };

      mockYoutubeService.normalizeURL.mockReturnValue(mockNormalizedUrl);
      mockVideo.findOne.mockResolvedValue(null);
      mockYoutubeService.getVideoInfo.mockResolvedValue(mockVideoInfo);
      mockYoutubeService.isVideoPublic.mockResolvedValue(true);
      mockVideo.prototype.save = jest.fn().mockResolvedValue(savedVideo);

      const response = await request(app)
        .post('/api/videos')
        .send(mockVideoData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('動画が正常に登録されました');
      expect(response.body.data.normalizedUrl).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
      expect(response.body.data.originalUrl).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
      expect(response.body.language).toBe('ja');
    });

    it('should return English success message when lang=en', async () => {
      const savedVideo = {
        _id: 'new-video-id',
        youtubeId: 'dQw4w9WgXcQ',
        title: 'Test Video',
        toObject: () => ({
          _id: 'new-video-id',
          youtubeId: 'dQw4w9WgXcQ',
          title: 'Test Video'
        })
      };

      mockYoutubeService.normalizeURL.mockReturnValue(mockNormalizedUrl);
      mockVideo.findOne.mockResolvedValue(null);
      mockYoutubeService.getVideoInfo.mockResolvedValue(mockVideoInfo);
      mockYoutubeService.isVideoPublic.mockResolvedValue(true);
      mockVideo.prototype.save = jest.fn().mockResolvedValue(savedVideo);

      const response = await request(app)
        .post('/api/videos')
        .send(mockVideoData)
        .set('Accept-Language', 'en-US,en;q=0.9');

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Video registered successfully');
      expect(response.body.language).toBe('en');
    });

    it('should handle URL normalization errors in registration', async () => {
      const urlError = new Error('YouTube以外のURLは登録できません');
      (urlError as any).type = URLValidationErrorType.NOT_YOUTUBE;
      
      mockYoutubeService.normalizeURL.mockImplementation(() => {
        throw urlError;
      });

      const response = await request(app)
        .post('/api/videos')
        .send({
          ...mockVideoData,
          youtubeUrl: 'https://vimeo.com/123456'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe(URLValidationErrorType.NOT_YOUTUBE);
      expect(response.body.error.message).toBe('YouTube以外のURLは登録できません');
    });

    it('should handle validation errors with localized messages', async () => {
      const validationError = new Error('Validation failed');
      validationError.name = 'ValidationError';
      (validationError as any).errors = {
        title: { message: 'Title is required' }
      };

      mockYoutubeService.normalizeURL.mockReturnValue(mockNormalizedUrl);
      mockVideo.findOne.mockResolvedValue(null);
      mockYoutubeService.getVideoInfo.mockResolvedValue(mockVideoInfo);
      mockYoutubeService.isVideoPublic.mockResolvedValue(true);
      mockVideo.prototype.save = jest.fn().mockRejectedValue(validationError);

      const response = await request(app)
        .post('/api/videos')
        .send(mockVideoData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toBe('バリデーションエラー');
      expect(response.body.error.errors).toContain('Title is required');
    });
  });

  describe('Language Detection', () => {
    it('should prioritize query parameter over header', async () => {
      const urlError = new Error('Test error');
      (urlError as any).type = URLValidationErrorType.NOT_YOUTUBE;
      
      mockYoutubeService.normalizeURL.mockImplementation(() => {
        throw urlError;
      });

      const response = await request(app)
        .get('/api/videos/youtube-info')
        .query({ 
          url: 'https://vimeo.com/123456',
          lang: 'en'
        })
        .set('Accept-Language', 'ja-JP,ja;q=0.9');

      expect(response.body.error.language).toBe('en');
      expect(response.body.error.message).toBe('Only YouTube URLs are supported');
    });

    it('should use custom X-Language header', async () => {
      const urlError = new Error('Test error');
      (urlError as any).type = URLValidationErrorType.NOT_YOUTUBE;
      
      mockYoutubeService.normalizeURL.mockImplementation(() => {
        throw urlError;
      });

      const response = await request(app)
        .get('/api/videos/youtube-info')
        .query({ url: 'https://vimeo.com/123456' })
        .set('X-Language', 'en');

      expect(response.body.error.language).toBe('en');
      expect(response.body.error.message).toBe('Only YouTube URLs are supported');
    });
  });
});