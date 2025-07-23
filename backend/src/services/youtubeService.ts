import { google } from 'googleapis';
import { config } from '../config';

export interface YouTubeVideoInfo {
  id: string;
  title: string;
  channelTitle: string;
  publishedAt: string;
  description: string;
  thumbnails: {
    default: { url: string };
    medium: { url: string };
    high: { url: string };
    standard?: { url: string } | undefined;
    maxres?: { url: string } | undefined;
  };
  duration: string;
  viewCount: string;
  likeCount?: string | null;
  tags?: string[] | null;
}

export interface YouTubeError {
  code: string;
  message: string;
  details?: any;
}

class YouTubeService {
  private youtube;

  constructor() {
    this.youtube = google.youtube({
      version: 'v3',
      auth: config.youtubeApiKey
    });
  }

  /**
   * YouTube URLからビデオIDを抽出
   */
  extractVideoId(url: string): string | null {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /^([a-zA-Z0-9_-]{11})$/ // 直接ビデオIDが渡された場合
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    return null;
  }

  /**
   * YouTube動画の情報を取得
   */
  async getVideoInfo(videoId: string): Promise<YouTubeVideoInfo> {
    try {
      const response = await this.youtube.videos.list({
        part: ['snippet', 'contentDetails', 'statistics'],
        id: [videoId]
      });

      if (!response.data.items || response.data.items.length === 0) {
        throw new Error('VIDEO_NOT_FOUND');
      }

      const video = response.data.items[0];
      const snippet = video.snippet!;
      const statistics = video.statistics!;

      return {
        id: videoId,
        title: snippet.title || '',
        channelTitle: snippet.channelTitle || '',
        publishedAt: snippet.publishedAt || '',
        description: snippet.description || '',
        thumbnails: snippet.thumbnails ? {
          default: { url: snippet.thumbnails.default?.url || '' },
          medium: { url: snippet.thumbnails.medium?.url || '' },
          high: { url: snippet.thumbnails.high?.url || '' },
          ...(snippet.thumbnails.standard && { standard: { url: snippet.thumbnails.standard.url || '' } }),
          ...(snippet.thumbnails.maxres && { maxres: { url: snippet.thumbnails.maxres.url || '' } })
        } : {
          default: { url: '' },
          medium: { url: '' },
          high: { url: '' }
        },
        duration: video.contentDetails?.duration || '',
        viewCount: statistics.viewCount || '0',
        likeCount: statistics.likeCount || null,
        tags: snippet.tags || null
      };
    } catch (error: any) {
      console.error('YouTube API Error:', error);
      
      if (error.code === 403) {
        throw {
          code: 'API_QUOTA_EXCEEDED',
          message: 'YouTube API のクォータを超過しました',
          details: error
        } as YouTubeError;
      }
      
      if (error.code === 404 || error.message === 'VIDEO_NOT_FOUND') {
        throw {
          code: 'VIDEO_NOT_FOUND',
          message: '指定された動画が見つかりません',
          details: error
        } as YouTubeError;
      }

      if (error.code === 400) {
        throw {
          code: 'INVALID_VIDEO_ID',
          message: '無効な動画IDです',
          details: error
        } as YouTubeError;
      }

      throw {
        code: 'YOUTUBE_API_ERROR',
        message: 'YouTube API でエラーが発生しました',
        details: error
      } as YouTubeError;
    }
  }

  /**
   * 動画が公開されているかチェック
   */
  async isVideoPublic(videoId: string): Promise<boolean> {
    try {
      const response = await this.youtube.videos.list({
        part: ['status'],
        id: [videoId]
      });

      if (!response.data.items || response.data.items.length === 0) {
        return false;
      }

      const video = response.data.items[0];
      return video.status?.privacyStatus === 'public';
    } catch (error) {
      console.error('Error checking video privacy:', error);
      return false;
    }
  }

  /**
   * 動画の埋め込みが許可されているかチェック
   */
  async isEmbeddable(videoId: string): Promise<boolean> {
    try {
      const response = await this.youtube.videos.list({
        part: ['status'],
        id: [videoId]
      });

      if (!response.data.items || response.data.items.length === 0) {
        return false;
      }

      const video = response.data.items[0];
      return video.status?.embeddable !== false;
    } catch (error) {
      console.error('Error checking video embeddability:', error);
      return false;
    }
  }

  /**
   * 複数の動画情報を一括取得
   */
  async getMultipleVideoInfo(videoIds: string[]): Promise<YouTubeVideoInfo[]> {
    if (videoIds.length === 0) {
      return [];
    }

    // YouTube API は一度に最大50個の動画IDを処理可能
    const batchSize = 50;
    const results: YouTubeVideoInfo[] = [];

    for (let i = 0; i < videoIds.length; i += batchSize) {
      const batch = videoIds.slice(i, i + batchSize);
      
      try {
        const response = await this.youtube.videos.list({
          part: ['snippet', 'contentDetails', 'statistics'],
          id: batch
        });

        if (response.data.items) {
          for (const video of response.data.items) {
            const snippet = video.snippet!;
            const statistics = video.statistics!;

            results.push({
              id: video.id!,
              title: snippet.title || '',
              channelTitle: snippet.channelTitle || '',
              publishedAt: snippet.publishedAt || '',
              description: snippet.description || '',
              thumbnails: snippet.thumbnails ? {
                default: { url: snippet.thumbnails.default?.url || '' },
                medium: { url: snippet.thumbnails.medium?.url || '' },
                high: { url: snippet.thumbnails.high?.url || '' },
                ...(snippet.thumbnails.standard && { standard: { url: snippet.thumbnails.standard.url || '' } }),
                ...(snippet.thumbnails.maxres && { maxres: { url: snippet.thumbnails.maxres.url || '' } })
              } : {
                default: { url: '' },
                medium: { url: '' },
                high: { url: '' }
              },
              duration: video.contentDetails?.duration || '',
              viewCount: statistics.viewCount || '0',
              likeCount: statistics.likeCount || null,
              tags: snippet.tags || null
            });
          }
        }
      } catch (error) {
        console.error(`Error fetching batch ${i}-${i + batchSize}:`, error);
        // バッチの一部でエラーが発生しても、他のバッチの処理は続行
      }
    }

    return results;
  }
}

export const youtubeService = new YouTubeService();