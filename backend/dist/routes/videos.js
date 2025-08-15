"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const mongoose_1 = __importDefault(require("mongoose"));
const Video_1 = require("../models/Video");
const youtubeService_1 = require("../services/youtubeService");
const middleware_1 = require("../middleware");
const languageDetection_1 = require("../middleware/languageDetection");
const urlNormalizer_1 = require("../utils/urlNormalizer");
const router = (0, express_1.Router)();
// 言語検出ミドルウェアを全ルートに適用
router.use(languageDetection_1.languageDetectionMiddleware);
// バリデーションエラーハンドラー
const handleValidationErrors = (req, res, next) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        console.log('Validation errors:', JSON.stringify(errors.array(), null, 2));
        console.log('Request params:', JSON.stringify(req.params, null, 2));
        console.log('Request body:', JSON.stringify(req.body, null, 2));
        res.status(400).json({
            status: 'error',
            message: 'バリデーションエラー',
            errors: errors.array()
        });
        return;
    }
    next();
};
/**
 * YouTube動画情報を取得（登録前の確認用）- 改善版
 * GET /api/videos/youtube-info?url=<youtube_url>&lang=<language>
 */
router.get('/youtube-info', [
    (0, express_validator_1.query)('url')
        .notEmpty()
        .withMessage('YouTube URLは必須です')
        .isString()
        .withMessage('YouTube URLは文字列である必要があります'),
    (0, express_validator_1.query)('lang')
        .optional()
        .isIn(['ja', 'en'])
        .withMessage('言語は ja または en である必要があります'),
    handleValidationErrors
], async (req, res) => {
    try {
        const { url } = req.query;
        const language = (0, languageDetection_1.getRequestLanguage)(req);
        // レスポンスに言語情報を設定
        (0, languageDetection_1.setResponseLanguage)(res, language);
        // URL正規化を実行
        let normalizedUrl;
        try {
            normalizedUrl = youtubeService_1.youtubeService.normalizeURL(url);
        }
        catch (error) {
            // URL正規化エラーの場合、多言語対応エラーレスポンスを返す
            const errorResponse = (0, languageDetection_1.createLocalizedErrorResponse)(error, language, true);
            return res.status(400).json(errorResponse);
        }
        const videoId = normalizedUrl.videoId;
        // 既に登録済みかチェック
        const existingVideo = await Video_1.Video.findOne({ youtubeId: videoId });
        if (existingVideo) {
            const duplicateError = {
                type: urlNormalizer_1.URLValidationErrorType.DUPLICATE_VIDEO,
                message: 'Video already exists'
            };
            const errorResponse = (0, languageDetection_1.createLocalizedErrorResponse)(duplicateError, language);
            return res.status(409).json({
                ...errorResponse,
                existingVideo: {
                    id: existingVideo._id,
                    title: existingVideo.title,
                    createdAt: existingVideo.createdAt
                }
            });
        }
        // YouTube APIから動画情報を取得
        let videoInfo;
        try {
            videoInfo = await youtubeService_1.youtubeService.getVideoInfo(videoId);
        }
        catch (error) {
            // YouTube APIエラーを適切なエラータイプにマッピング
            let errorType = urlNormalizer_1.URLValidationErrorType.NETWORK_ERROR;
            if (error.code === 'VIDEO_NOT_FOUND' || error.code === 'INVALID_VIDEO_ID') {
                errorType = urlNormalizer_1.URLValidationErrorType.VIDEO_NOT_FOUND;
            }
            const mappedError = { type: errorType, message: error.message };
            const errorResponse = (0, languageDetection_1.createLocalizedErrorResponse)(mappedError, language);
            return res.status(400).json(errorResponse);
        }
        // 動画が公開されているかチェック
        const isPublic = await youtubeService_1.youtubeService.isVideoPublic(videoId);
        if (!isPublic) {
            const privateError = {
                type: urlNormalizer_1.URLValidationErrorType.PRIVATE_VIDEO,
                message: 'Video is private'
            };
            const errorResponse = (0, languageDetection_1.createLocalizedErrorResponse)(privateError, language);
            return res.status(400).json(errorResponse);
        }
        // 埋め込み可能かチェック
        const isEmbeddable = await youtubeService_1.youtubeService.isEmbeddable(videoId);
        // 成功レスポンス
        res.json({
            success: true,
            data: {
                ...videoInfo,
                normalizedUrl: normalizedUrl.canonical,
                originalUrl: normalizedUrl.original,
                metadata: normalizedUrl.metadata,
                isEmbeddable,
                canRegister: true
            },
            language: language
        });
    }
    catch (error) {
        console.error('YouTube info fetch error:', error);
        // 予期しないエラーの場合
        const language = (0, languageDetection_1.getRequestLanguage)(req);
        const networkError = {
            type: urlNormalizer_1.URLValidationErrorType.NETWORK_ERROR,
            message: error.message || 'Unexpected error occurred'
        };
        const errorResponse = (0, languageDetection_1.createLocalizedErrorResponse)(networkError, language);
        res.status(500).json(errorResponse);
    }
});
/**
 * 動画を登録 - 改善版
 * POST /api/videos
 */
