import { apiClient } from '../utils/api';

export interface VideoMetadata {
  teamName?: string;
  performanceName?: string;
  eventName?: string;
  year?: number;
  location?: string;
}

export interface Video {
  id: string;
  youtubeId: string;
  title: string;
  channelName: string;
  uploadDate: string;
  description: string;
  metadata: VideoMetadata;
  tags: string[];
  thumbnailUrl: string;
  createdAt: string;
  createdBy: string;
}

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
    standard?: { url: string };
    maxres?: { url: string };
  };
  duration: string;
  viewCount: string;
  likeCount?: string | null;
  tags?: string[] | null;
  isEmbeddable?: boolean;
  canRegister?: boolean;
}

export interface VideoListParams {
  page?: number;
  limit?: number;
  search?: string;
  teamName?: string;
  eventName?: string;
  year?: number;
  tags?: string;
}

export interface VideoListResponse {
  videos: Video[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface VideoStats {
  totalVideos: number;
  yearStats: Array<{ _id: number; count: number }>;
  teamStats: Array<{ _id: string; count: number }>;
  eventStats: Array<{ _id: string; count: number }>;
  recentVideos: Array<{
    _id: string;
    title: string;
    metadata: VideoMetadata;
    createdAt: string;
  }>;
}

export interface CreateVideoRequest {
  youtubeUrl: string;
  metadata?: VideoMetadata;
  tags?: string[];
}

export interface UpdateVideoRequest {
  metadata?: VideoMetadata;
  tags?: string[];
}

class VideoService {
  /**
   * YouTube動画情報を取得（登録前の確認用）
   */
  async getYouTubeInfo(url: string): Promise<YouTubeVideoInfo> {
    const response = await apiClient.get('/videos/youtube-info', {
      params: { url },
    });
    return response.data.data;
  }

  /**
   * 動画を登録
   */
  async createVideo(data: CreateVideoRequest): Promise<Video> {
    console.log('VideoService.createVideo called with:', data);
    try {
      const response = await apiClient.post('/videos', data);
      console.log('VideoService.createVideo response:', response.data);
      return response.data.data;
    } catch (error) {
      console.error('VideoService.createVideo error:', error);
      throw error;
    }
  }

  /**
   * 動画一覧を取得
   */
  async getVideos(params: VideoListParams = {}): Promise<VideoListResponse> {
    const response = await apiClient.get('/videos', { params });
    return response.data.data;
  }

  /**
   * 動画詳細を取得
   */
  async getVideo(id: string): Promise<Video> {
    const response = await apiClient.get(`/videos/${id}`);
    return response.data.data;
  }

  /**
   * 動画情報を更新
   */
  async updateVideo(id: string, data: UpdateVideoRequest): Promise<Video> {
    const response = await apiClient.put(`/videos/${id}`, data);
    return response.data.data;
  }

  /**
   * 動画を削除
   */
  async deleteVideo(id: string): Promise<void> {
    await apiClient.delete(`/videos/${id}`);
  }

  /**
   * 動画統計情報を取得
   */
  async getVideoStats(): Promise<VideoStats> {
    const response = await apiClient.get('/videos/stats/summary');
    return response.data.data;
  }
}

export const videoService = new VideoService();
