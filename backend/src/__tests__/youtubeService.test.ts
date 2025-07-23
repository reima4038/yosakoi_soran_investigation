import { youtubeService } from '../services/youtubeService';

describe('YouTubeService', () => {
  describe('extractVideoId', () => {
    test('YouTube URLからビデオIDを正しく抽出する', () => {
      const testCases = [
        {
          url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          expected: 'dQw4w9WgXcQ'
        },
        {
          url: 'https://youtu.be/dQw4w9WgXcQ',
          expected: 'dQw4w9WgXcQ'
        },
        {
          url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
          expected: 'dQw4w9WgXcQ'
        },
        {
          url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=30s',
          expected: 'dQw4w9WgXcQ'
        },
        {
          url: 'dQw4w9WgXcQ',
          expected: 'dQw4w9WgXcQ'
        }
      ];

      testCases.forEach(({ url, expected }) => {
        const result = youtubeService.extractVideoId(url);
        expect(result).toBe(expected);
      });
    });

    test('無効なURLの場合nullを返す', () => {
      const invalidUrls = [
        'https://www.google.com',
        'not-a-url',
        'https://www.youtube.com/watch',
        'https://www.youtube.com/watch?v=',
        ''
      ];

      invalidUrls.forEach(url => {
        const result = youtubeService.extractVideoId(url);
        expect(result).toBeNull();
      });
    });
  });

  // 実際のYouTube APIを使用するテストは、APIキーが設定されている場合のみ実行
  describe('YouTube API Integration', () => {
    const hasApiKey = process.env.YOUTUBE_API_KEY && process.env.YOUTUBE_API_KEY !== '';

    const conditionalTest = hasApiKey ? test : test.skip;

    conditionalTest('有効な動画IDで動画情報を取得できる', async () => {
      // Rick Astley - Never Gonna Give You Up (公開動画)
      const videoId = 'dQw4w9WgXcQ';
      
      const videoInfo = await youtubeService.getVideoInfo(videoId);
      
      expect(videoInfo).toBeDefined();
      expect(videoInfo.id).toBe(videoId);
      expect(videoInfo.title).toBeTruthy();
      expect(videoInfo.channelTitle).toBeTruthy();
      expect(videoInfo.publishedAt).toBeTruthy();
      expect(videoInfo.thumbnails).toBeDefined();
      expect(videoInfo.thumbnails.default).toBeDefined();
      expect(videoInfo.thumbnails.default.url).toBeTruthy();
    }, 10000);

    conditionalTest('存在しない動画IDでエラーを投げる', async () => {
      const invalidVideoId = 'invalidVideoId123';
      
      await expect(youtubeService.getVideoInfo(invalidVideoId))
        .rejects
        .toMatchObject({
          code: expect.stringMatching(/VIDEO_NOT_FOUND|INVALID_VIDEO_ID/)
        });
    }, 10000);

    conditionalTest('動画の公開状態をチェックできる', async () => {
      // Rick Astley - Never Gonna Give You Up (公開動画)
      const videoId = 'dQw4w9WgXcQ';
      
      const isPublic = await youtubeService.isVideoPublic(videoId);
      expect(typeof isPublic).toBe('boolean');
    }, 10000);

    conditionalTest('動画の埋め込み可能性をチェックできる', async () => {
      // Rick Astley - Never Gonna Give You Up (埋め込み可能)
      const videoId = 'dQw4w9WgXcQ';
      
      const isEmbeddable = await youtubeService.isEmbeddable(videoId);
      expect(typeof isEmbeddable).toBe('boolean');
    }, 10000);

    conditionalTest('複数の動画情報を一括取得できる', async () => {
      const videoIds = ['dQw4w9WgXcQ', 'oHg5SJYRHA0']; // 2つの有名な動画
      
      const videoInfos = await youtubeService.getMultipleVideoInfo(videoIds);
      
      expect(Array.isArray(videoInfos)).toBe(true);
      expect(videoInfos.length).toBeGreaterThan(0);
      expect(videoInfos.length).toBeLessThanOrEqual(videoIds.length);
      
      videoInfos.forEach(info => {
        expect(info.id).toBeTruthy();
        expect(info.title).toBeTruthy();
        expect(info.channelTitle).toBeTruthy();
      });
    }, 15000);

    test('空の配列で複数動画取得を呼び出すと空配列を返す', async () => {
      const result = await youtubeService.getMultipleVideoInfo([]);
      expect(result).toEqual([]);
    });
  });
});