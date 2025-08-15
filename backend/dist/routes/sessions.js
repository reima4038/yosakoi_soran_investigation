"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const Session_1 = require("../models/Session");
const Video_1 = require("../models/Video");
const Template_1 = require("../models/Template");
const middleware_1 = require("../middleware");
const mongoose_1 = __importDefault(require("mongoose"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const router = (0, express_1.Router)();
// セッション作成
router.post('/', middleware_1.authenticateToken, async (req, res) => {
    try {
        const { name, description, videoId, templateId, startDate, endDate, settings } = req.body;
        // 必須フィールドの検証
        if (!name || !videoId || !templateId) {
            return res.status(400).json({
                status: 'error',
                message: 'セッション名、動画ID、テンプレートIDは必須です'
            });
        }
        // 動画とテンプレートの存在確認
        const [video, template] = await Promise.all([
            Video_1.Video.findById(videoId),
            Template_1.Template.findById(templateId)
        ]);
        if (!video) {
            return res.status(404).json({
                status: 'error',
                message: '指定された動画が見つかりません'
            });
        }
        if (!template) {
            return res.status(404).json({
                status: 'error',
                message: '指定されたテンプレートが見つかりません'
            });
        }
        // セッション作成
        const session = new Session_1.Session({
            name,
            description: description || '',
            videoId: new mongoose_1.default.Types.ObjectId(videoId),
            templateId: new mongoose_1.default.Types.ObjectId(templateId),
            creatorId: new mongoose_1.default.Types.ObjectId(req.user.userId),
            startDate: startDate ? new Date(startDate) : undefined,
            endDate: endDate ? new Date(endDate) : undefined,
            settings: {
                allowAnonymous: settings?.allowAnonymous || false,
                requireComments: settings?.requireComments || false,
                showRealTimeResults: settings?.showRealTimeResults || true,
                maxEvaluationsPerUser: settings?.maxEvaluationsPerUser || 1
            }
        });
        await session.save();
        // 作成されたセッションを関連データと共に取得
        const populatedSession = await Session_1.Session.findById(session._id)
            .populate('videoId', 'title youtubeId thumbnailUrl')
            .populate('templateId', 'name description')
            .populate('creatorId', 'username email profile.displayName');
        // IDフィールドを正規化
        const normalizedSession = {
            ...populatedSession.toObject(),
            id: populatedSession._id.toString()
        };
        return res.status(201).json({
            status: 'success',
            data: normalizedSession
        });
    }
    catch (error) {
        console.error('セッション作成エラー:', error);
        return res.status(500).json({
            status: 'error',
            message: 'セッションの作成に失敗しました',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// セッション一覧取得
router.get('/', middleware_1.authenticateToken, async (req, res) => {
    try {
        const { status, page = 1, limit = 10 } = req.query;
        const skip = (Number(page) - 1) * Number(limit);
        // フィルター条件の構築
        const filter = {
            $or: [
                { creatorId: new mongoose_1.default.Types.ObjectId(req.user.userId) },
                { evaluators: new mongoose_1.default.Types.ObjectId(req.user.userId) }
            ]
        };
        if (status && Object.values(Session_1.SessionStatus).includes(status)) {
            filter.status = status;
        }
        // セッション一覧取得
        const [sessions, total] = await Promise.all([
            Session_1.Session.find(filter)
                .populate('videoId', 'title youtubeId thumbnailUrl metadata')
                .populate('templateId', 'name description')
                .populate('creatorId', 'username profile.displayName')
                .populate('evaluators', 'username profile.displayName')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(Number(limit)),
            Session_1.Session.countDocuments(filter)
        ]);
        // IDフィールドを正規化
        const normalizedSessions = sessions.map(session => ({
            ...session.toObject(),
            id: session._id.toString()
        }));
        console.log('Session list response:', {
            sessionCount: normalizedSessions.length,
            sessionStatuses: normalizedSessions.map(s => ({ id: s.id, status: s.status }))
        });
        return res.json({
            status: 'success',
            data: {
                sessions: normalizedSessions,
                pagination: {
                    page: Number(page),
                    limit: Number(limit),
                    total,
                    pages: Math.ceil(total / Number(limit))
                }
            }
        });
    }
    catch (error) {
        console.error('セッション一覧取得エラー:', error);
        return res.status(500).json({
            status: 'error',
            message: 'セッション一覧の取得に失敗しました'
        });
    }
});
// セッション詳細取得
router.get('/:id', middleware_1.authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        console.log('Session detail request:', { id, query: req.query });
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            console.log('Invalid session ID:', id);
            return res.status(400).json({
                status: 'error',
                message: '無効なセッションIDです'
            });
        }
        const session = await Session_1.Session.findById(id)
            .populate('videoId', 'title youtubeId thumbnailUrl metadata')
            .populate('templateId', 'name description categories')
            .populate('creatorId', 'username email profile')
            .populate('evaluators', 'username email profile');
        if (!session) {
            return res.status(404).json({
                status: 'error',
                message: 'セッションが見つかりません'
            });
        }
        // アクセス権限の確認
        const userId = new mongoose_1.default.Types.ObjectId(req.user.userId);
        const hasAccess = session.creatorId._id.equals(userId) ||
            session.evaluators.some(evaluator => evaluator._id.equals(userId));
        if (!hasAccess) {
            return res.status(403).json({
                status: 'error',
                message: 'このセッションにアクセスする権限がありません'
            });
        }
        // IDフィールドを正規化（populateされたオブジェクトも含む）
        const sessionObj = session.toObject();
        const normalizedSession = {
            ...sessionObj,
            id: session._id.toString(),
            // populateされた動画オブジェクトのIDも正規化
            videoId: sessionObj.videoId && typeof sessionObj.videoId === 'object'
                ? {
                    ...sessionObj.videoId,
                    id: sessionObj.videoId._id?.toString() || sessionObj.videoId.id
                }
                : sessionObj.videoId,
            // populateされたテンプレートオブジェクトのIDも正規化
            templateId: sessionObj.templateId && typeof sessionObj.templateId === 'object'
                ? {
                    ...sessionObj.templateId,
                    id: sessionObj.templateId._id?.toString() || sessionObj.templateId.id
                }
                : sessionObj.templateId
        };
        console.log('Session detail response:', {
            sessionId: id,
            settings: normalizedSession.settings,
            hasSettings: !!normalizedSession.settings,
            videoId: normalizedSession.videoId,
            templateId: normalizedSession.templateId
        });
        return res.json({
            status: 'success',
            data: normalizedSession
        });
    }
    catch (error) {
        console.error('セッション詳細取得エラー:', error);
        return res.status(500).json({
            status: 'error',
            message: 'セッション詳細の取得に失敗しました'
        });
    }
});
// セッション更新
router.put('/:id', middleware_1.authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                status: 'error',
                message: '無効なセッションIDです'
            });
        }
        const session = await Session_1.Session.findById(id);
        if (!session) {
            return res.status(404).json({
                status: 'error',
                message: 'セッションが見つかりません'
            });
        }
        // 作成者のみ更新可能
        if (!session.creatorId.equals(new mongoose_1.default.Types.ObjectId(req.user.userId))) {
            return res.status(403).json({
                status: 'error',
                message: 'セッションを更新する権限がありません'
            });
        }
        // アクティブまたは完了したセッションの制限
        if (session.status === Session_1.SessionStatus.ACTIVE || session.status === Session_1.SessionStatus.COMPLETED) {
            const allowedFields = ['description', 'endDate'];
            const updateFields = Object.keys(updates);
            const hasRestrictedFields = updateFields.some(field => !allowedFields.includes(field));
            if (hasRestrictedFields) {
                return res.status(400).json({
                    status: 'error',
                    message: 'アクティブまたは完了したセッションでは一部の項目のみ更新可能です'
                });
            }
        }
        // 更新実行
        Object.assign(session, updates);
        await session.save();
        const updatedSession = await Session_1.Session.findById(id)
            .populate('videoId', 'title youtubeId thumbnailUrl')
            .populate('templateId', 'name description')
            .populate('creatorId', 'username profile.displayName')
            .populate('evaluators', 'username profile.displayName');
        // IDフィールドを正規化
        const normalizedSession = {
            ...updatedSession.toObject(),
            id: updatedSession._id.toString()
        };
        return res.json({
            status: 'success',
            data: normalizedSession
        });
    }
    catch (error) {
        console.error('セッション更新エラー:', error);
        return res.status(500).json({
            status: 'error',
            message: 'セッションの更新に失敗しました',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// セッション削除
router.delete('/:id', middleware_1.authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                status: 'error',
                message: '無効なセッションIDです'
            });
        }
        const session = await Session_1.Session.findById(id);
        if (!session) {
            return res.status(404).json({
                status: 'error',
                message: 'セッションが見つかりません'
            });
        }
        // 作成者のみ削除可能
        if (!session.creatorId.equals(new mongoose_1.default.Types.ObjectId(req.user.userId))) {
            return res.status(403).json({
                status: 'error',
                message: 'セッションを削除する権限がありません'
            });
        }
        // アクティブなセッションは削除不可
        if (session.status === Session_1.SessionStatus.ACTIVE) {
            return res.status(400).json({
                status: 'error',
                message: 'アクティブなセッションは削除できません'
            });
        }
        await Session_1.Session.findByIdAndDelete(id);
        return res.json({
            status: 'success',
            message: 'セッションが削除されました'
        });
    }
    catch (error) {
        console.error('セッション削除エラー:', error);
        return res.status(500).json({
            status: 'error',
            message: 'セッションの削除に失敗しました'
        });
    }
});
// 評価者招待
router.post('/:id/invite', middleware_1.authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { emails, message } = req.body;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                status: 'error',
                message: '無効なセッションIDです'
            });
        }
        if (!emails || !Array.isArray(emails) || emails.length === 0) {
            return res.status(400).json({
                status: 'error',
                message: '招待するメールアドレスを指定してください'
            });
        }
        const session = await Session_1.Session.findById(id);
        if (!session) {
            return res.status(404).json({
                status: 'error',
                message: 'セッションが見つかりません'
            });
        }
        // 作成者のみ招待可能
        if (!session.creatorId.equals(new mongoose_1.default.Types.ObjectId(req.user.userId))) {
            return res.status(403).json({
                status: 'error',
                message: '評価者を招待する権限がありません'
            });
        }
        // 招待リンクの生成
        const inviteToken = jsonwebtoken_1.default.sign({ sessionId: id, type: 'session-invite' }, process.env.JWT_SECRET || 'your-secret-key-for-development-only', { expiresIn: '7d' });
        const inviteLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/sessions/${id}/join?token=${inviteToken}`;
        // TODO: メール送信機能の実装
        // 現在は招待リンクのみ返す
        const invitations = emails.map((email) => ({
            email,
            inviteLink,
            invitedAt: new Date(),
            status: 'pending',
            message: message || '' // メッセージを保存（将来のメール送信で使用）
        }));
        return res.json({
            status: 'success',
            data: {
                invitations,
                message: '招待リンクが生成されました'
            }
        });
    }
    catch (error) {
        console.error('評価者招待エラー:', error);
        return res.status(500).json({
            status: 'error',
            message: '評価者の招待に失敗しました'
        });
    }
});
// 招待リンクでの参加
router.post('/:id/join', async (req, res) => {
    try {
        const { id } = req.params;
        const { token, userInfo } = req.body;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                status: 'error',
                message: '無効なセッションIDです'
            });
        }
        if (!token) {
            return res.status(400).json({
                status: 'error',
                message: '招待トークンが必要です'
            });
        }
        // トークンの検証
        let decoded;
        try {
            decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'your-secret-key-for-development-only');
            if (decoded.type !== 'session-invite' || decoded.sessionId !== id) {
                throw new Error('無効な招待トークンです');
            }
        }
        catch (error) {
            return res.status(400).json({
                status: 'error',
                message: '無効または期限切れの招待トークンです'
            });
        }
        const session = await Session_1.Session.findById(id);
        if (!session) {
            return res.status(404).json({
                status: 'error',
                message: 'セッションが見つかりません'
            });
        }
        // セッションがアクティブでない場合はエラー
        if (session.status !== Session_1.SessionStatus.ACTIVE) {
            return res.status(400).json({
                status: 'error',
                message: 'このセッションは現在参加できません'
            });
        }
        // ユーザー情報がある場合は評価者として追加
        if (userInfo && userInfo.userId) {
            const userId = new mongoose_1.default.Types.ObjectId(userInfo.userId);
            if (!session.evaluators.includes(userId)) {
                session.evaluators.push(userId);
                await session.save();
            }
        }
        return res.json({
            status: 'success',
            data: {
                session: {
                    id: session._id,
                    name: session.name,
                    description: session.description,
                    status: session.status
                },
                message: 'セッションに参加しました'
            }
        });
    }
    catch (error) {
        console.error('セッション参加エラー:', error);
        return res.status(500).json({
            status: 'error',
            message: 'セッションへの参加に失敗しました'
        });
    }
});
// セッションステータス更新
router.patch('/:id/status', middleware_1.authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        console.log('Session status update request:', {
            sessionId: id,
            newStatus: status,
            userId: req.user?.userId
        });
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                status: 'error',
                message: '無効なセッションIDです'
            });
        }
        if (!Object.values(Session_1.SessionStatus).includes(status)) {
            return res.status(400).json({
                status: 'error',
                message: '無効なステータスです'
            });
        }
        const session = await Session_1.Session.findById(id);
        if (!session) {
            return res.status(404).json({
                status: 'error',
                message: 'セッションが見つかりません'
            });
        }
        // 作成者のみステータス変更可能
        if (!session.creatorId.equals(new mongoose_1.default.Types.ObjectId(req.user.userId))) {
            return res.status(403).json({
                status: 'error',
                message: 'セッションステータスを変更する権限がありません'
            });
        }
        // ステータス変更のバリデーション
        const validTransitions = {
            [Session_1.SessionStatus.DRAFT]: [Session_1.SessionStatus.ACTIVE, Session_1.SessionStatus.ARCHIVED],
            [Session_1.SessionStatus.ACTIVE]: [Session_1.SessionStatus.COMPLETED, Session_1.SessionStatus.ARCHIVED],
            [Session_1.SessionStatus.COMPLETED]: [Session_1.SessionStatus.ARCHIVED],
            [Session_1.SessionStatus.ARCHIVED]: [] // アーカイブからは変更不可
        };
        if (!validTransitions[session.status].includes(status)) {
            return res.status(400).json({
                status: 'error',
                message: `${session.status}から${status}への変更はできません`
            });
        }
        // アクティブにする場合の追加チェック
        if (status === Session_1.SessionStatus.ACTIVE) {
            const now = new Date();
            // 開始日時が設定されていない、または過去の場合は現在時刻に設定
            if (!session.startDate || session.startDate < now) {
                session.startDate = new Date(now.getTime() + 1000); // 1秒後に設定
                console.log(`セッション ${id} の開始日時を現在時刻に更新しました:`, session.startDate);
            }
            // 評価者のチェックは一旦コメントアウト（必要に応じて後で有効化）
            // if (session.evaluators.length === 0) {
            //   return res.status(400).json({
            //     status: 'error',
            //     message: 'アクティブにするには少なくとも1人の評価者が必要です'
            //   });
            // }
        }
        // 完了にする場合の処理
        if (status === Session_1.SessionStatus.COMPLETED && !session.endDate) {
            session.endDate = new Date();
        }
        session.status = status;
        try {
            await session.save();
        }
        catch (saveError) {
            console.error('セッション保存エラー:', saveError);
            // バリデーションエラーの場合
            if (saveError.name === 'ValidationError') {
                const validationErrors = Object.values(saveError.errors).map((err) => err.message);
                return res.status(400).json({
                    status: 'error',
                    message: 'セッションの保存に失敗しました',
                    details: validationErrors.join(', ')
                });
            }
            throw saveError; // その他のエラーは上位に投げる
        }
        const updatedSession = await Session_1.Session.findById(id)
            .populate('videoId', 'title youtubeId thumbnailUrl')
            .populate('templateId', 'name description')
            .populate('creatorId', 'username profile.displayName')
            .populate('evaluators', 'username profile.displayName');
        // IDフィールドを正規化
        const normalizedSession = {
            ...updatedSession.toObject(),
            id: updatedSession._id.toString()
        };
        return res.json({
            status: 'success',
            data: normalizedSession
        });
    }
    catch (error) {
        console.error('セッションステータス更新エラー:', error);
        console.error('Error details:', {
            name: error?.name,
            message: error?.message,
            stack: error?.stack
        });
        return res.status(500).json({
            status: 'error',
            message: 'セッションステータスの更新に失敗しました',
            details: error?.message || 'Unknown error'
        });
    }
});
// セッション進捗状況取得
router.get('/:id/progress', middleware_1.authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                status: 'error',
                message: '無効なセッションIDです'
            });
        }
        const session = await Session_1.Session.findById(id)
            .populate('evaluators', 'username profile.displayName');
        if (!session) {
            return res.status(404).json({
                status: 'error',
                message: 'セッションが見つかりません'
            });
        }
        // アクセス権限の確認
        const userId = new mongoose_1.default.Types.ObjectId(req.user.userId);
        const hasAccess = session.creatorId.equals(userId) ||
            session.evaluators.some(evaluator => evaluator._id.equals(userId));
        if (!hasAccess) {
            return res.status(403).json({
                status: 'error',
                message: 'このセッションの進捗を確認する権限がありません'
            });
        }
        // TODO: 実際の評価データから進捗を計算
        // 現在は仮の進捗データを返す
        const totalEvaluators = session.evaluators.length;
        const completedEvaluations = Math.floor(totalEvaluators * 0.6); // 仮の完了数
        const progress = {
            totalEvaluators,
            completedEvaluations,
            pendingEvaluations: totalEvaluators - completedEvaluations,
            completionRate: totalEvaluators > 0 ? (completedEvaluations / totalEvaluators) * 100 : 0,
            evaluators: session.evaluators.map((evaluator) => ({
                id: evaluator._id,
                name: evaluator.profile?.displayName || evaluator.username,
                status: Math.random() > 0.4 ? 'completed' : 'pending', // 仮のステータス
                submittedAt: Math.random() > 0.4 ? new Date() : null
            })),
            timeRemaining: session.endDate ? Math.max(0, session.endDate.getTime() - Date.now()) : null,
            isOverdue: session.endDate ? session.endDate < new Date() : false
        };
        return res.json({
            status: 'success',
            data: progress
        });
    }
    catch (error) {
        console.error('セッション進捗取得エラー:', error);
        return res.status(500).json({
            status: 'error',
            message: 'セッション進捗の取得に失敗しました'
        });
    }
});
// 期限切れセッションの通知
router.get('/notifications/overdue', middleware_1.authenticateToken, async (req, res) => {
    try {
        const userId = new mongoose_1.default.Types.ObjectId(req.user.userId);
        const now = new Date();
        // 期限切れのアクティブセッション（作成者のもの）
        const overdueSessions = await Session_1.Session.find({
            creatorId: userId,
            status: Session_1.SessionStatus.ACTIVE,
            endDate: { $lt: now }
        })
            .populate('videoId', 'title')
            .populate('templateId', 'name')
            .sort({ endDate: -1 });
        // 期限が近いセッション（24時間以内）
        const upcomingDeadline = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        const upcomingSessions = await Session_1.Session.find({
            creatorId: userId,
            status: Session_1.SessionStatus.ACTIVE,
            endDate: { $gte: now, $lte: upcomingDeadline }
        })
            .populate('videoId', 'title')
            .populate('templateId', 'name')
            .sort({ endDate: 1 });
        return res.json({
            status: 'success',
            data: {
                overdue: overdueSessions.map(session => ({
                    id: session._id,
                    name: session.name,
                    videoTitle: session.videoId?.title,
                    endDate: session.endDate,
                    overdueDays: Math.floor((now.getTime() - session.endDate.getTime()) / (24 * 60 * 60 * 1000))
                })),
                upcoming: upcomingSessions.map(session => ({
                    id: session._id,
                    name: session.name,
                    videoTitle: session.videoId?.title,
                    endDate: session.endDate,
                    hoursRemaining: Math.floor((session.endDate.getTime() - now.getTime()) / (60 * 60 * 1000))
                }))
            }
        });
    }
    catch (error) {
        console.error('通知取得エラー:', error);
        return res.status(500).json({
            status: 'error',
            message: '通知の取得に失敗しました'
        });
    }
});
exports.default = router;
//# sourceMappingURL=sessions.js.map