import { Router, Request, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import mongoose from 'mongoose';
import { Video } from '../models/Video';
import { youtubeService } from '../services/youtubeService';
import { auth } from '../middleware';
import { 
  languageDetectionMiddleware, 
  getRequestLanguage, 
  setResponseLanguage, 
  createLocalizedErrorResponse 
} from '../middleware/languageDetection';
import { URLValidationErrorType } from '../utils/urlNormalizer';

const router = Router();

// 言語検出ミドルウェアを全ルートに適用
router.use(languageDetectionMiddleware);

// バリデーションエラーハンドラー
const handleValidationErrors = (req: Request, res: Response, next: any): void => {
  const errors = validationResult(req);
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
  query('url')
    .notEmpty()
    .withMessage('YouTube URLは必須です')
    .isString()
    .withMessage('YouTube URLは文字列である必要があります'),
  query('lang')
    .optional()
    .isIn(['ja', 'en'])
    .withMessage('言語は ja または en である必要があります'),
  handleValidationErrors
], async (req: Request, res: Response): Promise<any> => {
  try {
    const { url } = req.query as { url: string };
    const language = getRequestLanguage(req);
    
    // レスポンスに言語情報を設定
    setResponseLanguage(res, language);
    
    // URL正規化を実行
    let normalizedUrl;
    try {
      normalizedUrl = youtubeService.normalizeURL(url);
    } catch (error: any) {
      // URL正規化エラーの場合、多言語対応エラーレスポンスを返す
      const errorResponse = createLocalizedErrorResponse(error, language, true);
      return res.status(400).json(errorResponse);
    }

    const videoId = normalizedUrl.videoId;

    // 既に登録済みかチェック
    const existingVideo = await Video.findOne({ youtubeId: videoId });
    if (existingVideo) {
      const duplicateError = {
        type: URLValidationErrorType.DUPLICATE_VIDEO,
        message: 'Video already exists'
      };
      const errorResponse = createLocalizedErrorResponse(duplicateError, language);
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
      videoInfo = await youtubeService.getVideoInfo(videoId);
    } catch (error: any) {
      // YouTube APIエラーを適切なエラータイプにマッピング
      let errorType = URLValidationErrorType.NETWORK_ERROR;
      
      if (error.code === 'VIDEO_NOT_FOUND' || error.code === 'INVALID_VIDEO_ID') {
        errorType = URLValidationErrorType.VIDEO_NOT_FOUND;
      }
      
      const mappedError = { type: errorType, message: error.message };
      const errorResponse = createLocalizedErrorResponse(mappedError, language);
      return res.status(400).json(errorResponse);
    }

    // 動画が公開されているかチェック
    const isPublic = await youtubeService.isVideoPublic(videoId);
    if (!isPublic) {
      const privateError = {
        type: URLValidationErrorType.PRIVATE_VIDEO,
        message: 'Video is private'
      };
      const errorResponse = createLocalizedErrorResponse(privateError, language);
      return res.status(400).json(errorResponse);
    }

    // 埋め込み可能かチェック
    const isEmbeddable = await youtubeService.isEmbeddable(videoId);

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

  } catch (error: any) {
    console.error('YouTube info fetch error:', error);
    
    // 予期しないエラーの場合
    const language = getRequestLanguage(req);
    const networkError = {
      type: URLValidationErrorType.NETWORK_ERROR,
      message: error.message || 'Unexpected error occurred'
    };
    const errorResponse = createLocalizedErrorResponse(networkError, language);
    
    res.status(500).json(errorResponse);
  }
});

/**
 * 動画を登録 - 改善版
 * POST /api/videos
 */
