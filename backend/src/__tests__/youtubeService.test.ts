import { youtubeService } from '../services/youtubeService';
import { URLValidationErrorType, YouTubeURLNormalizer } from '../utils/urlNormalizer';
import { ErrorMessageManager } from '../utils/errorMessages';

describe('YouTubeService', () => {
  // console.warnをモック化してテスト出力をクリーンにする
  beforeAll(() => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe('extractVideoId', () => {
    test('YouTube URLからビデオIDを正しく抽出する（拡張版）', () => {
      const testCases = [
        // 基本的なURL形式
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
        // 追加パラメータ付きURL（要件1.1）
        {
          url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PLrAXtmRdnEQy8VJqQzNlkVjYoungUdmzP&index=1',
          expected: 'dQw4w9WgXcQ'
        },
        // タイムスタンプ付きURL（要件1.2）
        {
          url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=30s',
          expected: 'dQw4w9WgXcQ'
        },
        // 短縮URL（要件1.3）
        {
          url: 'https://youtu.be/dQw4w9WgXcQ?si=SHARE_ID',
          expected: 'dQw4w9WgXcQ'
        },
        // 埋め込みURL（要件1.4）
        {
          url: 'https://www.youtube.com/embed/dQw4w9WgXcQ?start=30',
          expected: 'dQw4w9WgXcQ'
        },
        // モバイル版URL
        {
          url: 'https://m.youtube.com/watch?v=dQw4w9WgXcQ',
          expected: 'dQw4w9WgXcQ'
        },
        // プロトコルなしURL
        {
          url: 'youtube.com/watch?v=dQw4w9WgXcQ',
          expected: 'dQw4w9WgXcQ'
        },
        // 直接ビデオID
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

    test.skip('有効な動画IDで動画情報を取得できる', async () => {
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

    test.skip('存在しない動画IDでエラーを投げる', async () => {
      const invalidVideoId = 'invalidVideoId123';
      
      await expect(youtubeService.getVideoInfo(invalidVideoId))
        .rejects
        .toMatchObject({
          code: expect.stringMatching(/VIDEO_NOT_FOUND|INVALID_VIDEO_ID/)
        });
    }, 10000);

    test.skip('動画の公開状態をチェックできる', async () => {
      // Rick Astley - Never Gonna Give You Up (公開動画)
      const videoId = 'dQw4w9WgXcQ';
      
      const isPublic = await youtubeService.isVideoPublic(videoId);
      expect(typeof isPublic).toBe('boolean');
    }, 10000);

    test.skip('動画の埋め込み可能性をチェックできる', async () => {
      // Rick Astley - Never Gonna Give You Up (埋め込み可能)
      const videoId = 'dQw4w9WgXcQ';
      
      const isEmbeddable = await youtubeService.isEmbeddable(videoId);
      expect(typeof isEmbeddable).toBe('boolean');
    }, 10000);

    test.skip('複数の動画情報を一括取得できる', async () => {
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

  describe('normalizeURL', () => {
    test('URLを正規化して詳細情報を返す', () => {
      const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PLtest&index=1&t=30s';
      const result = youtubeService.normalizeURL(url);
      
      expect(result.isValid).toBe(true);
      expect(result.videoId).toBe('dQw4w9WgXcQ');
      expect(result.canonical).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
      expect(result.original).toBe(url);
      expect(result.metadata?.playlist).toBe('PLtest');
      expect(result.metadata?.index).toBe(1);
      expect(result.metadata?.timestamp).toBe(30);
    });

    test('無効なURLでエラーを投げる', () => {
      expect(() => youtubeService.normalizeURL('https://vimeo.com/123456'))
        .toThrow();
    });
  });

  describe('normalizeMultipleURLs', () => {
    test('複数のURLを一括で正規化する', () => {
      const urls = [
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        'https://youtu.be/jNQXAC9IVRw',
        'https://example.com/not-youtube'
      ];

      const results = youtubeService.normalizeMultipleURLs(urls);
      
      expect(results).toHaveLength(3);
      expect(results[0].isValid).toBe(true);
      expect(results[0].videoId).toBe('dQw4w9WgXcQ');
      expect(results[1].isValid).toBe(true);
      expect(results[1].videoId).toBe('jNQXAC9IVRw');
      expect(results[2].isValid).toBe(false);
    });
  });

  describe('error message functionality', () => {
    test('getLocalizedErrorMessage should return localized error messages', () => {
      // URLValidationErrorを作成
      const error = {
        name: 'URLValidationError',
        message: 'Test error',
        type: URLValidationErrorType.NOT_YOUTUBE
      } as any;

      const jaMessage = youtubeService.getLocalizedErrorMessage(error, 'ja');
      const enMessage = youtubeService.getLocalizedErrorMessage(error, 'en');

      expect(jaMessage.message).toBe('YouTube以外のURLは登録できません');
      expect(enMessage.message).toBe('Only YouTube URLs are supported');
    });

    test('getFormattedErrorMessage should return formatted error messages', () => {
      const error = {
        name: 'URLValidationError',
        message: 'Test error',
        type: URLValidationErrorType.MISSING_VIDEO_ID
      } as any;

      const formatted = youtubeService.getFormattedErrorMessage(error, 'ja', true);
      
      expect(formatted).toContain('ビデオIDが見つかりません');
      expect(formatted).toContain('完全なYouTube URLを入力してください');
      expect(formatted).toContain('例: https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    });

    test('generateUserHelpMessage should return structured help message', () => {
      const error = {
        name: 'URLValidationError',
        message: 'Test error',
        type: URLValidationErrorType.PRIVATE_VIDEO
      } as any;

      const help = youtubeService.generateUserHelpMessage(error, 'ja');
      
      expect(help.title).toBe('URL検証エラー');
      expect(help.message).toBe('この動画は非公開のため登録できません');
      expect(help.suggestion).toBe('公開されている動画のURLを入力してください');
      expect(help.userAction).toBe('動画の公開設定を確認するか、別の動画を選択してください');
    });

    test('should handle error messages for all error types', () => {
      const errorTypes = Object.values(URLValidationErrorType);
      
      errorTypes.forEach(errorType => {
        const error = {
          name: 'URLValidationError',
          message: 'Test error',
          type: errorType
        } as any;

        const jaMessage = youtubeService.getLocalizedErrorMessage(error, 'ja');
        const enMessage = youtubeService.getLocalizedErrorMessage(error, 'en');
        
        expect(jaMessage.message).toBeTruthy();
        expect(enMessage.message).toBeTruthy();
      });
    });
  });
});