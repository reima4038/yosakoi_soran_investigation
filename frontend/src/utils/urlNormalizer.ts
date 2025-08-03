/**
 * フロントエンド用YouTube URL正規化ユーティリティ
 * バックエンドのURL正規化エンジンと同等の機能をクライアントサイドで提供
 */

export enum URLValidationErrorType {
  INVALID_FORMAT = 'INVALID_FORMAT',
  NOT_YOUTUBE = 'NOT_YOUTUBE',
  MISSING_VIDEO_ID = 'MISSING_VIDEO_ID',
  PRIVATE_VIDEO = 'PRIVATE_VIDEO',
  VIDEO_NOT_FOUND = 'VIDEO_NOT_FOUND',
  NETWORK_ERROR = 'NETWORK_ERROR',
  DUPLICATE_VIDEO = 'DUPLICATE_VIDEO',
}

export interface URLPattern {
  pattern: RegExp;
  extractor: (match: RegExpMatchArray) => string | null;
  description: string;
}

export interface NormalizedURL {
  original: string;
  canonical: string;
  videoId: string;
  isValid: boolean;
  metadata?: {
    timestamp?: number;
    playlist?: string;
    index?: number;
  };
}

export interface URLValidationError extends Error {
  type: URLValidationErrorType;
  suggestion?: string;
  example?: string;
}

export interface ValidationResult {
  isValid: boolean;
  error?: URLValidationError;
  normalizedUrl?: NormalizedURL;
}

/**
 * YouTube URLパターンの定義（バックエンドと同期）
 */
