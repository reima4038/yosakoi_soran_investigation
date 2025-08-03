/**
 * YouTube URL正規化エンジン
 * 様々な形式のYouTube URLを正規化し、ビデオIDを抽出する
 */

export interface URLPattern {
  pattern: RegExp;
  extractor: (match: RegExpMatchArray) => string | null;
  description: string;
}

export interface NormalizedURL {
  original: string;      // 元のURL
  canonical: string;     // 正規化されたURL
  videoId: string;       // 抽出されたビデオID
  isValid: boolean;      // 有効性
  metadata?: {
    timestamp?: number;  // タイムスタンプ（秒）
    playlist?: string;   // プレイリストID
    index?: number;      // プレイリスト内のインデックス
  };
}

export enum URLValidationErrorType {
  INVALID_FORMAT = 'INVALID_FORMAT',
  NOT_YOUTUBE = 'NOT_YOUTUBE',
  MISSING_VIDEO_ID = 'MISSING_VIDEO_ID',
  PRIVATE_VIDEO = 'PRIVATE_VIDEO',
  VIDEO_NOT_FOUND = 'VIDEO_NOT_FOUND',
  NETWORK_ERROR = 'NETWORK_ERROR',
  DUPLICATE_VIDEO = 'DUPLICATE_VIDEO'
}

export interface URLValidationError extends Error {
  type: URLValidationErrorType;
  suggestion?: string | undefined;
  example?: string | undefined;
}

/**
 * YouTube URLパターンの定義
 */