router.post('/', [
    middleware_1.auth,
    (0, express_validator_1.body)('youtubeUrl')
        .notEmpty()
        .withMessage('YouTube URLは必須です')
        .isString()
        .withMessage('YouTube URLは文字列である必要があります'),
    (0, express_validator_1.body)('metadata.teamName')
        .optional()
        .isString()
        .withMessage('チーム名は文字列である必要があります')
        .isLength({ max: 100 })
        .withMessage('チーム名は100文字以下である必要があります'),
    (0, express_validator_1.body)('metadata.performanceName')
        .optional()
        .isString()
        .withMessage('演舞名は文字列である必要があります')
        .isLength({ max: 100 })
        .withMessage('演舞名は100文字以下である必要があります'),
    (0, express_validator_1.body)('metadata.eventName')
        .optional()
        .isString()
        .withMessage('大会名は文字列である必要があります')
        .isLength({ max: 100 })
        .withMessage('大会名は100文字以下である必要があります'),
    (0, express_validator_1.body)('metadata.year')
        .optional()
        .isInt({ min: 1900, max: new Date().getFullYear() + 1 })
        .withMessage('年度は1900年から来年までの範囲で入力してください'),
    (0, express_validator_1.body)('metadata.location')
        .optional()
        .isString()
        .withMessage('場所は文字列である必要があります')
        .isLength({ max: 100 })
        .withMessage('場所は100文字以下である必要があります'),
    (0, express_validator_1.body)('tags')
        .optional()
        .isArray()
        .withMessage('タグは配列である必要があります'),
    (0, express_validator_1.body)('tags.*')
        .optional()
        .isString()
        .withMessage('タグは文字列である必要があります')
        .isLength({ max: 30 })
        .withMessage('タグは30文字以下である必要があります'),
    handleValidationErrors
], async (req, res) => {
    try {
        const { youtubeUrl, metadata = {}, tags = [] } = req.body;
        const userId = req.user.userId;
        const language = (0, languageDetection_1.getRequestLanguage)(req);
        // レスポンスに言語情報を設定
        (0, languageDetection_1.setResponseLanguage)(res, language);
        // URL正規化を実行
        let normalizedUrl;
        try {
            normalizedUrl = youtubeService_1.youtubeService.normalizeURL(youtubeUrl);
        }
        catch (error) {
            // URL正規化エラーの場合、多言語対応エラーレスポンスを返す
            const errorResponse = (0, languageDetection_1.createLocalizedErrorResponse)(error, language, true);
            return res.status(400).json(errorResponse);
        }
        const videoId = normalizedUrl.videoId;
        // 既に登録済みかチェック
        const existingVideo = await Video_1.Video.findOne({ youtubeId: videoId });
        if (existingVideo) {
            const duplicateError = {
                type: urlNormalizer_1.URLValidationErrorType.DUPLICATE_VIDEO,
                message: 'Video already exists'
            };
            const errorResponse = (0, languageDetection_1.createLocalizedErrorResponse)(duplicateError, language);
            return res.status(409).json(errorResponse);
        }
        // YouTube APIから動画情報を取得
        let videoInfo;
        try {
            videoInfo = await youtubeService_1.youtubeService.getVideoInfo(videoId);
        }
        catch (error) {
            // YouTube APIエラーを適切なエラータイプにマッピング
            let errorType = urlNormalizer_1.URLValidationErrorType.NETWORK_ERROR;
            if (error.code === 'VIDEO_NOT_FOUND' || error.code === 'INVALID_VIDEO_ID') {
                errorType = urlNormalizer_1.URLValidationErrorType.VIDEO_NOT_FOUND;
            }
            const mappedError = { type: errorType, message: error.message };
            const errorResponse = (0, languageDetection_1.createLocalizedErrorResponse)(mappedError, language);
            return res.status(400).json(errorResponse);
        }
        // 動画が公開されているかチェック
        const isPublic = await youtubeService_1.youtubeService.isVideoPublic(videoId);
        if (!isPublic) {
            const privateError = {
                type: urlNormalizer_1.URLValidationErrorType.PRIVATE_VIDEO,
                message: 'Video is private'
            };
            const errorResponse = (0, languageDetection_1.createLocalizedErrorResponse)(privateError, language);
            return res.status(400).json(errorResponse);
        }
        // 動画を保存
        const video = new Video_1.Video({
            youtubeId: videoId,
            title: videoInfo.title,
            channelName: videoInfo.channelTitle,
            uploadDate: new Date(videoInfo.publishedAt),
            description: videoInfo.description.length > 2000 ? videoInfo.description.substring(0, 2000) : videoInfo.description,
            metadata: {
                teamName: metadata.teamName,
                performanceName: metadata.performanceName,
                eventName: metadata.eventName,
                year: metadata.year,
                location: metadata.location
            },
            tags: tags,
            thumbnailUrl: videoInfo.thumbnails.high?.url || videoInfo.thumbnails.medium?.url || videoInfo.thumbnails.default.url,
            createdBy: userId
        });
        await video.save();
        // 成功メッセージを多言語対応
        const successMessage = language === 'en'
            ? 'Video registered successfully'
            : '動画が正常に登録されました';
        res.status(201).json({
            success: true,
            message: successMessage,
            data: {
                ...video.toObject(),
                normalizedUrl: normalizedUrl.canonical,
                originalUrl: normalizedUrl.original
            },
            language: language
        });
    }
    catch (error) {
        console.error('Video registration error:', error);
        const language = (0, languageDetection_1.getRequestLanguage)(req);
        if (error.code) {
            // YouTubeServiceからのエラー
            let errorType = urlNormalizer_1.URLValidationErrorType.NETWORK_ERROR;
            if (error.code === 'VIDEO_NOT_FOUND' || error.code === 'INVALID_VIDEO_ID') {
                errorType = urlNormalizer_1.URLValidationErrorType.VIDEO_NOT_FOUND;
            }
            const mappedError = { type: errorType, message: error.message };
            const errorResponse = (0, languageDetection_1.createLocalizedErrorResponse)(mappedError, language);
            return res.status(400).json(errorResponse);
        }
        if (error.name === 'ValidationError') {
            const validationMessage = language === 'en' ? 'Validation error' : 'バリデーションエラー';
            return res.status(400).json({
                success: false,
                error: {
                    type: 'VALIDATION_ERROR',
                    message: validationMessage,
                    errors: Object.values(error.errors).map((err) => err.message),
                    language: language
                }
            });
        }
        // 予期しないエラーの場合
        const networkError = {
            type: urlNormalizer_1.URLValidationErrorType.NETWORK_ERROR,
            message: error.message || 'Unexpected error occurred'
        };
        const errorResponse = (0, languageDetection_1.createLocalizedErrorResponse)(networkError, language);
        res.status(500).json(errorResponse);
    }
});
/**
 * 動画一覧を取得
 * GET /api/videos
 */
