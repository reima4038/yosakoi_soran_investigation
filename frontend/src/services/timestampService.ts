import { api } from '../utils/api';

export interface TimestampLink {
  _id: string;
  videoId: string;
  shareId?: string;
  evaluationId?: string;
  sessionId?: string;
  creatorId: string;
  title: string;
  description?: string;
  startTime: number; // 秒単位
  endTime?: number; // 秒単位（ハイライト区間の場合）
  isHighlight: boolean;
  tags: string[];
  shareToken: string;
  isPublic: boolean;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTimestampLinkRequest {
  videoId: string;
  shareId?: string;
  evaluationId?: string;
  sessionId?: string;
  title: string;
  description?: string;
  startTime: number;
  endTime?: number;
  isHighlight?: boolean;
  tags?: string[];
  isPublic?: boolean;
}

export interface TimestampComment {
  _id: string;
  timestampLinkId: string;
  userId: string;
  content: string;
  timestamp: number; // コメント内の相対時間
  createdAt: string;
}

export interface EmbedOptions {
  width?: number;
  height?: number;
  autoplay?: boolean;
  controls?: boolean;
  showTitle?: boolean;
  showDescription?: boolean;
  theme?: 'light' | 'dark';
}

class TimestampService {
  /**
   * タイムスタンプリンクを作成
   */
  async createTimestampLink(data: CreateTimestampLinkRequest): Promise<TimestampLink> {
    const response = await api.post('/timestamps', data);
    return response.data.data;
  }

  /**
   * タイムスタンプリンク一覧を取得
   */
  async getTimestampLinks(params?: {
    videoId?: string;
    shareId?: string;
    evaluationId?: string;
    sessionId?: string;
    isPublic?: boolean;
    page?: number;
    limit?: number;
  }): Promise<{
    links: TimestampLink[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> {
    const response = await api.get('/timestamps', { params });
    return response.data.data;
  }

  /**
   * タイムスタンプリンク詳細を取得
   */
  async getTimestampLink(token: string): Promise<TimestampLink> {
    const response = await api.get(`/timestamps/${token}`);
    return response.data.data;
  }

  /**
   * タイムスタンプリンクを更新
   */
  async updateTimestampLink(id: string, data: Partial<CreateTimestampLinkRequest>): Promise<TimestampLink> {
    const response = await api.put(`/timestamps/${id}`, data);
    return response.data.data;
  }

  /**
   * タイムスタンプリンクを削除
   */
  async deleteTimestampLink(id: string): Promise<void> {
    await api.delete(`/timestamps/${id}`);
  }

  /**
   * タイムスタンプリンクの視聴回数を増加
   */
  async incrementViewCount(token: string): Promise<void> {
    await api.post(`/timestamps/${token}/view`);
  }

  /**
   * YouTube URLにタイムスタンプを追加
   */
  addTimestampToYouTubeUrl(youtubeId: string, startTime: number, endTime?: number): string {
    let url = `https://www.youtube.com/watch?v=${youtubeId}&t=${Math.floor(startTime)}s`;
    
    if (endTime) {
      // YouTube doesn't support end time in regular URLs, but we can use embed parameters
      url = `https://www.youtube.com/embed/${youtubeId}?start=${Math.floor(startTime)}&end=${Math.floor(endTime)}`;
    }
    
    return url;
  }

  /**
   * 埋め込み用URLを生成
   */
  generateEmbedUrl(youtubeId: string, startTime: number, endTime?: number, options?: EmbedOptions): string {
    const params = new URLSearchParams();
    
    params.set('start', Math.floor(startTime).toString());
    if (endTime) {
      params.set('end', Math.floor(endTime).toString());
    }
    
    if (options?.autoplay) {
      params.set('autoplay', '1');
    }
    
    if (options?.controls === false) {
      params.set('controls', '0');
    }
    
    if (options?.theme) {
      params.set('color', options.theme === 'dark' ? 'white' : 'red');
    }
    
    return `https://www.youtube.com/embed/${youtubeId}?${params.toString()}`;
  }

  /**
   * 共有用URLを生成
   */
  generateShareUrl(token: string): string {
    const baseUrl = process.env.REACT_APP_FRONTEND_URL || window.location.origin;
    return `${baseUrl}/timestamp/${token}`;
  }

  /**
   * 埋め込みコードを生成
   */
  generateEmbedCode(youtubeId: string, startTime: number, endTime?: number, options?: EmbedOptions): string {
    const width = options?.width || 560;
    const height = options?.height || 315;
    const embedUrl = this.generateEmbedUrl(youtubeId, startTime, endTime, options);
    
    return `<iframe width="${width}" height="${height}" src="${embedUrl}" frameborder="0" allowfullscreen></iframe>`;
  }

  /**
   * 時間を秒から時:分:秒形式に変換
   */
  formatTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }
  }