export const YOUTUBE_URL_PATTERNS: URLPattern[] = [
  // 標準的なwatch URL (www.youtube.com)
  {
    pattern: /^https?:\/\/(www\.)?youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/,
    extractor: (match) => match[2],
    description: "標準的なYouTube URL"
  },
  // モバイル版 (m.youtube.com)
  {
    pattern: /^https?:\/\/m\.youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/,
    extractor: (match) => match[1],
    description: "モバイル版YouTube URL"
  },
  // 短縮URL (youtu.be)
  {
    pattern: /^https?:\/\/youtu\.be\/([a-zA-Z0-9_-]{11})/,
    extractor: (match) => match[1],
    description: "YouTube短縮URL"
  },
  // 埋め込みURL
  {
    pattern: /^https?:\/\/(www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    extractor: (match) => match[2],
    description: "YouTube埋め込みURL"
  },
  // プロトコルなし (www.youtube.com)
  {
    pattern: /^(www\.)?youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/,
    extractor: (match) => match[2],
    description: "プロトコルなしYouTube URL"
  },
  // プロトコルなし (m.youtube.com)
  {
    pattern: /^m\.youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/,
    extractor: (match) => match[1],
    description: "プロトコルなしモバイル版YouTube URL"
  },
  // プロトコルなし短縮URL
  {
    pattern: /^youtu\.be\/([a-zA-Z0-9_-]{11})/,
    extractor: (match) => match[1],
    description: "プロトコルなし短縮URL"
  },
  // 直接ビデオID
  {
    pattern: /^([a-zA-Z0-9_-]{11})$/,
    extractor: (match) => match[1],
    description: "直接ビデオID"
  }
];

/**
 * YouTube URL正規化クラス
 */
export class YouTubeURLNormalizer {
  /**
   * URLを正規化し、ビデオIDを抽出する
   */
  static normalize(url: string): NormalizedURL {
    if (!url || typeof url !== 'string') {
      throw this.createValidationError(
        URLValidationErrorType.INVALID_FORMAT,
        'URLが指定されていません',
        'YouTube URLを入力してください',
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
      );
    }

    // 前後の空白を除去
    const trimmedUrl = url.trim();
    
    // プロトコル補完
    const normalizedUrl = this.addProtocolIfMissing(trimmedUrl);
    
    // ビデオID抽出
    const extractionResult = this.extractVideoId(normalizedUrl);
    
    if (!extractionResult.videoId) {
      // 直接ビデオIDかどうかチェック
      if (this.isValidVideoId(trimmedUrl)) {
        // 直接ビデオIDの場合は正規化されたURLを生成
        const canonicalUrl = `https://www.youtube.com/watch?v=${trimmedUrl}`;
        return {
          original: url,
          canonical: canonicalUrl,
          videoId: trimmedUrl,
          isValid: true
        };
      }
      
      // YouTube URLかどうかチェック
      if (!this.isYouTubeURL(normalizedUrl)) {
        throw this.createValidationError(
          URLValidationErrorType.NOT_YOUTUBE,
          'YouTube以外のURLは登録できません',
          'YouTube（youtube.com または youtu.be）のURLを入力してください'
        );
      }
      
      throw this.createValidationError(
        URLValidationErrorType.MISSING_VIDEO_ID,
        'ビデオIDが見つかりません',
        '完全なYouTube URLを入力してください',
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
      );
    }
    
    // 正規化されたURLを生成
    const canonicalUrl = `https://www.youtube.com/watch?v=${extractionResult.videoId}`;
    
    const result: NormalizedURL = {
      original: url,
      canonical: canonicalUrl,
      videoId: extractionResult.videoId,
      isValid: true
    };

    if (extractionResult.metadata !== undefined) {
      result.metadata = extractionResult.metadata;
    }

    return result;
  }

  /**
   * プロトコルが不足している場合に補完する
   */
  private static addProtocolIfMissing(url: string): string {
    if (!/^https?:\/\//.test(url)) {
      return `https://${url}`;
    }
    return url;
  }

  /**
   * ビデオIDを抽出する
   */
  private static extractVideoId(url: string): { videoId: string | null; metadata?: { timestamp?: number; playlist?: string; index?: number } } {
    for (const pattern of YOUTUBE_URL_PATTERNS) {
      const match = url.match(pattern.pattern);
      if (match) {
        const videoId = pattern.extractor(match);
        if (videoId) {
          // メタデータの抽出
          const metadata = this.extractMetadata(url);
          const result: { videoId: string | null; metadata?: { timestamp?: number; playlist?: string; index?: number } } = { videoId };
          if (metadata !== undefined) {
            result.metadata = metadata;
          }
          return result;
        }
      }
    }
    return { videoId: null };
  }

  /**
   * URLからメタデータを抽出する（タイムスタンプ、プレイリスト情報など）
   */
  private static extractMetadata(url: string): { timestamp?: number; playlist?: string; index?: number } | undefined {
    const metadata: { timestamp?: number; playlist?: string; index?: number } = {};
    
    try {
      const urlObj = new URL(url);
      
      // タイムスタンプの抽出 (t パラメータ)
      const timeParam = urlObj.searchParams.get('t');
      if (timeParam) {
        metadata.timestamp = this.parseTimeParameter(timeParam);
      }
      
      // プレイリスト情報の抽出
      const listParam = urlObj.searchParams.get('list');
      if (listParam) {
        metadata.playlist = listParam;
      }
      
      // プレイリスト内のインデックス
      const indexParam = urlObj.searchParams.get('index');
      if (indexParam) {
        metadata.index = parseInt(indexParam, 10);
      }
      
    } catch (error) {
      // URL解析エラーは無視（メタデータは必須ではない）
    }
    
    return Object.keys(metadata).length > 0 ? metadata : undefined;
  }

  /**
   * タイムパラメータを秒数に変換する
   */
  private static parseTimeParameter(timeParam: string): number {
    // "30s", "1m30s", "1h30m45s" などの形式に対応
    const timeRegex = /(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s?)?/;
    const match = timeParam.match(timeRegex);
    
    if (match) {
      const hours = parseInt(match[1] || '0', 10);
      const minutes = parseInt(match[2] || '0', 10);
      const seconds = parseInt(match[3] || '0', 10);
      
      return hours * 3600 + minutes * 60 + seconds;
    }
    
    // 数値のみの場合は秒として扱う
    const numericTime = parseInt(timeParam, 10);
    return isNaN(numericTime) ? 0 : numericTime;
  }

  /**
   * YouTube URLかどうかを判定する
   */
  private static isYouTubeURL(url: string): boolean {
    return /youtube\.com|youtu\.be/i.test(url);
  }

  /**
   * バリデーションエラーを作成する
   */
  private static createValidationError(
    type: URLValidationErrorType,
    message: string,
    suggestion?: string,
    example?: string
  ): URLValidationError {
    const error = new Error(message) as URLValidationError;
    error.type = type;
    if (suggestion !== undefined) {
      error.suggestion = suggestion;
    }
    if (example !== undefined) {
      error.example = example;
    }
    return error;
  }

  /**
   * 複数のURLを一括で正規化する
   */
  static normalizeMultiple(urls: string[]): NormalizedURL[] {
    return urls.map(url => {
      try {
        return this.normalize(url);
      } catch (error) {
        return {
          original: url,
          canonical: '',
          videoId: '',
          isValid: false
        };
      }
    });
  }

  /**
   * ビデオIDの妥当性をチェックする
   */
  static isValidVideoId(videoId: string): boolean {
    return /^[a-zA-Z0-9_-]{11}$/.test(videoId);
  }
}