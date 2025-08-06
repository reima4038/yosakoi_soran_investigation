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
export declare enum URLValidationErrorType {
    INVALID_FORMAT = "INVALID_FORMAT",
    NOT_YOUTUBE = "NOT_YOUTUBE",
    MISSING_VIDEO_ID = "MISSING_VIDEO_ID",
    PRIVATE_VIDEO = "PRIVATE_VIDEO",
    VIDEO_NOT_FOUND = "VIDEO_NOT_FOUND",
    NETWORK_ERROR = "NETWORK_ERROR",
    DUPLICATE_VIDEO = "DUPLICATE_VIDEO"
}
export interface URLValidationError extends Error {
    type: URLValidationErrorType;
    suggestion?: string | undefined;
    example?: string | undefined;
}
/**
 * YouTube URLパターンの定義
 */
export declare const YOUTUBE_URL_PATTERNS: URLPattern[];
/**
 * YouTube URL正規化クラス
 */
export declare class YouTubeURLNormalizer {
    /**
     * URLを正規化し、ビデオIDを抽出する
     */
    static normalize(url: string): NormalizedURL;
    /**
     * プロトコルが不足している場合に補完する
     */
    private static addProtocolIfMissing;
    /**
     * ビデオIDを抽出する
     */
    private static extractVideoId;
    /**
     * URLからメタデータを抽出する（タイムスタンプ、プレイリスト情報など）
     */
    private static extractMetadata;
    /**
     * タイムパラメータを秒数に変換する
     */
    private static parseTimeParameter;
    /**
     * YouTube URLかどうかを判定する
     */
    private static isYouTubeURL;
    /**
     * バリデーションエラーを作成する
     */
    private static createValidationError;
    /**
     * 複数のURLを一括で正規化する
     */
    static normalizeMultiple(urls: string[]): NormalizedURL[];
    /**
     * ビデオIDの妥当性をチェックする
     */
    static isValidVideoId(videoId: string): boolean;
}
//# sourceMappingURL=urlNormalizer.d.ts.map