  /**
   * 時:分:秒形式から秒に変換
   */
  parseTime(timeString: string): number {
    const parts = timeString.split(':').map(Number);
    
    if (parts.length === 3) {
      // h:m:s
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else if (parts.length === 2) {
      // m:s
      return parts[0] * 60 + parts[1];
    } else if (parts.length === 1) {
      // s
      return parts[0];
    }
    
    return 0;
  }

  /**
   * ハイライト区間の長さを取得
   */
  getHighlightDuration(startTime: number, endTime: number): number {
    return Math.max(0, endTime - startTime);
  }

  /**
   * ハイライト区間の長さを文字列で取得
   */
  getHighlightDurationText(startTime: number, endTime: number): string {
    const duration = this.getHighlightDuration(startTime, endTime);
    return this.formatTime(duration);
  }

  /**
   * タイムスタンプの妥当性をチェック
   */
  validateTimestamp(startTime: number, endTime?: number, videoDuration?: number): string[] {
    const errors: string[] = [];
    
    if (startTime < 0) {
      errors.push('開始時間は0以上である必要があります');
    }
    
    if (endTime !== undefined) {
      if (endTime <= startTime) {
        errors.push('終了時間は開始時間より後である必要があります');
      }
      
      if (endTime < 0) {
        errors.push('終了時間は0以上である必要があります');
      }
    }
    
    if (videoDuration !== undefined) {
      if (startTime >= videoDuration) {
        errors.push('開始時間は動画の長さ以内である必要があります');
      }
      
      if (endTime !== undefined && endTime > videoDuration) {
        errors.push('終了時間は動画の長さ以内である必要があります');
      }
    }
    
    return errors;
  }

  /**
   * タイムスタンプリンクをフィルタリング
   */
  filterTimestampLinks(
    links: TimestampLink[],
    filters: {
      tags?: string[];
      isHighlight?: boolean;
      minDuration?: number;
      maxDuration?: number;
      dateRange?: { start: Date; end: Date };
    }
  ): TimestampLink[] {
    return links.filter(link => {
      if (filters.tags && filters.tags.length > 0) {
        const hasMatchingTag = filters.tags.some(tag => 
          link.tags.some(linkTag => linkTag.toLowerCase().includes(tag.toLowerCase()))
        );
        if (!hasMatchingTag) return false;
      }
      
      if (filters.isHighlight !== undefined && link.isHighlight !== filters.isHighlight) {
        return false;
      }
      
      if (link.isHighlight && link.endTime) {
        const duration = this.getHighlightDuration(link.startTime, link.endTime);
        
        if (filters.minDuration !== undefined && duration < filters.minDuration) {
          return false;
        }
        
        if (filters.maxDuration !== undefined && duration > filters.maxDuration) {
          return false;
        }
      }
      
      if (filters.dateRange) {
        const linkDate = new Date(link.createdAt);
        if (linkDate < filters.dateRange.start || linkDate > filters.dateRange.end) {
          return false;
        }
      }
      
      return true;
    });
  }

  /**
   * タイムスタンプリンクを検索
   */
  searchTimestampLinks(links: TimestampLink[], query: string): TimestampLink[] {
    const lowercaseQuery = query.toLowerCase();
    
    return links.filter(link =>
      link.title.toLowerCase().includes(lowercaseQuery) ||
      link.description?.toLowerCase().includes(lowercaseQuery) ||
      link.tags.some(tag => tag.toLowerCase().includes(lowercaseQuery))
    );
  }

  /**
   * タイムスタンプリンクをソート
   */
  sortTimestampLinks(
    links: TimestampLink[],
    sortBy: 'createdAt' | 'startTime' | 'viewCount' | 'title',
    order: 'asc' | 'desc' = 'desc'
  ): TimestampLink[] {
    return [...links].sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'createdAt':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case 'startTime':
          comparison = a.startTime - b.startTime;
          break;
        case 'viewCount':
          comparison = a.viewCount - b.viewCount;
          break;
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
      }
      
      return order === 'asc' ? comparison : -comparison;
    });
  }

  /**
   * 相対時間を取得
   */
  getRelativeTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return 'たった今';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes}分前`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours}時間前`;
    } else if (diffInSeconds < 2592000) {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days}日前`;
    } else {
      return date.toLocaleDateString('ja-JP');
    }
  }

  /**
   * タグの色を生成
   */
  generateTagColor(tag: string): string {
    // タグ名から一意の色を生成
    let hash = 0;
    for (let i = 0; i < tag.length; i++) {
      hash = tag.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 70%, 50%)`;
  }

  /**
   * プレイリストを作成
   */
  createPlaylist(links: TimestampLink[]): {
    title: string;
    items: Array<{
      title: string;
      startTime: number;
      endTime?: number;
      url: string;
    }>;
  } {
    const sortedLinks = this.sortTimestampLinks(links, 'startTime', 'asc');
    
    return {
      title: `プレイリスト (${sortedLinks.length}件)`,
      items: sortedLinks.map(link => ({
        title: link.title,
        startTime: link.startTime,
        endTime: link.endTime,
        url: this.generateShareUrl(link.shareToken)
      }))
    };
  }
}

export const timestampService = new TimestampService();