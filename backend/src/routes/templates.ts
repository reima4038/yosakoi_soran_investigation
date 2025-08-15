import { Router, Request, Response } from 'express';
import { Template, ICategory, ICriterion } from '../models/Template';
import { authenticateToken } from '../middleware';
import mongoose from 'mongoose';

const router = Router();

// GET /api/templates - テンプレート一覧取得
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    
    // 公開テンプレートまたは自分が作成したテンプレートのみ取得
    const templates = await Template.find({
      $or: [
        { isPublic: true },
        { creatorId: userId }
      ]
    })
      .populate('creatorId', 'username email')
      .sort({ createdAt: -1 });

    // IDフィールドを正規化
    const normalizedTemplates = templates.map(template => ({
      ...template.toObject(),
      id: (template._id as mongoose.Types.ObjectId).toString()
    }));

    res.json({
      status: 'success',
      data: normalizedTemplates
    });
  } catch (error: any) {
    console.error('Template list error:', error);
    res.status(500).json({
      status: 'error',
      message: 'テンプレート一覧の取得に失敗しました'
    });
  }
});

// GET /api/templates/:id - テンプレート詳細取得
router.get('/:id', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        status: 'error',
        message: '無効なテンプレートIDです'
      });
      return;
    }

    const template = await Template.findById(id)
      .populate('creatorId', 'username email');

    if (!template) {
      res.status(404).json({
        status: 'error',
        message: 'テンプレートが見つかりません'
      });
      return;
    }

    const userId = req.user?.userId;
    
    // 非公開テンプレートの場合、作成者のみアクセス可能
    if (!template.isPublic && template.creatorId._id.toString() !== userId) {
      res.status(403).json({
        status: 'error',
        message: 'このテンプレートにアクセスする権限がありません'
      });
      return;
    }

    // IDフィールドを正規化
    const normalizedTemplate = {
      ...template.toObject(),
      id: (template._id as mongoose.Types.ObjectId).toString()
    };

    res.json({
      status: 'success',
      data: normalizedTemplate
    });
  } catch (error: any) {
    console.error('Template detail error:', error);
    res.status(500).json({
      status: 'error',
      message: 'テンプレート詳細の取得に失敗しました'
    });
  }
});

// POST /api/templates - テンプレート作成
router.post('/', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, description, categories, allowGeneralComments, isPublic } = req.body;
    const userId = req.user?.userId;

    console.log('Template creation request:', {
      name,
      description,
      categories: categories ? categories.length : 'undefined',
      userId,
      requestBody: JSON.stringify(req.body, null, 2)
    });

    if (!userId) {
      res.status(401).json({
        status: 'error',
        message: '認証が必要です'
      });
      return;
    }

    // バリデーション
    if (!name || !description || !categories || !Array.isArray(categories)) {
      res.status(400).json({
        status: 'error',
        message: 'テンプレート名、説明、カテゴリは必須です'
      });
      return;
    }

    if (categories.length === 0) {
      res.status(400).json({
        status: 'error',
        message: '少なくとも1つのカテゴリが必要です'
      });
      return;
    }

    // カテゴリの重みの合計をチェック
    const categoryWeightSum = categories.reduce((sum: number, category: ICategory) => sum + category.weight, 0);
    if (Math.abs(categoryWeightSum - 1) > 0.001) {
      res.status(400).json({
        status: 'error',
        message: 'カテゴリの重みの合計は100%である必要があります'
      });
      return;
    }

    // 各カテゴリ内の評価基準の重みの合計をチェック
    for (const category of categories) {
      console.log('Processing category:', {
        name: category.name,
        criteria: category.criteria ? category.criteria.length : 'undefined',
        criteriaType: typeof category.criteria
      });

      if (!category.criteria || !Array.isArray(category.criteria) || category.criteria.length === 0) {
        res.status(400).json({
          status: 'error',
          message: `カテゴリ「${category.name}」には少なくとも1つの評価基準が必要です`
        });
        return;
      }

      const criteriaWeightSum = category.criteria.reduce((sum: number, criterion: ICriterion) => sum + criterion.weight, 0);
      if (Math.abs(criteriaWeightSum - 1) > 0.001) {
        res.status(400).json({
          status: 'error',
          message: `カテゴリ「${category.name}」の評価基準の重みの合計は100%である必要があります`
        });
        return;
      }
    }

    const template = new Template({
      name,
      description,
      creatorId: userId,
      categories,
      allowGeneralComments: allowGeneralComments !== undefined ? allowGeneralComments : true,
      isPublic: isPublic !== undefined ? isPublic : true
    });

    await template.save();

    const populatedTemplate = await Template.findById(template._id)
      .populate('creatorId', 'username email');

    // IDフィールドを正規化
    const normalizedTemplate = {
      ...populatedTemplate!.toObject(),
      id: (populatedTemplate!._id as mongoose.Types.ObjectId).toString()
    };

    res.status(201).json({
      status: 'success',
      data: normalizedTemplate,
      message: 'テンプレートが正常に作成されました'
    });
  } catch (error: any) {
    console.error('Template creation error:', error);
    
    // Mongooseバリデーションエラーの場合
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map((err: any) => err.message);
      res.status(400).json({
        status: 'error',
        message: validationErrors.join(', '),
        errors: validationErrors
      });
      return;
    }
    
    // 重みに関するカスタムエラーの場合
    if (error instanceof Error && error.message.includes('重み')) {
      res.status(400).json({
        status: 'error',
        message: error.message
      });
      return;
    }

    res.status(500).json({
      status: 'error',
      message: 'テンプレートの作成に失敗しました'
    });
  }
});