router.get('/', [
    (0, express_validator_1.query)('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('ページ番号は1以上の整数である必要があります'),
    (0, express_validator_1.query)('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('リミットは1から100の間の整数である必要があります'),
    (0, express_validator_1.query)('search')
        .optional()
        .isString()
        .withMessage('検索キーワードは文字列である必要があります'),
    (0, express_validator_1.query)('teamName')
        .optional()
        .isString()
        .withMessage('チーム名は文字列である必要があります'),
    (0, express_validator_1.query)('eventName')
        .optional()
        .isString()
        .withMessage('大会名は文字列である必要があります'),
    (0, express_validator_1.query)('year')
        .optional()
        .isInt({ min: 1900 })
        .withMessage('年度は1900年以降の整数である必要があります'),
    (0, express_validator_1.query)('tags')
        .optional()
        .isString()
        .withMessage('タグは文字列である必要があります'),
    handleValidationErrors
], async (req, res) => {
    try {
        const { page = 1, limit = 20, search, teamName, eventName, year, tags } = req.query;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;
        // 検索条件を構築
        const filter = {};
        if (search) {
            filter.$or = [
                { title: { $regex: search, $options: 'i' } },
                { 'metadata.teamName': { $regex: search, $options: 'i' } },
                { 'metadata.performanceName': { $regex: search, $options: 'i' } },
                { 'metadata.eventName': { $regex: search, $options: 'i' } }
            ];
        }
        if (teamName) {
            filter['metadata.teamName'] = { $regex: teamName, $options: 'i' };
        }
        if (eventName) {
            filter['metadata.eventName'] = { $regex: eventName, $options: 'i' };
        }
        if (year) {
            filter['metadata.year'] = parseInt(year);
        }
        if (tags) {
            const tagArray = tags.split(',').map(tag => tag.trim());
            filter.tags = { $in: tagArray };
        }
        // 動画を取得
        const videos = await Video_1.Video.find(filter)
            .populate('createdBy', 'username email')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limitNum);
        // 総数を取得
        const total = await Video_1.Video.countDocuments(filter);
        // IDフィールドを正規化
        const normalizedVideos = videos.map(video => ({
            ...video.toObject(),
            id: video._id.toString()
        }));
        res.json({
            status: 'success',
            data: {
                videos: normalizedVideos,
                pagination: {
                    page: pageNum,
                    limit: limitNum,
                    total,
                    pages: Math.ceil(total / limitNum)
                }
            }
        });
    }
    catch (error) {
        console.error('Video list fetch error:', error);
        res.status(500).json({
            status: 'error',
            code: 'INTERNAL_ERROR',
            message: 'サーバーエラーが発生しました'
        });
    }
});
/**
 * 動画詳細を取得
 * GET /api/videos/:id
 */
router.get('/:id', [
    (0, express_validator_1.param)('id')
        .isMongoId()
        .withMessage('有効な動画IDを指定してください'),
    handleValidationErrors
], async (req, res) => {
    try {
        const { id } = req.params;
        const video = await Video_1.Video.findById(id)
            .populate('createdBy', 'username email');
        if (!video) {
            return res.status(404).json({
                status: 'error',
                code: 'VIDEO_NOT_FOUND',
                message: '指定された動画が見つかりません'
            });
        }
        // IDフィールドを正規化
        const normalizedVideo = {
            ...video.toObject(),
            id: video._id.toString()
        };
        res.json({
            status: 'success',
            data: normalizedVideo
        });
    }
    catch (error) {
        console.error('Video detail fetch error:', error);
        res.status(500).json({
            status: 'error',
            code: 'INTERNAL_ERROR',
            message: 'サーバーエラーが発生しました'
        });
    }
});
/**
 * 動画情報を更新
 * PUT /api/videos/:id
 */
router.put('/:id', [
    middleware_1.auth,
    (0, express_validator_1.param)('id')
        .isMongoId()
        .withMessage('有効な動画IDを指定してください'),
    (0, express_validator_1.body)('metadata.teamName')
        .optional({ values: 'falsy' })
        .custom((value) => {
        if (value !== undefined && value !== null && typeof value !== 'string') {
            throw new Error('チーム名は文字列である必要があります');
        }
        if (value && value.length > 100) {
            throw new Error('チーム名は100文字以下である必要があります');
        }
        return true;
    }),
    (0, express_validator_1.body)('metadata.performanceName')
        .optional({ values: 'falsy' })
        .custom((value) => {
        if (value !== undefined && value !== null && typeof value !== 'string') {
            throw new Error('演舞名は文字列である必要があります');
        }
        if (value && value.length > 100) {
            throw new Error('演舞名は100文字以下である必要があります');
        }
        return true;
    }),
    (0, express_validator_1.body)('metadata.eventName')
        .optional({ values: 'falsy' })
        .custom((value) => {
        if (value !== undefined && value !== null && typeof value !== 'string') {
            throw new Error('大会名は文字列である必要があります');
        }
        if (value && value.length > 100) {
            throw new Error('大会名は100文字以下である必要があります');
        }
        return true;
    }),
    (0, express_validator_1.body)('metadata.year')
        .optional({ values: 'falsy' })
        .custom((value) => {
        if (value !== undefined && value !== null) {
            const year = parseInt(value);
            if (isNaN(year) || year < 1900 || year > new Date().getFullYear() + 1) {
                throw new Error('年度は1900年から来年までの範囲で入力してください');
            }
        }
        return true;
    }),
    (0, express_validator_1.body)('metadata.location')
        .optional({ values: 'falsy' })
        .custom((value) => {
        if (value !== undefined && value !== null && typeof value !== 'string') {
            throw new Error('場所は文字列である必要があります');
        }
        if (value && value.length > 100) {
            throw new Error('場所は100文字以下である必要があります');
        }
        return true;
    }),
    (0, express_validator_1.body)('tags')
        .optional()
        .isArray()
        .withMessage('タグは配列である必要があります'),
    (0, express_validator_1.body)('tags.*')
        .optional()
        .isString()
        .withMessage('タグは文字列である必要があります')
        .isLength({ max: 30 })
        .withMessage('タグは30文字以下である必要があります'),
    handleValidationErrors
], async (req, res) => {
    try {
        const { id } = req.params;
        const { metadata = {}, tags } = req.body;
        const userId = req.user.userId;
        console.log('PUT /videos/:id - Received ID:', id);
        console.log('PUT /videos/:id - ID type:', typeof id);
        console.log('PUT /videos/:id - ID length:', id.length);
        console.log('PUT /videos/:id - Is valid ObjectId:', mongoose_1.default.Types.ObjectId.isValid(id));
        console.log('PUT /videos/:id - Request body:', JSON.stringify(req.body, null, 2));
        // 動画の存在確認
        const video = await Video_1.Video.findById(id);
        if (!video) {
            return res.status(404).json({
                status: 'error',
                code: 'VIDEO_NOT_FOUND',
                message: '指定された動画が見つかりません'
            });
        }
        // 権限チェック（作成者または管理者のみ）
        const userRole = req.user.role;
        if (video.createdBy.toString() !== userId && userRole !== 'admin') {
            return res.status(403).json({
                status: 'error',
                code: 'FORBIDDEN',
                message: 'この動画を編集する権限がありません'
            });
        }
        // メタデータを更新
        const updateData = {};
        if (metadata.teamName !== undefined) {
            updateData['metadata.teamName'] = metadata.teamName;
        }
        if (metadata.performanceName !== undefined) {
            updateData['metadata.performanceName'] = metadata.performanceName;
        }
        if (metadata.eventName !== undefined) {
            updateData['metadata.eventName'] = metadata.eventName;
        }
        if (metadata.year !== undefined) {
            updateData['metadata.year'] = metadata.year;
        }
        if (metadata.location !== undefined) {
            updateData['metadata.location'] = metadata.location;
        }
        if (tags !== undefined) {
            updateData.tags = tags;
        }
        const updatedVideo = await Video_1.Video.findByIdAndUpdate(id, updateData, { new: true, runValidators: true }).populate('createdBy', 'username email');
        res.json({
            status: 'success',
            message: '動画情報が正常に更新されました',
            data: updatedVideo
        });
    }
    catch (error) {
        console.error('Video update error:', error);
        if (error.name === 'ValidationError') {
            return res.status(400).json({
                status: 'error',
                code: 'VALIDATION_ERROR',
                message: 'バリデーションエラー',
                errors: Object.values(error.errors).map((err) => err.message)
            });
        }
        res.status(500).json({
            status: 'error',
            code: 'INTERNAL_ERROR',
            message: 'サーバーエラーが発生しました'
        });
    }
});
/**
 * 動画を削除
 * DELETE /api/videos/:id
 */
router.delete('/:id', [
    middleware_1.auth,
    (0, express_validator_1.param)('id')
        .isMongoId()
        .withMessage('有効な動画IDを指定してください'),
    handleValidationErrors
], async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.userId;
        // 動画の存在確認
        const video = await Video_1.Video.findById(id);
        if (!video) {
            return res.status(404).json({
                status: 'error',
                code: 'VIDEO_NOT_FOUND',
                message: '指定された動画が見つかりません'
            });
        }
        // 権限チェック（作成者または管理者のみ）
        const userRole = req.user.role;
        if (video.createdBy.toString() !== userId && userRole !== 'admin') {
            return res.status(403).json({
                status: 'error',
                code: 'FORBIDDEN',
                message: 'この動画を削除する権限がありません'
            });
        }
        // TODO: 評価セッションで使用されている場合は削除を防ぐ
        // この機能は後のタスクで実装
        await Video_1.Video.findByIdAndDelete(id);
        res.json({
            status: 'success',
            message: '動画が正常に削除されました'
        });
    }
    catch (error) {
        console.error('Video deletion error:', error);
        res.status(500).json({
            status: 'error',
            code: 'INTERNAL_ERROR',
            message: 'サーバーエラーが発生しました'
        });
    }
});
/**
 * 動画の統計情報を取得
 * GET /api/videos/stats/summary
 */
