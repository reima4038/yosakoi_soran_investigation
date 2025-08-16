"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const Evaluation_1 = require("../models/Evaluation");
const Session_1 = require("../models/Session");
const middleware_1 = require("../middleware");
const mongoose_1 = __importDefault(require("mongoose"));
const router = (0, express_1.Router)();
// 評価の開始/取得
router.get('/session/:sessionId', middleware_1.authenticateToken, async (req, res) => {
    const startTime = Date.now();
    try {
        const { sessionId } = req.params;
        const userId = req.user.userId;
        console.log(`[評価取得] 開始: sessionId=${sessionId}, userId=${userId}, timestamp=${new Date().toISOString()}`);
        if (!mongoose_1.default.Types.ObjectId.isValid(sessionId)) {
            console.log(`[評価取得] 無効なセッションID: ${sessionId}`);
            return res.status(400).json({
                status: 'error',
                message: '無効なセッションIDです'
            });
        }
        // セッションの存在確認とアクセス権限チェック
        console.log(`[評価取得] セッション検索中: ${sessionId}`);
        const session = await Session_1.Session.findById(sessionId)
            .populate('videoId', 'title youtubeId thumbnailUrl')
            .populate('templateId');
        if (!session) {
            console.log(`[評価取得] セッションが見つかりません: ${sessionId}`);
            return res.status(404).json({
                status: 'error',
                message: 'セッションが見つかりません'
            });
        }
        console.log(`[評価取得] セッション取得成功: ${sessionId}, status=${session.status}, name=${session.name}`);
        // セッションがアクティブかチェック
        if (session.status !== Session_1.SessionStatus.ACTIVE) {
            console.log(`[評価取得] セッションが非アクティブ: ${sessionId}, status=${session.status}`);
            return res.status(400).json({
                status: 'error',
                message: 'このセッションは現在評価できません',
                data: {
                    sessionStatus: session.status,
                    sessionId: sessionId
                }
            });
        }
        // 評価者として参加しているかチェック
        const userObjectId = new mongoose_1.default.Types.ObjectId(userId);
        const isParticipant = session.evaluators.some(evaluatorId => evaluatorId.equals(userObjectId));
        console.log(`[評価取得] 権限チェック: userId=${userId}, isParticipant=${isParticipant}, evaluatorsCount=${session.evaluators.length}`);
        if (!isParticipant) {
            console.log(`[評価取得] 評価権限なし: userId=${userId}, sessionId=${sessionId}`);
            return res.status(403).json({
                status: 'error',
                message: 'このセッションの評価権限がありません',
                data: {
                    userId: userId,
                    sessionId: sessionId,
                    evaluatorsCount: session.evaluators.length
                }
            });
        }
        // 既存の評価を取得または新規作成
        console.log(`[評価取得] 評価データ検索中: sessionId=${sessionId}, userId=${userId}`);
        let evaluation = await Evaluation_1.Evaluation.findOne({
            sessionId: new mongoose_1.default.Types.ObjectId(sessionId),
            userId: userObjectId
        });
        if (!evaluation) {
            console.log(`[評価取得] 新規評価作成: sessionId=${sessionId}, userId=${userId}`);
            evaluation = new Evaluation_1.Evaluation({
                sessionId: new mongoose_1.default.Types.ObjectId(sessionId),
                userId: userObjectId,
                scores: [],
                comments: [],
                isComplete: false
            });
            await evaluation.save();
            console.log(`[評価取得] 新規評価作成完了: evaluationId=${evaluation._id}`);
        }
        else {
            console.log(`[評価取得] 既存評価取得: evaluationId=${evaluation._id}, scoresCount=${evaluation.scores.length}`);
        }
        const duration = Date.now() - startTime;
        console.log(`[評価取得] 成功: sessionId=${sessionId}, duration=${duration}ms`);
        return res.json({
            status: 'success',
            data: {
                evaluation,
                session: {
                    id: session._id,
                    name: session.name,
                    description: session.description,
                    video: session.videoId,
                    template: session.templateId,
                    endDate: session.endDate
                }
            }
        });
    }
    catch (error) {
        const duration = Date.now() - startTime;
        console.error(`[評価取得] エラー: sessionId=${req.params.sessionId}, duration=${duration}ms, error:`, error);
        return res.status(500).json({
            status: 'error',
            message: '評価の取得に失敗しました',
            data: {
                sessionId: req.params.sessionId,
                duration: duration,
                timestamp: new Date().toISOString()
            }
        });
    }
});
// 評価スコアの保存（リアルタイム保存）
router.put('/session/:sessionId/scores', middleware_1.authenticateToken, async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { scores } = req.body;
        const userId = req.user.userId;
        if (!mongoose_1.default.Types.ObjectId.isValid(sessionId)) {
            return res.status(400).json({
                status: 'error',
                message: '無効なセッションIDです'
            });
        }
        if (!Array.isArray(scores)) {
            return res.status(400).json({
                status: 'error',
                message: 'スコアデータが無効です'
            });
        }
        // セッションの確認
        const session = await Session_1.Session.findById(sessionId).populate('templateId');
        if (!session || session.status !== Session_1.SessionStatus.ACTIVE) {
            return res.status(400).json({
                status: 'error',
                message: 'セッションが無効または非アクティブです'
            });
        }
        // 評価を取得
        const evaluation = await Evaluation_1.Evaluation.findOne({
            sessionId: new mongoose_1.default.Types.ObjectId(sessionId),
            userId: new mongoose_1.default.Types.ObjectId(userId)
        });
        if (!evaluation) {
            return res.status(404).json({
                status: 'error',
                message: '評価が見つかりません'
            });
        }
        // 既に提出済みの場合は更新不可
        if (evaluation.isComplete && evaluation.submittedAt) {
            return res.status(400).json({
                status: 'error',
                message: '既に提出済みの評価は変更できません'
            });
        }
        // スコアの更新
        for (const scoreData of scores) {
            const existingScoreIndex = evaluation.scores.findIndex(score => score.criterionId === scoreData.criterionId);
            if (existingScoreIndex >= 0) {
                // 既存スコアの更新
                evaluation.scores[existingScoreIndex].score = scoreData.score;
                evaluation.scores[existingScoreIndex].comment = scoreData.comment || '';
            }
            else {
                // 新規スコアの追加
                evaluation.scores.push({
                    evaluationId: evaluation._id,
                    criterionId: scoreData.criterionId,
                    score: scoreData.score,
                    comment: scoreData.comment || ''
                });
            }
        }
        // 完了状態をチェック
        const template = session.templateId;
        if (template && template.categories) {
            evaluation.checkCompletion(template.categories);
        }
        await evaluation.save();
        return res.json({
            status: 'success',
            data: {
                evaluation,
                message: '評価が保存されました'
            }
        });
    }
    catch (error) {
        console.error('評価保存エラー:', error);
        return res.status(500).json({
            status: 'error',
            message: '評価の保存に失敗しました'
        });
    }
});
// コメントの追加
router.post('/session/:sessionId/comments', middleware_1.authenticateToken, async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { timestamp, text } = req.body;
        const userId = req.user.userId;
        if (!mongoose_1.default.Types.ObjectId.isValid(sessionId)) {
            return res.status(400).json({
                status: 'error',
                message: '無効なセッションIDです'
            });
        }
        if (typeof timestamp !== 'number' || !text || typeof text !== 'string') {
            return res.status(400).json({
                status: 'error',
                message: 'タイムスタンプとコメント内容は必須です'
            });
        }
        // 評価を取得
        const evaluation = await Evaluation_1.Evaluation.findOne({
            sessionId: new mongoose_1.default.Types.ObjectId(sessionId),
            userId: new mongoose_1.default.Types.ObjectId(userId)
        });
        if (!evaluation) {
            return res.status(404).json({
                status: 'error',
                message: '評価が見つかりません'
            });
        }
        // コメントを追加
        const newComment = {
            evaluationId: evaluation._id,
            userId: new mongoose_1.default.Types.ObjectId(userId),
            timestamp,
            text: text.trim(),
            createdAt: new Date()
        };
        evaluation.comments.push(newComment);
        await evaluation.save();
        return res.json({
            status: 'success',
            data: {
                comment: newComment,
                message: 'コメントが追加されました'
            }
        });
    }
    catch (error) {
        console.error('コメント追加エラー:', error);
        return res.status(500).json({
            status: 'error',
            message: 'コメントの追加に失敗しました'
        });
    }
});
// コメントの更新
router.put('/session/:sessionId/comments/:commentId', middleware_1.authenticateToken, async (req, res) => {
    try {
        const { sessionId, commentId } = req.params;
        const { text } = req.body;
        const userId = req.user.userId;
        if (!text || typeof text !== 'string') {
            return res.status(400).json({
                status: 'error',
                message: 'コメント内容は必須です'
            });
        }
        // 評価を取得
        const evaluation = await Evaluation_1.Evaluation.findOne({
            sessionId: new mongoose_1.default.Types.ObjectId(sessionId),
            userId: new mongoose_1.default.Types.ObjectId(userId)
        });
        if (!evaluation) {
            return res.status(404).json({
                status: 'error',
                message: '評価が見つかりません'
            });
        }
        // コメントを検索して更新
        const comment = evaluation.comments.find(c => c._id?.toString() === commentId);
        if (!comment) {
            return res.status(404).json({
                status: 'error',
                message: 'コメントが見つかりません'
            });
        }
        // 作成者のみ更新可能
        if (!comment.userId.equals(new mongoose_1.default.Types.ObjectId(userId))) {
            return res.status(403).json({
                status: 'error',
                message: 'コメントを更新する権限がありません'
            });
        }
        comment.text = text.trim();
        await evaluation.save();
        return res.json({
            status: 'success',
            data: {
                comment,
                message: 'コメントが更新されました'
            }
        });
    }
    catch (error) {
        console.error('コメント更新エラー:', error);
        return res.status(500).json({
            status: 'error',
            message: 'コメントの更新に失敗しました'
        });
    }
});
// コメントの削除
router.delete('/session/:sessionId/comments/:commentId', middleware_1.authenticateToken, async (req, res) => {
    try {
        const { sessionId, commentId } = req.params;
        const userId = req.user.userId;
        // 評価を取得
        const evaluation = await Evaluation_1.Evaluation.findOne({
            sessionId: new mongoose_1.default.Types.ObjectId(sessionId),
            userId: new mongoose_1.default.Types.ObjectId(userId)
        });
        if (!evaluation) {
            return res.status(404).json({
                status: 'error',
                message: '評価が見つかりません'
            });
        }
        // コメントを検索
        const comment = evaluation.comments.find(c => c._id?.toString() === commentId);
        if (!comment) {
            return res.status(404).json({
                status: 'error',
                message: 'コメントが見つかりません'
            });
        }
        // 作成者のみ削除可能
        if (!comment.userId.equals(new mongoose_1.default.Types.ObjectId(userId))) {
            return res.status(403).json({
                status: 'error',
                message: 'コメントを削除する権限がありません'
            });
        }
        // コメントを削除
        const commentIndex = evaluation.comments.findIndex(c => c._id?.toString() === commentId);
        if (commentIndex >= 0) {
            evaluation.comments.splice(commentIndex, 1);
        }
        await evaluation.save();
        return res.json({
            status: 'success',
            message: 'コメントが削除されました'
        });
    }
    catch (error) {
        console.error('コメント削除エラー:', error);
        return res.status(500).json({
            status: 'error',
            message: 'コメントの削除に失敗しました'
        });
    }
});
// 評価の提出
router.post('/session/:sessionId/submit', middleware_1.authenticateToken, async (req, res) => {
    try {
        const { sessionId } = req.params;
        const userId = req.user.userId;
        if (!mongoose_1.default.Types.ObjectId.isValid(sessionId)) {
            return res.status(400).json({
                status: 'error',
                message: '無効なセッションIDです'
            });
        }
        // セッションの確認
        const session = await Session_1.Session.findById(sessionId).populate('templateId');
        if (!session || session.status !== Session_1.SessionStatus.ACTIVE) {
            return res.status(400).json({
                status: 'error',
                message: 'セッションが無効または非アクティブです'
            });
        }
        // 評価を取得
        const evaluation = await Evaluation_1.Evaluation.findOne({
            sessionId: new mongoose_1.default.Types.ObjectId(sessionId),
            userId: new mongoose_1.default.Types.ObjectId(userId)
        });
        if (!evaluation) {
            return res.status(404).json({
                status: 'error',
                message: '評価が見つかりません'
            });
        }
        // 既に提出済みかチェック
        if (evaluation.submittedAt) {
            return res.status(400).json({
                status: 'error',
                message: '既に提出済みです',
                data: {
                    submittedAt: evaluation.submittedAt,
                    evaluation
                }
            });
        }
        // 詳細な完了状態をチェック
        const template = session.templateId;
        let completionDetails = null;
        if (template && template.categories) {
            const requiredCriteriaIds = template.categories.flatMap((category) => category.criteria.map((criterion) => criterion.id));
            const scoredCriteriaIds = evaluation.scores.map(score => score.criterionId);
            const missingCriteria = requiredCriteriaIds.filter((id) => !scoredCriteriaIds.includes(id));
            const isComplete = missingCriteria.length === 0;
            completionDetails = {
                totalCriteria: requiredCriteriaIds.length,
                completedCriteria: scoredCriteriaIds.length,
                missingCriteria,
                isComplete,
                completionPercentage: requiredCriteriaIds.length > 0
                    ? (scoredCriteriaIds.length / requiredCriteriaIds.length) * 100
                    : 0
            };
            if (!isComplete) {
                return res.status(400).json({
                    status: 'error',
                    message: 'すべての評価項目を入力してください',
                    data: {
                        completionDetails,
                        missingCriteria: missingCriteria.map((criterionId) => {
                            // Find criterion name for better error message
                            for (const category of template.categories) {
                                const criterion = category.criteria.find((c) => c.id === criterionId);
                                if (criterion) {
                                    return {
                                        id: criterionId,
                                        name: criterion.name,
                                        categoryName: category.name
                                    };
                                }
                            }
                            return { id: criterionId, name: 'Unknown', categoryName: 'Unknown' };
                        })
                    }
                });
            }
        }
        // 提出処理
        const submittedAt = new Date();
        evaluation.submittedAt = submittedAt;
        evaluation.isComplete = true;
        await evaluation.save();
        // 提出サマリーを生成
        const submissionSummary = {
            submittedAt,
            sessionId,
            userId,
            totalScores: evaluation.scores.length,
            totalComments: evaluation.comments.length,
            completionDetails,
            sessionName: session.name,
            videoTitle: session.videoId?.title || 'Unknown Video'
        };
        return res.json({
            status: 'success',
            data: {
                evaluation,
                submissionSummary,
                message: '評価が提出されました'
            }
        });
    }
    catch (error) {
        console.error('評価提出エラー:', error);
        return res.status(500).json({
            status: 'error',
            message: '評価の提出に失敗しました'
        });
    }
});
// 提出状況の確認
router.get('/session/:sessionId/submission-status', middleware_1.authenticateToken, async (req, res) => {
    try {
        const { sessionId } = req.params;
        const userId = req.user.userId;
        if (!mongoose_1.default.Types.ObjectId.isValid(sessionId)) {
            return res.status(400).json({
                status: 'error',
                message: '無効なセッションIDです'
            });
        }
        // セッションの確認
        const session = await Session_1.Session.findById(sessionId)
            .populate('videoId', 'title youtubeId')
            .populate('templateId');
        if (!session) {
            return res.status(404).json({
                status: 'error',
                message: 'セッションが見つかりません'
            });
        }
        // 評価を取得
        const evaluation = await Evaluation_1.Evaluation.findOne({
            sessionId: new mongoose_1.default.Types.ObjectId(sessionId),
            userId: new mongoose_1.default.Types.ObjectId(userId)
        });
        if (!evaluation) {
            return res.status(404).json({
                status: 'error',
                message: '評価が見つかりません'
            });
        }
        // 完了状況の詳細を計算
        const template = session.templateId;
        let completionDetails = null;
        if (template && template.categories) {
            const requiredCriteriaIds = template.categories.flatMap((category) => category.criteria.map((criterion) => criterion.id));
            const scoredCriteriaIds = evaluation.scores.map(score => score.criterionId);
            const missingCriteria = requiredCriteriaIds.filter((id) => !scoredCriteriaIds.includes(id));
            completionDetails = {
                totalCriteria: requiredCriteriaIds.length,
                completedCriteria: scoredCriteriaIds.length,
                missingCriteria,
                isComplete: missingCriteria.length === 0,
                completionPercentage: requiredCriteriaIds.length > 0
                    ? (scoredCriteriaIds.length / requiredCriteriaIds.length) * 100
                    : 0
            };
        }
        const submissionStatus = {
            isSubmitted: !!evaluation.submittedAt,
            submittedAt: evaluation.submittedAt,
            isComplete: evaluation.isComplete,
            totalScores: evaluation.scores.length,
            totalComments: evaluation.comments.length,
            lastSavedAt: evaluation.lastSavedAt,
            completionDetails,
            session: {
                id: session._id,
                name: session.name,
                status: session.status,
                endDate: session.endDate
            }
        };
        return res.json({
            status: 'success',
            data: submissionStatus
        });
    }
    catch (error) {
        console.error('提出状況確認エラー:', error);
        return res.status(500).json({
            status: 'error',
            message: '提出状況の確認に失敗しました'
        });
    }
});
exports.default = router;
//# sourceMappingURL=evaluations.js.map