export const YOUTUBE_URL_PATTERNS: URLPattern[] = [
  // 標準的なwatch URL (www.youtube.com)
  {
    pattern: /^https?:\/\/(www\.)?youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/,
    extractor: match => match[2],
    description: '標準的なYouTube URL',
  },
  // モバイル版 (m.youtube.com)
  {
    pattern: /^https?:\/\/m\.youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/,
    extractor: match => match[1],
    description: 'モバイル版YouTube URL',
  },
  // 短縮URL (youtu.be)
  {
    pattern: /^https?:\/\/youtu\.be\/([a-zA-Z0-9_-]{11})/,
    extractor: match => match[1],
    description: 'YouTube短縮URL',
  },
  // 埋め込みURL
  {
    pattern: /^https?:\/\/(www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    extractor: match => match[2],
    description: 'YouTube埋め込みURL',
  },
  // プロトコルなし (www.youtube.com)
  {
    pattern: /^(www\.)?youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/,
    extractor: match => match[2],
    description: 'プロトコルなしYouTube URL',
  },
  // プロトコルなし (m.youtube.com)
  {
    pattern: /^m\.youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/,
    extractor: match => match[1],
    description: 'プロトコルなしモバイル版YouTube URL',
  },
  // プロトコルなし短縮URL
  {
    pattern: /^youtu\.be\/([a-zA-Z0-9_-]{11})/,
    extractor: match => match[1],
    description: 'プロトコルなし短縮URL',
  },
  // 直接ビデオID
  {
    pattern: /^([a-zA-Z0-9_-]{11})$/,
    extractor: match => match[1],
    description: '直接ビデオID',
  },
];

/**
 * フロントエンド用YouTube URL正規化クラス
 */
export class YouTubeURLNormalizer {
  /**
   * URLをリアルタイムで検証する（軽量版）
   */
  static validateQuick(url: string): ValidationResult {
    if (!url || typeof url !== 'string') {
      return {
        isValid: false,
        error: this.createValidationError(
          URLValidationErrorType.INVALID_FORMAT,
          'URLが指定されていません',
          'YouTube URLを入力してください',
          'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
        ),
      };
    }

    const trimmedUrl = url.trim();
    if (trimmedUrl.length === 0) {
      return {
        isValid: false,
        error: this.createValidationError(
          URLValidationErrorType.INVALID_FORMAT,
          'URLが指定されていません',
          'YouTube URLを入力してください',
          'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
        ),
      };
    }

    try {
      const normalizedUrl = this.normalize(trimmedUrl);
      return {
        isValid: true,
        normalizedUrl,
      };
    } catch (error) {
      return {
        isValid: false,
        error: error as URLValidationError,
      };
    }
  }

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

    const trimmedUrl = url.trim();
    const normalizedUrl = this.addProtocolIfMissing(trimmedUrl);

    // 直接ビデオIDかどうかチェック
    if (this.isValidVideoId(trimmedUrl)) {
      const canonicalUrl = `https://www.youtube.com/watch?v=${trimmedUrl}`;
      return {
        original: url,
        canonical: canonicalUrl,
        videoId: trimmedUrl,
        isValid: true,
      };
    }

    const extractionResult = this.extractVideoId(normalizedUrl);

    if (!extractionResult.videoId) {
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

    const canonicalUrl = `https://www.youtube.com/watch?v=${extractionResult.videoId}`;

    const result: NormalizedURL = {
      original: url,
      canonical: canonicalUrl,
      videoId: extractionResult.videoId,
      isValid: true,
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
  private static extractVideoId(url: string): {
    videoId: string | null;
    metadata?: { timestamp?: number; playlist?: string; index?: number };
  } {
    for (const pattern of YOUTUBE_URL_PATTERNS) {
      const match = url.match(pattern.pattern);
      if (match) {
        const videoId = pattern.extractor(match);
        if (videoId) {
          const metadata = this.extractMetadata(url);
          const result: {
            videoId: string | null;
            metadata?: {
              timestamp?: number;
              playlist?: string;
              index?: number;
            };
          } = { videoId };

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
   * URLからメタデータを抽出する
   */
  private static extractMetadata(
    url: string
  ): { timestamp?: number; playlist?: string; index?: number } | undefined {
    const metadata: { timestamp?: number; playlist?: string; index?: number } =
      {};

    try {
      const urlObj = new URL(url);

      // タイムスタンプの抽出
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
      // URL解析エラーは無視
    }

    return Object.keys(metadata).length > 0 ? metadata : undefined;
  }

  /**
   * タイムパラメータを秒数に変換する
   */
  private static parseTimeParameter(timeParam: string): number {
    const timeRegex = /(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s?)?/;
    const match = timeParam.match(timeRegex);

    if (match) {
      const hours = parseInt(match[1] || '0', 10);
      const minutes = parseInt(match[2] || '0', 10);
      const seconds = parseInt(match[3] || '0', 10);

      return hours * 3600 + minutes * 60 + seconds;
    }

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
   * ビデオIDの妥当性をチェックする
   */
  static isValidVideoId(videoId: string): boolean {
    return /^[a-zA-Z0-9_-]{11}$/.test(videoId);
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
   * URLの形式を推測してヒントを提供する
   */
  static getURLHint(url: string): string | null {
    if (!url || url.trim().length === 0) {
      return null;
    }

    const trimmedUrl = url.trim();

    // 一般的な間違いパターンをチェック
    if (
      trimmedUrl.includes('youtube') &&
      !trimmedUrl.includes('watch?v=') &&
      !trimmedUrl.includes('youtu.be/')
    ) {
      return '動画ページのURLを入力してください（例: https://www.youtube.com/watch?v=...)';
    }

    if (trimmedUrl.includes('youtu') && trimmedUrl.length < 20) {
      return 'URLが不完全な可能性があります。完全なURLを入力してください';
    }

    if (!trimmedUrl.includes('youtube') && !trimmedUrl.includes('youtu.be')) {
      if (trimmedUrl.includes('http') || trimmedUrl.includes('www')) {
        return 'YouTube以外のURLは登録できません';
      }
    }

    return null;
  }

  /**
   * 入力中のURLの状態を判定する
   */
  static getInputState(url: string): 'empty' | 'typing' | 'valid' | 'invalid' {
    if (!url || url.trim().length === 0) {
      return 'empty';
    }

    const result = this.validateQuick(url);

    if (result.isValid) {
      return 'valid';
    }

    // 入力途中かどうかを判定
    const trimmedUrl = url.trim();

    // YouTube関連のURLの場合は入力中と判定
    if (trimmedUrl.includes('youtube') || trimmedUrl.includes('youtu.be')) {
      return 'typing';
    }

    // HTTPプロトコルで始まるがYouTube以外の場合は無効
    if (trimmedUrl.startsWith('http') && !this.isYouTubeURL(trimmedUrl)) {
      return 'invalid';
    }

    // その他のHTTPまたはwwwで始まる場合は入力中
    if (trimmedUrl.startsWith('http') || trimmedUrl.startsWith('www')) {
      return 'typing';
    }

    // ビデオID入力中の可能性
    if (/^[a-zA-Z0-9_-]{1,10}$/.test(trimmedUrl)) {
      return 'typing';
    }

    return 'invalid';
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
          isValid: false,
        };
      }
    });
  }
}

/**
 * デバウンス機能付きバリデーション
 */
export class DebouncedValidator {
  private timeoutId: NodeJS.Timeout | null = null;
  private delay: number;

  constructor(delay: number = 300) {
    this.delay = delay;
  }

  /**
   * デバウンス付きでバリデーションを実行
   */
  validate(url: string, callback: (result: ValidationResult) => void): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }

    this.timeoutId = setTimeout(() => {
      const result = YouTubeURLNormalizer.validateQuick(url);
      callback(result);
    }, this.delay);
  }

  /**
   * 即座にバリデーションを実行（デバウンスをキャンセル）
   */
  validateImmediate(
    url: string,
    callback: (result: ValidationResult) => void
  ): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }

    const result = YouTubeURLNormalizer.validateQuick(url);
    callback(result);
  }

  /**
   * デバウンスをクリア
   */
  clear(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }
}

/**
 * リアルタイムバリデーション用フック
 */
export interface UseURLValidationOptions {
  debounceDelay?: number;
  validateOnMount?: boolean;
}

export interface UseURLValidationResult {
  validationResult: ValidationResult | null;
  isValidating: boolean;
  validate: (url: string) => void;
  validateImmediate: (url: string) => void;
  clear: () => void;
}

/**
 * URL検証の状態管理
 */
export class URLValidationState {
  private validator: DebouncedValidator;
  private currentResult: ValidationResult | null = null;
  private isValidating = false;
  private listeners: Array<
    (result: ValidationResult | null, isValidating: boolean) => void
  > = [];

  constructor(debounceDelay: number = 300) {
    this.validator = new DebouncedValidator(debounceDelay);
  }

  /**
   * リスナーを追加
   */
  addListener(
    listener: (result: ValidationResult | null, isValidating: boolean) => void
  ): () => void {
    this.listeners.push(listener);

    // アンサブスクライブ関数を返す
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * 状態を通知
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      listener(this.currentResult, this.isValidating);
    });
  }

  /**
   * バリデーションを実行
   */
  validate(url: string): void {
    this.isValidating = true;
    this.notifyListeners();

    this.validator.validate(url, result => {
      this.currentResult = result;
      this.isValidating = false;
      this.notifyListeners();
    });
  }

  /**
   * 即座にバリデーションを実行
   */
  validateImmediate(url: string): void {
    this.isValidating = true;
    this.notifyListeners();

    this.validator.validateImmediate(url, result => {
      this.currentResult = result;
      this.isValidating = false;
      this.notifyListeners();
    });
  }

  /**
   * 状態をクリア
   */
  clear(): void {
    this.validator.clear();
    this.currentResult = null;
    this.isValidating = false;
    this.notifyListeners();
  }

  /**
   * 現在の結果を取得
   */
  getCurrentResult(): ValidationResult | null {
    return this.currentResult;
  }

  /**
   * バリデーション中かどうかを取得
   */
  getIsValidating(): boolean {
    return this.isValidating;
  }
}