router.get('/stats/summary', [
    middleware_1.auth
], async (_req, res) => {
    try {
        const totalVideos = await Video_1.Video.countDocuments();
        // 年度別統計
        const yearStats = await Video_1.Video.aggregate([
            {
                $match: {
                    'metadata.year': { $exists: true, $ne: null }
                }
            },
            {
                $group: {
                    _id: '$metadata.year',
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { _id: -1 }
            }
        ]);
        // チーム別統計（上位10チーム）
        const teamStats = await Video_1.Video.aggregate([
            {
                $match: {
                    'metadata.teamName': { $exists: true, $nin: [null, ''] }
                }
            },
            {
                $group: {
                    _id: '$metadata.teamName',
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { count: -1 }
            },
            {
                $limit: 10
            }
        ]);
        // 大会別統計（上位10大会）
        const eventStats = await Video_1.Video.aggregate([
            {
                $match: {
                    'metadata.eventName': { $exists: true, $nin: [null, ''] }
                }
            },
            {
                $group: {
                    _id: '$metadata.eventName',
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { count: -1 }
            },
            {
                $limit: 10
            }
        ]);
        // 最近の登録動画（上位5件）
        const recentVideos = await Video_1.Video.find()
            .populate('createdBy', 'username')
            .sort({ createdAt: -1 })
            .limit(5)
            .select('title metadata.teamName metadata.eventName createdAt');
        res.json({
            status: 'success',
            data: {
                totalVideos,
                yearStats,
                teamStats,
                eventStats,
                recentVideos
            }
        });
    }
    catch (error) {
        console.error('Video stats fetch error:', error);
        res.status(500).json({
            status: 'error',
            code: 'INTERNAL_ERROR',
            message: 'サーバーエラーが発生しました'
        });
    }
});
exports.default = router;
//# sourceMappingURL=videos.js.map