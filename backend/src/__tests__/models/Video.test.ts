import { Video } from '../../models/Video';
import { User, UserRole } from '../../models/User';
import { connectDB, disconnectDB } from '../setup';

describe('Video Model', () => {
  let testUser: any;

  beforeAll(async () => {
    await connectDB();
  });

  afterAll(async () => {
    await disconnectDB();
  });

  beforeEach(async () => {
    await Video.deleteMany({});
    await User.deleteMany({});

    // Create a test user
    const userData = {
      username: 'testuser',
      email: 'test@example.com',
      passwordHash: 'password123',
      role: UserRole.USER
    };
    testUser = await new User(userData).save();
  });

  describe('Video Creation', () => {
    it('should create a video with valid data', async () => {
      const videoData = {
        youtubeId: 'dQw4w9WgXcQ',
        title: 'Test Video',
        channelName: 'Test Channel',
        uploadDate: new Date('2023-01-01'),
        description: 'Test description',
        metadata: {
          teamName: 'Test Team',
          performanceName: 'Test Performance',
          eventName: 'Test Event',
          year: 2023,
          location: 'Test Location'
        },
        tags: ['test', 'yosakoi'],
        thumbnailUrl: 'https://example.com/thumbnail.jpg',
        createdBy: testUser._id
      };

      const video = new Video(videoData);
      const savedVideo = await video.save();

      expect(savedVideo.youtubeId).toBe(videoData.youtubeId);
      expect(savedVideo.title).toBe(videoData.title);
      expect(savedVideo.channelName).toBe(videoData.channelName);
      expect(savedVideo.uploadDate).toEqual(videoData.uploadDate);
      expect(savedVideo.description).toBe(videoData.description);
      expect(savedVideo.metadata.teamName).toBe(videoData.metadata.teamName);
      expect(savedVideo.metadata.performanceName).toBe(videoData.metadata.performanceName);
      expect(savedVideo.metadata.eventName).toBe(videoData.metadata.eventName);
      expect(savedVideo.metadata.year).toBe(videoData.metadata.year);
      expect(savedVideo.metadata.location).toBe(videoData.metadata.location);
      expect(savedVideo.tags).toEqual(videoData.tags);
      expect(savedVideo.thumbnailUrl).toBe(videoData.thumbnailUrl);
      expect(savedVideo.createdBy).toEqual(testUser._id);
      expect(savedVideo.createdAt).toBeDefined();
    });

    it('should create video with minimal required data', async () => {
      const videoData = {
        youtubeId: 'dQw4w9WgXcQ',
        title: 'Test Video',
        channelName: 'Test Channel',
        uploadDate: new Date('2023-01-01'),
        thumbnailUrl: 'https://example.com/thumbnail.jpg',
        createdBy: testUser._id
      };

      const video = new Video(videoData);
      const savedVideo = await video.save();

      expect(savedVideo.youtubeId).toBe(videoData.youtubeId);
      expect(savedVideo.title).toBe(videoData.title);
      expect(savedVideo.channelName).toBe(videoData.channelName);
      expect(savedVideo.description).toBe('');
      expect(savedVideo.tags).toEqual([]);
      expect(savedVideo.metadata).toEqual({});
    });
  });

  describe('Validation', () => {
    it('should require youtubeId', async () => {
      const videoData = {
        title: 'Test Video',
        channelName: 'Test Channel',
        uploadDate: new Date('2023-01-01'),
        thumbnailUrl: 'https://example.com/thumbnail.jpg',
        createdBy: testUser._id
      };

      const video = new Video(videoData);

      await expect(video.save()).rejects.toThrow('YouTube動画IDは必須です');
    });

    it('should validate youtubeId format', async () => {
      const videoData = {
        youtubeId: 'invalid-id', // Invalid format
        title: 'Test Video',
        channelName: 'Test Channel',
        uploadDate: new Date('2023-01-01'),
        thumbnailUrl: 'https://example.com/thumbnail.jpg',
        createdBy: testUser._id
      };

      const video = new Video(videoData);

      await expect(video.save()).rejects.toThrow('有効なYouTube動画IDを入力してください');
    });

    it('should require title', async () => {
      const videoData = {
        youtubeId: 'dQw4w9WgXcQ',
        channelName: 'Test Channel',
        uploadDate: new Date('2023-01-01'),
        thumbnailUrl: 'https://example.com/thumbnail.jpg',
        createdBy: testUser._id
      };

      const video = new Video(videoData);

      await expect(video.save()).rejects.toThrow('タイトルは必須です');
    });

    it('should require channelName', async () => {
      const videoData = {
        youtubeId: 'dQw4w9WgXcQ',
        title: 'Test Video',
        uploadDate: new Date('2023-01-01'),
        thumbnailUrl: 'https://example.com/thumbnail.jpg',
        createdBy: testUser._id
      };

      const video = new Video(videoData);

      await expect(video.save()).rejects.toThrow('チャンネル名は必須です');
    });

    it('should require uploadDate', async () => {
      const videoData = {
        youtubeId: 'dQw4w9WgXcQ',
        title: 'Test Video',
        channelName: 'Test Channel',
        thumbnailUrl: 'https://example.com/thumbnail.jpg',
        createdBy: testUser._id
      };

      const video = new Video(videoData);

      await expect(video.save()).rejects.toThrow('アップロード日は必須です');
    });

    it('should require thumbnailUrl', async () => {
      const videoData = {
        youtubeId: 'dQw4w9WgXcQ',
        title: 'Test Video',
        channelName: 'Test Channel',
        uploadDate: new Date('2023-01-01'),
        createdBy: testUser._id
      };

      const video = new Video(videoData);

      await expect(video.save()).rejects.toThrow('サムネイルURLは必須です');
    });

    it('should require createdBy', async () => {
      const videoData = {
        youtubeId: 'dQw4w9WgXcQ',
        title: 'Test Video',
        channelName: 'Test Channel',
        uploadDate: new Date('2023-01-01'),
        thumbnailUrl: 'https://example.com/thumbnail.jpg'
      };

      const video = new Video(videoData);

      await expect(video.save()).rejects.toThrow('作成者は必須です');
    });

    it('should validate title length', async () => {
      const videoData = {
        youtubeId: 'dQw4w9WgXcQ',
        title: 'a'.repeat(201), // Too long
        channelName: 'Test Channel',
        uploadDate: new Date('2023-01-01'),
        thumbnailUrl: 'https://example.com/thumbnail.jpg',
        createdBy: testUser._id
      };

      const video = new Video(videoData);

      await expect(video.save()).rejects.toThrow('タイトルは200文字以下である必要があります');
    });

    it('should validate channelName length', async () => {
      const videoData = {
        youtubeId: 'dQw4w9WgXcQ',
        title: 'Test Video',
        channelName: 'a'.repeat(101), // Too long
        uploadDate: new Date('2023-01-01'),
        thumbnailUrl: 'https://example.com/thumbnail.jpg',
        createdBy: testUser._id
      };

      const video = new Video(videoData);

      await expect(video.save()).rejects.toThrow('チャンネル名は100文字以下である必要があります');
    });

    it('should validate description length', async () => {
      const videoData = {
        youtubeId: 'dQw4w9WgXcQ',
        title: 'Test Video',
        channelName: 'Test Channel',
        uploadDate: new Date('2023-01-01'),
        description: 'a'.repeat(2001), // Too long
        thumbnailUrl: 'https://example.com/thumbnail.jpg',
        createdBy: testUser._id
      };

      const video = new Video(videoData);

      await expect(video.save()).rejects.toThrow('説明は2000文字以下である必要があります');
    });

    it('should validate thumbnailUrl format', async () => {
      const videoData = {
        youtubeId: 'dQw4w9WgXcQ',
        title: 'Test Video',
        channelName: 'Test Channel',
        uploadDate: new Date('2023-01-01'),
        thumbnailUrl: 'invalid-url', // Invalid URL
        createdBy: testUser._id
      };

      const video = new Video(videoData);

      await expect(video.save()).rejects.toThrow('サムネイルURLは有効なURLである必要があります');
    });

    it('should validate metadata field lengths', async () => {
      const videoData = {
        youtubeId: 'dQw4w9WgXcQ',
        title: 'Test Video',
        channelName: 'Test Channel',
        uploadDate: new Date('2023-01-01'),
        thumbnailUrl: 'https://example.com/thumbnail.jpg',
        metadata: {
          teamName: 'a'.repeat(101), // Too long
          performanceName: 'a'.repeat(101), // Too long
          eventName: 'a'.repeat(101), // Too long
          location: 'a'.repeat(101) // Too long
        },
        createdBy: testUser._id
      };

      const video = new Video(videoData);

      await expect(video.save()).rejects.toThrow();
    });

    it('should validate metadata year range', async () => {
      const videoData = {
        youtubeId: 'dQw4w9WgXcQ',
        title: 'Test Video',
        channelName: 'Test Channel',
        uploadDate: new Date('2023-01-01'),
        thumbnailUrl: 'https://example.com/thumbnail.jpg',
        metadata: {
          year: 1800 // Too old
        },
        createdBy: testUser._id
      };

      const video = new Video(videoData);

      await expect(video.save()).rejects.toThrow('年度は1900年以降である必要があります');
    });

    it('should validate tag length', async () => {
      const videoData = {
        youtubeId: 'dQw4w9WgXcQ',
        title: 'Test Video',
        channelName: 'Test Channel',
        uploadDate: new Date('2023-01-01'),
        thumbnailUrl: 'https://example.com/thumbnail.jpg',
        tags: ['a'.repeat(31)], // Tag too long
        createdBy: testUser._id
      };

      const video = new Video(videoData);

      await expect(video.save()).rejects.toThrow('タグは30文字以下である必要があります');
    });
  });

  describe('Unique Constraints', () => {
    it('should enforce unique youtubeId', async () => {
      const videoData1 = {
        youtubeId: 'dQw4w9WgXcQ',
        title: 'Test Video 1',
        channelName: 'Test Channel',
        uploadDate: new Date('2023-01-01'),
        thumbnailUrl: 'https://example.com/thumbnail.jpg',
        createdBy: testUser._id
      };

      const videoData2 = {
        youtubeId: 'dQw4w9WgXcQ', // Same youtubeId
        title: 'Test Video 2',
        channelName: 'Test Channel',
        uploadDate: new Date('2023-01-01'),
        thumbnailUrl: 'https://example.com/thumbnail.jpg',
        createdBy: testUser._id
      };

      const video1 = new Video(videoData1);
      await video1.save();

      const video2 = new Video(videoData2);
      await expect(video2.save()).rejects.toThrow();
    });
  });

  describe('Indexes', () => {
    it('should have proper indexes', async () => {
      const indexes = await Video.collection.getIndexes();
      const indexNames = Object.keys(indexes);

      expect(indexNames).toContain('youtubeId_1');
      expect(indexNames).toContain('createdBy_1');
      expect(indexNames).toContain('metadata.teamName_1');
      expect(indexNames).toContain('metadata.eventName_1');
      expect(indexNames).toContain('metadata.year_1');
      expect(indexNames).toContain('tags_1');
      expect(indexNames).toContain('createdAt_-1');
    });
  });
});