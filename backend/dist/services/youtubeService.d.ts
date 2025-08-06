import { NormalizedURL, URLValidationError } from '../utils/urlNormalizer';
import { SupportedLanguage } from '../utils/errorMessages';
export interface YouTubeVideoInfo {
    id: string;
    title: string;
    channelTitle: string;
    publishedAt: string;
    description: string;
    thumbnails: {
        default: {
            url: string;
        };
        medium: {
            url: string;
        };
        high: {
            url: string;
        };
        standard?: {
            url: string;
        } | undefined;
        maxres?: {
            url: string;
        } | undefined;
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
declare class YouTubeService {
    private youtube;
    constructor();
    /**
     * YouTube URLからビデオIDを抽出（拡張版）
     * 様々なURL形式に対応し、URL正規化エンジンを使用
     */
    extractVideoId(url: string): string | null;
    /**
     * URL正規化を行い、詳細な情報を返す
     */
    normalizeURL(url: string): NormalizedURL;
    /**
     * 複数のURLを一括で正規化する
     */
    normalizeMultipleURLs(urls: string[]): NormalizedURL[];
    /**
     * 言語対応のエラーメッセージを取得
     */
    getLocalizedErrorMessage(error: URLValidationError, language?: SupportedLanguage): import("../utils/errorMessages").ErrorMessageData;
    /**
     * フォーマット済みエラーメッセージを取得
     */
    getFormattedErrorMessage(error: URLValidationError, language?: SupportedLanguage, includeExample?: boolean): string;
    /**
     * ユーザー向けヘルプメッセージを生成
     */
    generateUserHelpMessage(error: URLValidationError, language?: SupportedLanguage): {
        title: string;
        message: string;
        suggestion: string;
        example?: string;
        userAction?: string;
    };
    /**
     * YouTube動画の情報を取得
     */
    getVideoInfo(videoId: string): Promise<YouTubeVideoInfo>;
    /**
     * 動画が公開されているかチェック
     */
    isVideoPublic(videoId: string): Promise<boolean>;
    /**
     * 動画の埋め込みが許可されているかチェック
     */
    isEmbeddable(videoId: string): Promise<boolean>;
    /**
     * 複数の動画情報を一括取得
     */
    getMultipleVideoInfo(videoIds: string[]): Promise<YouTubeVideoInfo[]>;
}
export declare const youtubeService: YouTubeService;
export {};
//# sourceMappingURL=youtubeService.d.ts.map