"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.youtubeService = void 0;
const googleapis_1 = require("googleapis");
const config_1 = require("../config");
const urlNormalizer_1 = require("../utils/urlNormalizer");
const errorMessages_1 = require("../utils/errorMessages");
class YouTubeService {
    constructor() {
        this.youtube = googleapis_1.google.youtube({
            version: 'v3',
            auth: config_1.config.youtubeApiKey
        });
    }
    /**
     * YouTube URLからビデオIDを抽出（拡張版）
     * 様々なURL形式に対応し、URL正規化エンジンを使用
     */
    extractVideoId(url) {
        try {
            const normalized = urlNormalizer_1.YouTubeURLNormalizer.normalize(url);
            return normalized.videoId;
        }
        catch (error) {
            // ログ出力してnullを返す（後方互換性のため）
            console.warn('Failed to extract video ID from URL:', url, error);
            return null;
        }
    }
    /**
     * URL正規化を行い、詳細な情報を返す
     */
    normalizeURL(url) {
        return urlNormalizer_1.YouTubeURLNormalizer.normalize(url);
    }
    /**
     * 複数のURLを一括で正規化する
     */
    normalizeMultipleURLs(urls) {
        return urlNormalizer_1.YouTubeURLNormalizer.normalizeMultiple(urls);
    }
    /**
     * 言語対応のエラーメッセージを取得
     */
    getLocalizedErrorMessage(error, language = 'ja') {
        return errorMessages_1.ErrorMessageManager.getMessage(error.type, language);
    }
    /**
     * フォーマット済みエラーメッセージを取得
     */
    getFormattedErrorMessage(error, language = 'ja', includeExample = true) {
        return errorMessages_1.ErrorMessageManager.getFormattedMessage(error.type, language, includeExample);
    }
    /**
     * ユーザー向けヘルプメッセージを生成
     */
    generateUserHelpMessage(error, language = 'ja') {
        return errorMessages_1.ErrorMessageManager.generateHelpMessage(error.type, language);
    }
    /**
     * YouTube動画の情報を取得
     */
    async getVideoInfo(videoId) {
        try {
            const response = await this.youtube.videos.list({
                part: ['snippet', 'contentDetails', 'statistics'],
                id: [videoId]
            });
            if (!response.data.items || response.data.items.length === 0) {
                throw new Error('VIDEO_NOT_FOUND');
            }
            const video = response.data.items[0];
            const snippet = video.snippet;
            const statistics = video.statistics;
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
        }
        catch (error) {
            console.error('YouTube API Error:', error);
            if (error.code === 403) {
                throw {
                    code: 'API_QUOTA_EXCEEDED',
                    message: 'YouTube API のクォータを超過しました',
                    details: error
                };
            }
            if (error.code === 404 || error.message === 'VIDEO_NOT_FOUND') {
                throw {
                    code: 'VIDEO_NOT_FOUND',
                    message: '指定された動画が見つかりません',
                    details: error
                };
            }
            if (error.code === 400) {
                throw {
                    code: 'INVALID_VIDEO_ID',
                    message: '無効な動画IDです',
                    details: error
                };
            }
            throw {
                code: 'YOUTUBE_API_ERROR',
                message: 'YouTube API でエラーが発生しました',
                details: error
            };
        }
    }
    /**
     * 動画が公開されているかチェック
     */
    async isVideoPublic(videoId) {
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
        }
        catch (error) {
            console.error('Error checking video privacy:', error);
            return false;
        }
    }
    /**
     * 動画の埋め込みが許可されているかチェック
     */
    async isEmbeddable(videoId) {
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
        }
        catch (error) {
            console.error('Error checking video embeddability:', error);
            return false;
        }
    }
    /**
     * 複数の動画情報を一括取得
     */
    async getMultipleVideoInfo(videoIds) {
        if (videoIds.length === 0) {
            return [];
        }
        // YouTube API は一度に最大50個の動画IDを処理可能
        const batchSize = 50;
        const results = [];
        for (let i = 0; i < videoIds.length; i += batchSize) {
            const batch = videoIds.slice(i, i + batchSize);
            try {
                const response = await this.youtube.videos.list({
                    part: ['snippet', 'contentDetails', 'statistics'],
                    id: batch
                });
                if (response.data.items) {
                    for (const video of response.data.items) {
                        const snippet = video.snippet;
                        const statistics = video.statistics;
                        results.push({
                            id: video.id,
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
            }
            catch (error) {
                console.error(`Error fetching batch ${i}-${i + batchSize}:`, error);
                // バッチの一部でエラーが発生しても、他のバッチの処理は続行
            }
        }
        return results;
    }
}
exports.youtubeService = new YouTubeService();
//# sourceMappingURL=youtubeService.js.map