// PUT /api/templates/:id - テンプレート更新
router.put('/:id', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, description, categories, allowGeneralComments, isPublic } = req.body;
    const userId = req.user?.userId;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        status: 'error',
        message: '無効なテンプレートIDです'
      });
      return;
    }

    const template = await Template.findById(id);
    if (!template) {
      res.status(404).json({
        status: 'error',
        message: 'テンプレートが見つかりません'
      });
      return;
    }

    // 作成者のみ編集可能
    if (template.creatorId.toString() !== userId) {
      res.status(403).json({
        status: 'error',
        message: 'このテンプレートを編集する権限がありません'
      });
      return;
    }

    // バリデーション
    if (!name || !description || !categories || !Array.isArray(categories)) {
      res.status(400).json({
        status: 'error',
        message: 'テンプレート名、説明、カテゴリは必須です'
      });
      return;
    }

    if (categories.length === 0) {
      res.status(400).json({
        status: 'error',
        message: '少なくとも1つのカテゴリが必要です'
      });
      return;
    }

    template.name = name;
    template.description = description;
    template.categories = categories;
    if (allowGeneralComments !== undefined) {
      template.allowGeneralComments = allowGeneralComments;
    }
    if (isPublic !== undefined) {
      template.isPublic = isPublic;
    }

    await template.save();

    const populatedTemplate = await Template.findById(template._id)
      .populate('creatorId', 'username email');

    // IDフィールドを正規化
    const normalizedTemplate = {
      ...populatedTemplate!.toObject(),
      id: (populatedTemplate!._id as mongoose.Types.ObjectId).toString()
    };

    res.json({
      status: 'success',
      data: normalizedTemplate,
      message: 'テンプレートが正常に更新されました'
    });
  } catch (error: any) {
    console.error('Template update error:', error);
    
    if (error instanceof Error && error.message.includes('重み')) {
      res.status(400).json({
        status: 'error',
        message: error.message
      });
      return;
    }

    res.status(500).json({
      status: 'error',
      message: 'テンプレートの更新に失敗しました'
    });
  }
});

// DELETE /api/templates/:id - テンプレート削除
router.delete('/:id', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        status: 'error',
        message: '無効なテンプレートIDです'
      });
      return;
    }

    const template = await Template.findById(id);
    if (!template) {
      res.status(404).json({
        status: 'error',
        message: 'テンプレートが見つかりません'
      });
      return;
    }

    // 作成者のみ削除可能
    if (template.creatorId.toString() !== userId) {
      res.status(403).json({
        status: 'error',
        message: 'このテンプレートを削除する権限がありません'
      });
      return;
    }

    await Template.findByIdAndDelete(id);

    res.json({
      status: 'success',
      message: 'テンプレートが正常に削除されました'
    });
  } catch (error: any) {
    console.error('Template deletion error:', error);
    res.status(500).json({
      status: 'error',
      message: 'テンプレートの削除に失敗しました'
    });
  }
});