router.post('/', [
  auth,
  body('youtubeUrl')
    .notEmpty()
    .withMessage('YouTube URLは必須です')
    .isString()
    .withMessage('YouTube URLは文字列である必要があります'),
  body('metadata.teamName')
    .optional()
    .isString()
    .withMessage('チーム名は文字列である必要があります')
    .isLength({ max: 100 })
    .withMessage('チーム名は100文字以下である必要があります'),
  body('metadata.performanceName')
    .optional()
    .isString()
    .withMessage('演舞名は文字列である必要があります')
    .isLength({ max: 100 })
    .withMessage('演舞名は100文字以下である必要があります'),
  body('metadata.eventName')
    .optional()
    .isString()
    .withMessage('大会名は文字列である必要があります')
    .isLength({ max: 100 })
    .withMessage('大会名は100文字以下である必要があります'),
  body('metadata.year')
    .optional()
    .isInt({ min: 1900, max: new Date().getFullYear() + 1 })
    .withMessage('年度は1900年から来年までの範囲で入力してください'),
  body('metadata.location')
    .optional()
    .isString()
    .withMessage('場所は文字列である必要があります')
    .isLength({ max: 100 })
    .withMessage('場所は100文字以下である必要があります'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('タグは配列である必要があります'),
  body('tags.*')
    .optional()
    .isString()
    .withMessage('タグは文字列である必要があります')
    .isLength({ max: 30 })
    .withMessage('タグは30文字以下である必要があります'),
  handleValidationErrors
], async (req: Request, res: Response): Promise<any> => {
  try {
    const { youtubeUrl, metadata = {}, tags = [] } = req.body;
    const userId = (req as any).user.userId;
    const language = getRequestLanguage(req);
    
    // レスポンスに言語情報を設定
    setResponseLanguage(res, language);

    // URL正規化を実行
    let normalizedUrl;
    try {
      normalizedUrl = youtubeService.normalizeURL(youtubeUrl);
    } catch (error: any) {
      // URL正規化エラーの場合、多言語対応エラーレスポンスを返す
      const errorResponse = createLocalizedErrorResponse(error, language, true);
      return res.status(400).json(errorResponse);
    }

    const videoId = normalizedUrl.videoId;

    // 既に登録済みかチェック
    const existingVideo = await Video.findOne({ youtubeId: videoId });
    if (existingVideo) {
      const duplicateError = {
        type: URLValidationErrorType.DUPLICATE_VIDEO,
        message: 'Video already exists'
      };
      const errorResponse = createLocalizedErrorResponse(duplicateError, language);
      return res.status(409).json(errorResponse);
    }

    // YouTube APIから動画情報を取得
    let videoInfo;
    try {
      videoInfo = await youtubeService.getVideoInfo(videoId);
    } catch (error: any) {
      // YouTube APIエラーを適切なエラータイプにマッピング
      let errorType = URLValidationErrorType.NETWORK_ERROR;
      
      if (error.code === 'VIDEO_NOT_FOUND' || error.code === 'INVALID_VIDEO_ID') {
        errorType = URLValidationErrorType.VIDEO_NOT_FOUND;
      }
      
      const mappedError = { type: errorType, message: error.message };
      const errorResponse = createLocalizedErrorResponse(mappedError, language);
      return res.status(400).json(errorResponse);
    }

    // 動画が公開されているかチェック
    const isPublic = await youtubeService.isVideoPublic(videoId);
    if (!isPublic) {
      const privateError = {
        type: URLValidationErrorType.PRIVATE_VIDEO,
        message: 'Video is private'
      };
      const errorResponse = createLocalizedErrorResponse(privateError, language);
      return res.status(400).json(errorResponse);
    }

    // 動画を保存
    const video = new Video({
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

  } catch (error: any) {
    console.error('Video registration error:', error);
    
    const language = getRequestLanguage(req);
    
    if (error.code) {
      // YouTubeServiceからのエラー
      let errorType = URLValidationErrorType.NETWORK_ERROR;
      
      if (error.code === 'VIDEO_NOT_FOUND' || error.code === 'INVALID_VIDEO_ID') {
        errorType = URLValidationErrorType.VIDEO_NOT_FOUND;
      }
      
      const mappedError = { type: errorType, message: error.message };
      const errorResponse = createLocalizedErrorResponse(mappedError, language);
      return res.status(400).json(errorResponse);
    }

    if (error.name === 'ValidationError') {
      const validationMessage = language === 'en' ? 'Validation error' : 'バリデーションエラー';
      return res.status(400).json({
        success: false,
        error: {
          type: 'VALIDATION_ERROR',
          message: validationMessage,
          errors: Object.values(error.errors).map((err: any) => err.message),
          language: language
        }
      });
    }

    // 予期しないエラーの場合
    const networkError = {
      type: URLValidationErrorType.NETWORK_ERROR,
      message: error.message || 'Unexpected error occurred'
    };
    const errorResponse = createLocalizedErrorResponse(networkError, language);
    
    res.status(500).json(errorResponse);
  }
});

/**
 * 動画一覧を取得
 * GET /api/videos
 */
router.get('/', [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('ページ番号は1以上の整数である必要があります'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('リミットは1から100の間の整数である必要があります'),
  query('search')
    .optional()
    .isString()
    .withMessage('検索キーワードは文字列である必要があります'),
  query('teamName')
    .optional()
    .isString()
    .withMessage('チーム名は文字列である必要があります'),
  query('eventName')
    .optional()
    .isString()
    .withMessage('大会名は文字列である必要があります'),
  query('year')
    .optional()
    .isInt({ min: 1900 })
    .withMessage('年度は1900年以降の整数である必要があります'),
  query('tags')
    .optional()
    .isString()
    .withMessage('タグは文字列である必要があります'),
  handleValidationErrors
], async (req: Request, res: Response): Promise<any> => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      teamName,
      eventName,
      year,
      tags
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // 検索条件を構築
    const filter: any = {};

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
      filter['metadata.year'] = parseInt(year as string);
    }

    if (tags) {
      const tagArray = (tags as string).split(',').map(tag => tag.trim());
      filter.tags = { $in: tagArray };
    }

    // 動画を取得
    const videos = await Video.find(filter)
      .populate('createdBy', 'username email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    // 総数を取得
    const total = await Video.countDocuments(filter);

    res.json({
      status: 'success',
      data: {
        videos,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum)
        }
      }
    });

  } catch (error) {
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
  param('id')
    .isMongoId()
    .withMessage('有効な動画IDを指定してください'),
  handleValidationErrors
], async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;

    const video = await Video.findById(id)
      .populate('createdBy', 'username email');

    if (!video) {
      return res.status(404).json({
        status: 'error',
        code: 'VIDEO_NOT_FOUND',
        message: '指定された動画が見つかりません'
      });
    }

    res.json({
      status: 'success',
      data: video
    });

  } catch (error) {
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
  auth,
  param('id')
    .isMongoId()
    .withMessage('有効な動画IDを指定してください'),
  body('metadata.teamName')
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
  body('metadata.performanceName')
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
  body('metadata.eventName')
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
  body('metadata.year')
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
  body('metadata.location')
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
  body('tags')
    .optional()
    .isArray()
    .withMessage('タグは配列である必要があります'),
  body('tags.*')
    .optional()
    .isString()
    .withMessage('タグは文字列である必要があります')
    .isLength({ max: 30 })
    .withMessage('タグは30文字以下である必要があります'),
  handleValidationErrors
], async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const { metadata = {}, tags } = req.body;
    const userId = (req as any).user.userId;

    console.log('PUT /videos/:id - Received ID:', id);
    console.log('PUT /videos/:id - ID type:', typeof id);
    console.log('PUT /videos/:id - ID length:', id.length);
    console.log('PUT /videos/:id - Is valid ObjectId:', mongoose.Types.ObjectId.isValid(id));
    console.log('PUT /videos/:id - Request body:', JSON.stringify(req.body, null, 2));

    // 動画の存在確認
    const video = await Video.findById(id);
    if (!video) {
      return res.status(404).json({
        status: 'error',
        code: 'VIDEO_NOT_FOUND',
        message: '指定された動画が見つかりません'
      });
    }

    // 権限チェック（作成者または管理者のみ）
    const userRole = (req as any).user.role;
    if (video.createdBy.toString() !== userId && userRole !== 'admin') {
      return res.status(403).json({
        status: 'error',
        code: 'FORBIDDEN',
        message: 'この動画を編集する権限がありません'
      });
    }

    // メタデータを更新
    const updateData: any = {};
    
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

    const updatedVideo = await Video.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('createdBy', 'username email');

    res.json({
      status: 'success',
      message: '動画情報が正常に更新されました',
      data: updatedVideo
    });

  } catch (error: any) {
    console.error('Video update error:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        status: 'error',
        code: 'VALIDATION_ERROR',
        message: 'バリデーションエラー',
        errors: Object.values(error.errors).map((err: any) => err.message)
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
  auth,
  param('id')
    .isMongoId()
    .withMessage('有効な動画IDを指定してください'),
  handleValidationErrors
], async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.userId;

    // 動画の存在確認
    const video = await Video.findById(id);
    if (!video) {
      return res.status(404).json({
        status: 'error',
        code: 'VIDEO_NOT_FOUND',
        message: '指定された動画が見つかりません'
      });
    }

    // 権限チェック（作成者または管理者のみ）
    const userRole = (req as any).user.role;
    if (video.createdBy.toString() !== userId && userRole !== 'admin') {
      return res.status(403).json({
        status: 'error',
        code: 'FORBIDDEN',
        message: 'この動画を削除する権限がありません'
      });
    }

    // TODO: 評価セッションで使用されている場合は削除を防ぐ
    // この機能は後のタスクで実装

    await Video.findByIdAndDelete(id);

    res.json({
      status: 'success',
      message: '動画が正常に削除されました'
    });

  } catch (error) {
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
  auth
], async (_req: Request, res: Response): Promise<void> => {
  try {
    const totalVideos = await Video.countDocuments();
    
    // 年度別統計
    const yearStats = await Video.aggregate([
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
    const teamStats = await Video.aggregate([
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
    const eventStats = await Video.aggregate([
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
    const recentVideos = await Video.find()
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

  } catch (error) {
    console.error('Video stats fetch error:', error);
    res.status(500).json({
      status: 'error',
      code: 'INTERNAL_ERROR',
      message: 'サーバーエラーが発生しました'
    });
  }
});

export default router;