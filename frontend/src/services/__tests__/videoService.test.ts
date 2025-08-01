import { videoService, VideoService } from '../videoService';
import { apiClient } from '../../utils/api';

// Mock the API client
jest.mock('../../utils/api');
const mockedApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe('VideoService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getYouTubeInfo', () => {
    it('should fetch YouTube video info successfully', async () => {
      const mockResponse = {
        data: {
          data: {
            id: 'dQw4w9WgXcQ',
            title: 'Test Video',
            channelTitle: 'Test Channel',
            publishedAt: '2023-01-01T00:00:00Z',
            description: 'Test description',
            thumbnails: {
              default: { url: 'https://example.com/default.jpg' },
              medium: { url: 'https://example.com/medium.jpg' },
              high: { url: 'https://example.com/high.jpg' },
            },
            duration: 'PT3M30S',
            viewCount: '1000',
            likeCount: '100',
            tags: ['test', 'video'],
            isEmbeddable: true,
            canRegister: true,
          },
        },
      };

      mockedApiClient.get.mockResolvedValue(mockResponse);

      const result = await videoService.getYouTubeInfo(
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
      );

      expect(mockedApiClient.get).toHaveBeenCalledWith('/videos/youtube-info', {
        params: { url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
      });
      expect(result).toEqual(mockResponse.data.data);
    });

    it('should handle API errors', async () => {
      const mockError = new Error('API Error');
      mockedApiClient.get.mockRejectedValue(mockError);

      await expect(videoService.getYouTubeInfo('invalid-url')).rejects.toThrow(
        'API Error'
      );
    });
  });

  describe('createVideo', () => {
    it('should create a video successfully', async () => {
      const mockVideo = {
        _id: '507f1f77bcf86cd799439011',
        youtubeId: 'dQw4w9WgXcQ',
        title: 'Test Video',
        channelName: 'Test Channel',
        uploadDate: '2023-01-01T00:00:00Z',
        description: 'Test description',
        metadata: {
          teamName: 'Test Team',
          performanceName: 'Test Performance',
          eventName: 'Test Event',
          year: 2023,
          location: 'Test Location',
        },
        tags: ['test', 'yosakoi'],
        thumbnailUrl: 'https://example.com/thumbnail.jpg',
        createdAt: '2023-01-01T00:00:00Z',
        createdBy: {
          _id: '507f1f77bcf86cd799439012',
          username: 'testuser',
          email: 'test@example.com',
        },
      };

      const mockResponse = {
        data: {
          data: mockVideo,
        },
      };

      mockedApiClient.post.mockResolvedValue(mockResponse);

      const createData = {
        youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        metadata: {
          teamName: 'Test Team',
          performanceName: 'Test Performance',
        },
        tags: ['test', 'yosakoi'],
      };

      const result = await videoService.createVideo(createData);

      expect(mockedApiClient.post).toHaveBeenCalledWith('/videos', createData);
      expect(result).toEqual(mockVideo);
    });
  });

  describe('getVideos', () => {
    it('should fetch videos with default parameters', async () => {
      const mockResponse = {
        data: {
          data: {
            videos: [],
            pagination: {
              page: 1,
              limit: 10,
              total: 0,
              pages: 0,
            },
          },
        },
      };

      mockedApiClient.get.mockResolvedValue(mockResponse);

      const result = await videoService.getVideos();

      expect(mockedApiClient.get).toHaveBeenCalledWith('/videos', {
        params: {},
      });
      expect(result).toEqual(mockResponse.data.data);
    });

    it('should fetch videos with custom parameters', async () => {
      const mockResponse = {
        data: {
          data: {
            videos: [],
            pagination: {
              page: 2,
              limit: 20,
              total: 0,
              pages: 0,
            },
          },
        },
      };

      mockedApiClient.get.mockResolvedValue(mockResponse);

      const params = {
        page: 2,
        limit: 20,
        search: 'test',
        teamName: 'Test Team',
        year: 2023,
      };

      const result = await videoService.getVideos(params);

      expect(mockedApiClient.get).toHaveBeenCalledWith('/videos', { params });
      expect(result).toEqual(mockResponse.data.data);
    });
  });

  describe('getVideo', () => {
    it('should fetch a single video', async () => {
      const mockVideo = {
        _id: '507f1f77bcf86cd799439011',
        youtubeId: 'dQw4w9WgXcQ',
        title: 'Test Video',
        channelName: 'Test Channel',
        uploadDate: '2023-01-01T00:00:00Z',
        description: 'Test description',
        metadata: {},
        tags: [],
        thumbnailUrl: 'https://example.com/thumbnail.jpg',
        createdAt: '2023-01-01T00:00:00Z',
        createdBy: {
          _id: '507f1f77bcf86cd799439012',
          username: 'testuser',
          email: 'test@example.com',
        },
      };

      const mockResponse = {
        data: {
          data: mockVideo,
        },
      };

      mockedApiClient.get.mockResolvedValue(mockResponse);

      const result = await videoService.getVideo('507f1f77bcf86cd799439011');

      expect(mockedApiClient.get).toHaveBeenCalledWith(
        '/videos/507f1f77bcf86cd799439011'
      );
      expect(result).toEqual(mockVideo);
    });
  });

  describe('updateVideo', () => {
    it('should update a video successfully', async () => {
      const mockVideo = {
        _id: '507f1f77bcf86cd799439011',
        youtubeId: 'dQw4w9WgXcQ',
        title: 'Updated Video',
        channelName: 'Test Channel',
        uploadDate: '2023-01-01T00:00:00Z',
        description: 'Updated description',
        metadata: {
          teamName: 'Updated Team',
        },
        tags: ['updated', 'test'],
        thumbnailUrl: 'https://example.com/thumbnail.jpg',
        createdAt: '2023-01-01T00:00:00Z',
        createdBy: {
          _id: '507f1f77bcf86cd799439012',
          username: 'testuser',
          email: 'test@example.com',
        },
      };

      const mockResponse = {
        data: {
          data: mockVideo,
        },
      };

      mockedApiClient.put.mockResolvedValue(mockResponse);

      const updateData = {
        metadata: {
          teamName: 'Updated Team',
        },
        tags: ['updated', 'test'],
      };

      const result = await videoService.updateVideo(
        '507f1f77bcf86cd799439011',
        updateData
      );

      expect(mockedApiClient.put).toHaveBeenCalledWith(
        '/videos/507f1f77bcf86cd799439011',
        updateData
      );
      expect(result).toEqual(mockVideo);
    });
  });

  describe('deleteVideo', () => {
    it('should delete a video successfully', async () => {
      mockedApiClient.delete.mockResolvedValue({});

      await videoService.deleteVideo('507f1f77bcf86cd799439011');

      expect(mockedApiClient.delete).toHaveBeenCalledWith(
        '/videos/507f1f77bcf86cd799439011'
      );
    });
  });

  describe('getVideoStats', () => {
    it('should fetch video statistics', async () => {
      const mockStats = {
        totalVideos: 100,
        yearStats: [
          { _id: 2023, count: 50 },
          { _id: 2022, count: 30 },
        ],
        teamStats: [
          { _id: 'Team A', count: 25 },
          { _id: 'Team B', count: 20 },
        ],
        eventStats: [
          { _id: 'Event 1', count: 40 },
          { _id: 'Event 2', count: 35 },
        ],
        recentVideos: [
          {
            _id: '507f1f77bcf86cd799439011',
            title: 'Recent Video',
            metadata: { teamName: 'Team A' },
            createdAt: '2023-01-01T00:00:00Z',
          },
        ],
      };

      const mockResponse = {
        data: {
          data: mockStats,
        },
      };

      mockedApiClient.get.mockResolvedValue(mockResponse);

      const result = await videoService.getVideoStats();

      expect(mockedApiClient.get).toHaveBeenCalledWith('/videos/stats/summary');
      expect(result).toEqual(mockStats);
    });
  });

  describe('Error Handling', () => {
    it('should propagate API errors', async () => {
      const mockError = {
        response: {
          status: 404,
          data: {
            message: 'Video not found',
          },
        },
      };

      mockedApiClient.get.mockRejectedValue(mockError);

      await expect(videoService.getVideo('invalid-id')).rejects.toEqual(
        mockError
      );
    });

    it('should handle network errors', async () => {
      const networkError = new Error('Network Error');
      mockedApiClient.get.mockRejectedValue(networkError);

      await expect(videoService.getVideos()).rejects.toThrow('Network Error');
    });
  });
});