// PUT /api/templates/:id/visibility - テンプレート可視性切り替え
router.put('/:id/visibility', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { isPublic } = req.body;
    const userId = req.user?.userId;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        status: 'error',
        message: '無効なテンプレートIDです'
      });
      return;
    }

    if (typeof isPublic !== 'boolean') {
      res.status(400).json({
        status: 'error',
        message: '公開設定は真偽値である必要があります'
      });
      return;
    }

    const template = await Template.findById(id);
    if (!template) {
      res.status(404).json({
        status: 'error',
        message: 'テンプレートが見つかりません'
      });
      return;
    }

    // 作成者のみ可視性を変更可能
    if (template.creatorId.toString() !== userId) {
      res.status(403).json({
        status: 'error',
        message: 'このテンプレートの可視性を変更する権限がありません'
      });
      return;
    }

    template.isPublic = isPublic;
    await template.save();

    const populatedTemplate = await Template.findById(template._id)
      .populate('creatorId', 'username email');

    // IDフィールドを正規化
    const normalizedTemplate = {
      ...populatedTemplate!.toObject(),
      id: (populatedTemplate!._id as mongoose.Types.ObjectId).toString()
    };

    res.json({
      status: 'success',
      data: normalizedTemplate,
      message: `テンプレートが${isPublic ? '公開' : '非公開'}に設定されました`
    });
  } catch (error: any) {
    console.error('Template visibility update error:', error);
    res.status(500).json({
      status: 'error',
      message: 'テンプレートの可視性変更に失敗しました'
    });
  }
});

// POST /api/templates/:id/duplicate - テンプレート複製
router.post('/:id/duplicate', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        status: 'error',
        message: '無効なテンプレートIDです'
      });
      return;
    }

    const originalTemplate = await Template.findById(id);
    if (!originalTemplate) {
      res.status(404).json({
        status: 'error',
        message: 'テンプレートが見つかりません'
      });
      return;
    }

    // 非公開テンプレートの場合、作成者のみ複製可能
    if (!originalTemplate.isPublic && originalTemplate.creatorId.toString() !== userId) {
      res.status(403).json({
        status: 'error',
        message: 'このテンプレートを複製する権限がありません'
      });
      return;
    }

    // 複製時の名前変更ロジック - 既存の複製名との重複を避ける
    let duplicatedName = `${originalTemplate.name} (コピー)`;
    let counter = 1;
    
    // 同じ名前のテンプレートが既に存在するかチェック
    while (await Template.findOne({ name: duplicatedName, creatorId: userId })) {
      counter++;
      duplicatedName = `${originalTemplate.name} (コピー${counter})`;
    }

    const duplicatedTemplate = new Template({
      name: duplicatedName,
      description: originalTemplate.description,
      creatorId: userId,
      categories: originalTemplate.categories,
      allowGeneralComments: originalTemplate.allowGeneralComments,
      isPublic: originalTemplate.isPublic
    });

    // 永続化処理の実行
    await duplicatedTemplate.save();

    const populatedTemplate = await Template.findById(duplicatedTemplate._id)
      .populate('creatorId', 'username email');

    // IDフィールドを正規化
    const normalizedTemplate = {
      ...populatedTemplate!.toObject(),
      id: (populatedTemplate!._id as mongoose.Types.ObjectId).toString()
    };

    res.status(201).json({
      status: 'success',
      data: normalizedTemplate,
      message: 'テンプレートが正常に複製されました'
    });
  } catch (error: any) {
    console.error('Template duplication error:', error);
    
    // Mongooseバリデーションエラーの場合
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map((err: any) => err.message);
      res.status(400).json({
        status: 'error',
        message: '複製されたテンプレートのデータが無効です',
        errors: validationErrors
      });
      return;
    }
    
    // 重複エラーの場合
    if (error.code === 11000) {
      res.status(409).json({
        status: 'error',
        message: 'テンプレート名が重複しています。再試行してください。'
      });
      return;
    }
    
    // データベース接続エラーの場合
    if (error.name === 'MongoNetworkError' || error.name === 'MongoTimeoutError') {
      res.status(503).json({
        status: 'error',
        message: 'データベース接続エラーが発生しました。しばらく待ってから再試行してください。'
      });
      return;
    }
    
    res.status(500).json({
      status: 'error',
      message: 'テンプレートの複製に失敗しました'
    });
  }
});

export default router;