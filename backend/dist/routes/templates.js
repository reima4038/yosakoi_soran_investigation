"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const Template_1 = require("../models/Template");
const middleware_1 = require("../middleware");
const mongoose_1 = __importDefault(require("mongoose"));
const router = (0, express_1.Router)();
// GET /api/templates - テンプレート一覧取得
router.get('/', middleware_1.authenticateToken, async (_req, res) => {
    try {
        const templates = await Template_1.Template.find()
            .populate('creatorId', 'username email')
            .sort({ createdAt: -1 });
        res.json({
            status: 'success',
            data: templates
        });
    }
    catch (error) {
        console.error('Template list error:', error);
        res.status(500).json({
            status: 'error',
            message: 'テンプレート一覧の取得に失敗しました'
        });
    }
});
// GET /api/templates/:id - テンプレート詳細取得
router.get('/:id', middleware_1.authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            res.status(400).json({
                status: 'error',
                message: '無効なテンプレートIDです'
            });
            return;
        }
        const template = await Template_1.Template.findById(id)
            .populate('creatorId', 'username email');
        if (!template) {
            res.status(404).json({
                status: 'error',
                message: 'テンプレートが見つかりません'
            });
            return;
        }
        res.json({
            status: 'success',
            data: template
        });
    }
    catch (error) {
        console.error('Template detail error:', error);
        res.status(500).json({
            status: 'error',
            message: 'テンプレート詳細の取得に失敗しました'
        });
    }
});
// POST /api/templates - テンプレート作成
router.post('/', middleware_1.authenticateToken, async (req, res) => {
    try {
        const { name, description, categories } = req.body;
        const userId = req.user?.userId;
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
        const categoryWeightSum = categories.reduce((sum, category) => sum + category.weight, 0);
        if (Math.abs(categoryWeightSum - 1) > 0.001) {
            res.status(400).json({
                status: 'error',
                message: 'カテゴリの重みの合計は1である必要があります'
            });
            return;
        }
        // 各カテゴリ内の評価基準の重みの合計をチェック
        for (const category of categories) {
            if (!category.criteria || category.criteria.length === 0) {
                res.status(400).json({
                    status: 'error',
                    message: `カテゴリ「${category.name}」には少なくとも1つの評価基準が必要です`
                });
                return;
            }
            const criteriaWeightSum = category.criteria.reduce((sum, criterion) => sum + criterion.weight, 0);
            if (Math.abs(criteriaWeightSum - 1) > 0.001) {
                res.status(400).json({
                    status: 'error',
                    message: `カテゴリ「${category.name}」の評価基準の重みの合計は1である必要があります`
                });
                return;
            }
        }
        const template = new Template_1.Template({
            name,
            description,
            creatorId: userId,
            categories
        });
        await template.save();
        const populatedTemplate = await Template_1.Template.findById(template._id)
            .populate('creatorId', 'username email');
        res.status(201).json({
            status: 'success',
            data: populatedTemplate,
            message: 'テンプレートが正常に作成されました'
        });
    }
    catch (error) {
        console.error('Template creation error:', error);
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
router.put('/:id', middleware_1.authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, categories } = req.body;
        const userId = req.user?.userId;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            res.status(400).json({
                status: 'error',
                message: '無効なテンプレートIDです'
            });
            return;
        }
        const template = await Template_1.Template.findById(id);
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
        await template.save();
        const populatedTemplate = await Template_1.Template.findById(template._id)
            .populate('creatorId', 'username email');
        res.json({
            status: 'success',
            data: populatedTemplate,
            message: 'テンプレートが正常に更新されました'
        });
    }
    catch (error) {
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
router.delete('/:id', middleware_1.authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.userId;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            res.status(400).json({
                status: 'error',
                message: '無効なテンプレートIDです'
            });
            return;
        }
        const template = await Template_1.Template.findById(id);
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
        await Template_1.Template.findByIdAndDelete(id);
        res.json({
            status: 'success',
            message: 'テンプレートが正常に削除されました'
        });
    }
    catch (error) {
        console.error('Template deletion error:', error);
        res.status(500).json({
            status: 'error',
            message: 'テンプレートの削除に失敗しました'
        });
    }
});
// POST /api/templates/:id/duplicate - テンプレート複製
router.post('/:id/duplicate', middleware_1.authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.userId;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            res.status(400).json({
                status: 'error',
                message: '無効なテンプレートIDです'
            });
            return;
        }
        const originalTemplate = await Template_1.Template.findById(id);
        if (!originalTemplate) {
            res.status(404).json({
                status: 'error',
                message: 'テンプレートが見つかりません'
            });
            return;
        }
        const duplicatedTemplate = new Template_1.Template({
            name: `${originalTemplate.name} (コピー)`,
            description: originalTemplate.description,
            creatorId: userId,
            categories: originalTemplate.categories
        });
        await duplicatedTemplate.save();
        const populatedTemplate = await Template_1.Template.findById(duplicatedTemplate._id)
            .populate('creatorId', 'username email');
        res.status(201).json({
            status: 'success',
            data: populatedTemplate,
            message: 'テンプレートが正常に複製されました'
        });
    }
    catch (error) {
        console.error('Template duplication error:', error);
        res.status(500).json({
            status: 'error',
            message: 'テンプレートの複製に失敗しました'
        });
    }
});
exports.default = router;
//# sourceMappingURL=templates.js.map