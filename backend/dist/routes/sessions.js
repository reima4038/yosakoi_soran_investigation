"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const Session_1 = require("../models/Session");
const SessionParticipantRequest_1 = require("../models/SessionParticipantRequest");
const Video_1 = require("../models/Video");
const Template_1 = require("../models/Template");
const middleware_1 = require("../middleware");
const invitationService_1 = require("../services/invitationService");
const mongoose_1 = __importDefault(require("mongoose"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const emailService_1 = require("../services/emailService");
const User_1 = require("../models/User");
const router = (0, express_1.Router)();
// メール送信設定のテスト（開発環境のみ）
if (process.env.NODE_ENV === 'development') {
    router.get('/test-email', middleware_1.authenticateToken, async (_req, res) => {
        try {
            const isConnected = await emailService_1.emailService.testConnection();
            if (isConnected) {
                return res.json({
                    status: 'success',
                    message: 'メール送信設定は正常です'
                });
            }
            else {
                return res.status(500).json({
                    status: 'error',
                    message: 'メール送信設定に問題があります'
                });
            }
        }
        catch (error) {
            console.error('Email test error:', error);
            return res.status(500).json({
                status: 'error',
                message: 'メール送信テストに失敗しました'
            });
        }
    });
}
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
        // 招待リンクを自動生成
        const inviteLink = invitationService_1.InvitationService.generateInviteLink(session._id.toString());
        // IDフィールドを正規化
        const normalizedSession = {
            ...populatedSession.toObject(),
            id: populatedSession._id.toString(),
            inviteLink // 招待リンクをレスポンスに追加
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
        // セッション削除前に招待リンクを無効化
        try {
            await invitationService_1.InvitationService.invalidateSessionInvites(id);
        }
        catch (inviteError) {
            console.warn('招待リンク無効化に失敗しました:', inviteError);
            // 招待リンク無効化の失敗はセッション削除を阻害しない
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
// 招待リンク取得
router.get('/:id/invite-link', middleware_1.authenticateToken, async (req, res) => {
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
        // セッション作成者のみ招待リンクを取得可能
        if (!session.creatorId.equals(new mongoose_1.default.Types.ObjectId(req.user.userId))) {
            return res.status(403).json({
                status: 'error',
                message: '招待リンクを取得する権限がありません'
            });
        }
        // 招待設定が無効化されている場合はエラー
        if (session.inviteSettings && !session.inviteSettings.isEnabled) {
            return res.status(400).json({
                status: 'error',
                message: 'このセッションの招待リンクは無効化されています'
            });
        }
        // セッションが完了またはアーカイブされている場合はエラー
        if (session.status === Session_1.SessionStatus.COMPLETED || session.status === Session_1.SessionStatus.ARCHIVED) {
            return res.status(400).json({
                status: 'error',
                message: '完了またはアーカイブされたセッションの招待リンクは取得できません'
            });
        }
        // セッション設定に基づいた招待リンクを生成
        let inviteLink;
        let expiresInfo;
        try {
            if (session.inviteSettings) {
                inviteLink = invitationService_1.InvitationService.generateInviteLinkWithSettings(id, session.inviteSettings);
                // 有効期限情報を設定
                if (session.inviteSettings.expiresAt) {
                    const expiresAt = new Date(session.inviteSettings.expiresAt);
                    expiresInfo = expiresAt.toISOString();
                }
                else {
                    expiresInfo = '7d'; // デフォルト
                }
            }
            else {
                inviteLink = invitationService_1.InvitationService.generateInviteLinkForNewSession(id);
                expiresInfo = '7d';
            }
        }
        catch (error) {
            return res.status(400).json({
                status: 'error',
                message: error instanceof Error ? error.message : '招待リンクの生成に失敗しました'
            });
        }
        // 招待リンクの使用統計を取得
        const { InviteLinkUsage } = await Promise.resolve().then(() => __importStar(require('../models/InviteLinkUsage')));
        const usageStats = await InviteLinkUsage.aggregate([
            { $match: { sessionId: new mongoose_1.default.Types.ObjectId(id) } },
            {
                $group: {
                    _id: null,
                    totalUses: { $sum: 1 },
                    successfulUses: { $sum: { $cond: ['$success', 1, 0] } },
                    failedUses: { $sum: { $cond: ['$success', 0, 1] } },
                    lastUsed: { $max: '$usedAt' }
                }
            }
        ]);
        const stats = usageStats[0] || {
            totalUses: 0,
            successfulUses: 0,
            failedUses: 0,
            lastUsed: null
        };
        return res.json({
            status: 'success',
            data: {
                inviteLink,
                sessionId: id,
                sessionName: session.name,
                sessionStatus: session.status,
                expiresIn: expiresInfo,
                inviteSettings: session.inviteSettings || {
                    isEnabled: true,
                    currentUses: 0,
                    allowAnonymous: false,
                    requireApproval: false
                },
                usageStats: {
                    totalUses: stats.totalUses,
                    successfulUses: stats.successfulUses,
                    failedUses: stats.failedUses,
                    lastUsed: stats.lastUsed
                },
                generatedAt: new Date().toISOString()
            }
        });
    }
    catch (error) {
        console.error('招待リンク取得エラー:', error);
        return res.status(500).json({
            status: 'error',
            message: '招待リンクの取得に失敗しました',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// 招待リンク使用統計取得
router.get('/:id/invite-stats', middleware_1.authenticateToken, async (req, res) => {
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
        // セッション作成者のみ統計を取得可能
        if (!session.creatorId.equals(new mongoose_1.default.Types.ObjectId(req.user.userId))) {
            return res.status(403).json({
                status: 'error',
                message: '招待リンク統計を取得する権限がありません'
            });
        }
        const { InviteLinkUsage } = await Promise.resolve().then(() => __importStar(require('../models/InviteLinkUsage')));
        // 詳細な使用統計を取得
        const [usageStats, recentUsage, dailyStats] = await Promise.all([
            // 全体統計
            InviteLinkUsage.aggregate([
                { $match: { sessionId: new mongoose_1.default.Types.ObjectId(id) } },
                {
                    $group: {
                        _id: null,
                        totalUses: { $sum: 1 },
                        successfulUses: { $sum: { $cond: ['$success', 1, 0] } },
                        failedUses: { $sum: { $cond: ['$success', 0, 1] } },
                        uniqueUsers: { $addToSet: '$usedBy' },
                        firstUsed: { $min: '$usedAt' },
                        lastUsed: { $max: '$usedAt' }
                    }
                }
            ]),
            // 最近の使用履歴（最新10件）
            InviteLinkUsage.find({ sessionId: new mongoose_1.default.Types.ObjectId(id) })
                .populate('usedBy', 'username profile.displayName')
                .sort({ usedAt: -1 })
                .limit(10),
            // 日別統計（過去30日）
            InviteLinkUsage.aggregate([
                {
                    $match: {
                        sessionId: new mongoose_1.default.Types.ObjectId(id),
                        usedAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
                    }
                },
                {
                    $group: {
                        _id: {
                            $dateToString: { format: '%Y-%m-%d', date: '$usedAt' }
                        },
                        uses: { $sum: 1 },
                        successful: { $sum: { $cond: ['$success', 1, 0] } }
                    }
                },
                { $sort: { _id: 1 } }
            ])
        ]);
        const stats = usageStats[0] || {
            totalUses: 0,
            successfulUses: 0,
            failedUses: 0,
            uniqueUsers: [],
            firstUsed: null,
            lastUsed: null
        };
        return res.json({
            status: 'success',
            data: {
                sessionId: id,
                sessionName: session.name,
                overview: {
                    totalUses: stats.totalUses,
                    successfulUses: stats.successfulUses,
                    failedUses: stats.failedUses,
                    uniqueUsers: stats.uniqueUsers.filter(Boolean).length,
                    successRate: stats.totalUses > 0 ? (stats.successfulUses / stats.totalUses * 100).toFixed(1) : '0',
                    firstUsed: stats.firstUsed,
                    lastUsed: stats.lastUsed
                },
                recentUsage: recentUsage.map(usage => ({
                    id: usage._id,
                    usedAt: usage.usedAt,
                    success: usage.success,
                    user: usage.usedBy ? {
                        id: usage.usedBy._id,
                        name: usage.usedBy.profile?.displayName || usage.usedBy.username
                    } : null,
                    ipAddress: usage.ipAddress,
                    errorReason: usage.errorReason
                })),
                dailyStats: dailyStats.map(day => ({
                    date: day._id,
                    uses: day.uses,
                    successful: day.successful,
                    successRate: day.uses > 0 ? (day.successful / day.uses * 100).toFixed(1) : '0'
                }))
            }
        });
    }
    catch (error) {
        console.error('招待リンク統計取得エラー:', error);
        return res.status(500).json({
            status: 'error',
            message: '招待リンク統計の取得に失敗しました',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// 招待リンク再生成
router.post('/:id/regenerate-invite', middleware_1.authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { expiresIn, maxUses } = req.body;
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
        // セッション作成者のみ再生成可能
        if (!session.creatorId.equals(new mongoose_1.default.Types.ObjectId(req.user.userId))) {
            return res.status(403).json({
                status: 'error',
                message: '招待リンクを再生成する権限がありません'
            });
        }
        // セッションが完了またはアーカイブされている場合はエラー
        if (session.status === Session_1.SessionStatus.COMPLETED || session.status === Session_1.SessionStatus.ARCHIVED) {
            return res.status(400).json({
                status: 'error',
                message: '完了またはアーカイブされたセッションの招待リンクは再生成できません'
            });
        }
        // 新しい招待リンクを生成
        const options = {};
        if (expiresIn)
            options.expiresIn = expiresIn;
        if (maxUses)
            options.maxUses = maxUses;
        const newInviteLink = invitationService_1.InvitationService.generateInviteLink(id, options);
        // 招待設定を更新（使用回数をリセット）
        if (session.inviteSettings) {
            session.inviteSettings.currentUses = 0;
            session.inviteSettings.isEnabled = true;
            if (maxUses)
                session.inviteSettings.maxUses = maxUses;
        }
        else {
            session.inviteSettings = {
                isEnabled: true,
                currentUses: 0,
                maxUses: maxUses,
                allowAnonymous: false,
                requireApproval: false
            };
        }
        await session.save();
        return res.json({
            status: 'success',
            data: {
                inviteLink: newInviteLink,
                sessionId: id,
                sessionName: session.name,
                regeneratedAt: new Date().toISOString(),
                message: '招待リンクが再生成されました。古いリンクは無効になります。'
            }
        });
    }
    catch (error) {
        console.error('招待リンク再生成エラー:', error);
        return res.status(500).json({
            status: 'error',
            message: '招待リンクの再生成に失敗しました',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// 招待リンクでのセッション参加
router.post('/join/:token', async (req, res) => {
    try {
        const { token } = req.params;
        const { userInfo } = req.body;
        // リクエスト情報を取得
        const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
        const userAgent = req.get('User-Agent') || 'unknown';
        if (!token) {
            return res.status(400).json({
                status: 'error',
                message: '招待トークンが必要です'
            });
        }
        // 詳細なトークン検証（セッション状態も含む）
        const validation = await invitationService_1.InvitationService.validateInviteTokenWithSession(token);
        if (!validation.isValid) {
            // 失敗ログを記録
            if (validation.payload?.sessionId) {
                await invitationService_1.InvitationService.logInviteLinkUsage(validation.payload.sessionId, token, false, userInfo?.userId, ipAddress, userAgent, validation.errorReason);
            }
            return res.status(400).json({
                status: 'error',
                message: validation.errorReason || '招待リンクが無効です',
                code: 'INVALID_INVITE_TOKEN'
            });
        }
        const { session, payload } = validation;
        const sessionId = payload.sessionId;
        // 匿名参加の確認
        const isAnonymousJoin = !userInfo || !userInfo.userId;
        // 匿名参加が許可されているかチェック
        if (isAnonymousJoin && !session.inviteSettings?.allowAnonymous && !session.settings?.allowAnonymous) {
            await invitationService_1.InvitationService.logInviteLinkUsage(sessionId, token, false, undefined, ipAddress, userAgent, '匿名参加が許可されていません');
            return res.status(403).json({
                status: 'error',
                message: 'このセッションは匿名での参加が許可されていません。ログインしてから参加してください。',
                code: 'ANONYMOUS_NOT_ALLOWED'
            });
        }
        // 重複参加の確認
        let isAlreadyParticipant = false;
        if (userInfo && userInfo.userId) {
            const userId = new mongoose_1.default.Types.ObjectId(userInfo.userId);
            isAlreadyParticipant = session.evaluators.some((evaluatorId) => evaluatorId.equals(userId));
        }
        // 参加承認が必要かチェック
        const requiresApproval = session.inviteSettings?.requireApproval || false;
        // 新規参加者の場合の処理
        let participantStatus = 'joined';
        if (userInfo && userInfo.userId && !isAlreadyParticipant) {
            const userId = new mongoose_1.default.Types.ObjectId(userInfo.userId);
            if (requiresApproval) {
                // 参加承認が必要な場合、申請を作成
                const { SessionParticipantRequest } = await Promise.resolve().then(() => __importStar(require('../models/SessionParticipantRequest')));
                // 既存の申請があるかチェック
                const existingRequest = await SessionParticipantRequest.findOne({
                    sessionId: new mongoose_1.default.Types.ObjectId(sessionId),
                    userId: userId
                });
                if (existingRequest) {
                    if (existingRequest.status === 'pending') {
                        participantStatus = 'approval_pending';
                    }
                    else if (existingRequest.status === 'approved') {
                        // 承認済みの場合は参加者として追加
                        if (!session.evaluators.includes(userId)) {
                            session.evaluators.push(userId);
                            await session.save();
                        }
                        participantStatus = 'joined';
                    }
                    else {
                        participantStatus = 'rejected';
                    }
                }
                else {
                    // 新規申請を作成
                    const participantRequest = new SessionParticipantRequest({
                        sessionId: new mongoose_1.default.Types.ObjectId(sessionId),
                        userId: userId,
                        inviteToken: token.substring(0, 20) + '...', // セキュリティのため一部のみ保存
                        requestMessage: userInfo.requestMessage || ''
                    });
                    await participantRequest.save();
                    participantStatus = 'approval_pending';
                }
            }
            else {
                // 即座に参加者として追加
                session.evaluators.push(userId);
                await session.save();
                participantStatus = 'joined';
            }
            // 招待設定の使用回数を更新
            if (session.inviteSettings) {
                session.inviteSettings.currentUses = (session.inviteSettings.currentUses || 0) + 1;
                await session.save();
            }
        }
        // 成功ログを記録
        await invitationService_1.InvitationService.logInviteLinkUsage(sessionId, token, true, userInfo?.userId, ipAddress, userAgent);
        // セッション詳細情報を取得
        const populatedSession = await Session_1.Session.findById(sessionId)
            .populate('videoId', 'title youtubeId thumbnailUrl')
            .populate('templateId', 'name description')
            .populate('creatorId', 'username profile.displayName');
        return res.json({
            status: 'success',
            data: {
                session: {
                    id: session._id,
                    name: session.name,
                    description: session.description,
                    status: session.status,
                    video: populatedSession?.videoId,
                    template: populatedSession?.templateId,
                    creator: populatedSession?.creatorId,
                    startDate: session.startDate,
                    endDate: session.endDate
                },
                participant: {
                    isNewParticipant: !isAlreadyParticipant,
                    userId: userInfo?.userId,
                    status: participantStatus,
                    isAnonymous: isAnonymousJoin,
                    requiresApproval: requiresApproval
                },
                message: (() => {
                    if (isAlreadyParticipant)
                        return 'すでにこのセッションに参加しています';
                    if (isAnonymousJoin)
                        return 'セッションに匿名で参加しました';
                    if (participantStatus === 'approval_pending')
                        return 'セッション参加申請を送信しました。承認をお待ちください。';
                    if (participantStatus === 'rejected')
                        return 'セッション参加申請が拒否されています';
                    return 'セッションに参加しました';
                })()
            }
        });
    }
    catch (error) {
        console.error('セッション参加エラー:', error);
        // エラーログを記録
        try {
            if (req.params.token) {
                const validation = await invitationService_1.InvitationService.validateInviteTokenWithSession(req.params.token);
                if (validation?.payload?.sessionId) {
                    await invitationService_1.InvitationService.logInviteLinkUsage(validation.payload.sessionId, req.params.token, false, req.body.userInfo?.userId, req.ip || req.connection.remoteAddress || 'unknown', req.get('User-Agent') || 'unknown', error instanceof Error ? error.message : 'システムエラー');
                }
            }
        }
        catch (logError) {
            console.error('エラーログ記録に失敗:', logError);
        }
        return res.status(500).json({
            status: 'error',
            message: 'セッションへの参加に失敗しました',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// 招待トークンの事前検証
router.get('/validate-invite/:token', async (req, res) => {
    try {
        const { token } = req.params;
        if (!token) {
            return res.status(400).json({
                status: 'error',
                message: '招待トークンが必要です'
            });
        }
        // 詳細なトークン検証
        const validation = await invitationService_1.InvitationService.validateInviteTokenWithSession(token);
        if (!validation.isValid) {
            return res.status(400).json({
                status: 'error',
                message: validation.errorReason || '招待リンクが無効です',
                code: 'INVALID_INVITE_TOKEN',
                details: {
                    hasSession: !!validation.session,
                    sessionStatus: validation.session?.status
                }
            });
        }
        const { session } = validation;
        return res.json({
            status: 'success',
            data: {
                isValid: true,
                session: {
                    id: session._id,
                    name: session.name,
                    description: session.description,
                    status: session.status,
                    startDate: session.startDate,
                    endDate: session.endDate,
                    settings: {
                        allowAnonymous: session.settings?.allowAnonymous || false,
                        requireComments: session.settings?.requireComments || false
                    }
                },
                inviteInfo: {
                    expiresAt: session.inviteSettings?.expiresAt,
                    maxUses: session.inviteSettings?.maxUses,
                    currentUses: session.inviteSettings?.currentUses || 0,
                    allowAnonymous: session.inviteSettings?.allowAnonymous || false,
                    requireApproval: session.inviteSettings?.requireApproval || false
                }
            }
        });
    }
    catch (error) {
        console.error('招待トークン検証エラー:', error);
        return res.status(500).json({
            status: 'error',
            message: '招待トークンの検証に失敗しました',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// セッション参加申請一覧取得
router.get('/:id/participant-requests', middleware_1.authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.query;
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
        // セッション作成者のみ申請一覧を取得可能
        if (!session.creatorId.equals(new mongoose_1.default.Types.ObjectId(req.user.userId))) {
            return res.status(403).json({
                status: 'error',
                message: '参加申請一覧を取得する権限がありません'
            });
        }
        const { SessionParticipantRequest } = await Promise.resolve().then(() => __importStar(require('../models/SessionParticipantRequest')));
        // フィルター条件の構築
        const filter = { sessionId: new mongoose_1.default.Types.ObjectId(id) };
        if (status && ['pending', 'approved', 'rejected'].includes(status)) {
            filter.status = status;
        }
        const requests = await SessionParticipantRequest.find(filter)
            .populate('userId', 'username email profile.displayName')
            .populate('reviewedBy', 'username profile.displayName')
            .sort({ requestedAt: -1 });
        return res.json({
            status: 'success',
            data: {
                sessionId: id,
                sessionName: session.name,
                requests: requests.map(request => ({
                    id: request._id,
                    user: {
                        id: request.userId._id,
                        username: request.userId.username,
                        email: request.userId.email,
                        displayName: request.userId.profile?.displayName
                    },
                    requestedAt: request.requestedAt,
                    status: request.status,
                    requestMessage: request.requestMessage,
                    reviewedBy: request.reviewedBy ? {
                        id: request.reviewedBy._id,
                        displayName: request.reviewedBy.profile?.displayName || request.reviewedBy.username
                    } : null,
                    reviewedAt: request.reviewedAt,
                    reviewComment: request.reviewComment
                }))
            }
        });
    }
    catch (error) {
        console.error('参加申請一覧取得エラー:', error);
        return res.status(500).json({
            status: 'error',
            message: '参加申請一覧の取得に失敗しました',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// セッション参加申請の承認/拒否
router.patch('/:id/participant-requests/:requestId', middleware_1.authenticateToken, async (req, res) => {
    try {
        const { id, requestId } = req.params;
        const { action, comment } = req.body; // action: 'approve' | 'reject'
        if (!mongoose_1.default.Types.ObjectId.isValid(id) || !mongoose_1.default.Types.ObjectId.isValid(requestId)) {
            return res.status(400).json({
                status: 'error',
                message: '無効なIDです'
            });
        }
        if (!['approve', 'reject'].includes(action)) {
            return res.status(400).json({
                status: 'error',
                message: 'アクションは approve または reject である必要があります'
            });
        }
        const session = await Session_1.Session.findById(id);
        if (!session) {
            return res.status(404).json({
                status: 'error',
                message: 'セッションが見つかりません'
            });
        }
        // セッション作成者のみ申請を処理可能
        if (!session.creatorId.equals(new mongoose_1.default.Types.ObjectId(req.user.userId))) {
            return res.status(403).json({
                status: 'error',
                message: '参加申請を処理する権限がありません'
            });
        }
        const { SessionParticipantRequest } = await Promise.resolve().then(() => __importStar(require('../models/SessionParticipantRequest')));
        const request = await SessionParticipantRequest.findById(requestId)
            .populate('userId', 'username email profile.displayName');
        if (!request) {
            return res.status(404).json({
                status: 'error',
                message: '参加申請が見つかりません'
            });
        }
        if (request.status !== 'pending') {
            return res.status(400).json({
                status: 'error',
                message: 'この申請は既に処理済みです'
            });
        }
        // 申請を更新
        request.status = action === 'approve' ? SessionParticipantRequest_1.ParticipantRequestStatus.APPROVED : SessionParticipantRequest_1.ParticipantRequestStatus.REJECTED;
        request.reviewedBy = new mongoose_1.default.Types.ObjectId(req.user.userId);
        request.reviewedAt = new Date();
        request.reviewComment = comment || '';
        await request.save();
        // 承認の場合はセッションの参加者リストに追加
        if (action === 'approve') {
            const userId = request.userId;
            if (!session.evaluators.includes(userId)) {
                session.evaluators.push(userId);
                await session.save();
            }
        }
        return res.json({
            status: 'success',
            data: {
                requestId: request._id,
                action: action,
                user: {
                    id: request.userId._id,
                    username: request.userId.username,
                    displayName: request.userId.profile?.displayName
                },
                message: action === 'approve' ?
                    '参加申請を承認しました' :
                    '参加申請を拒否しました'
            }
        });
    }
    catch (error) {
        console.error('参加申請処理エラー:', error);
        return res.status(500).json({
            status: 'error',
            message: '参加申請の処理に失敗しました',
            details: error instanceof Error ? error.message : 'Unknown error'
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
        // 招待者の情報を取得
        const inviter = await User_1.User.findById(req.user.userId);
        const inviterName = inviter?.username || '管理者';
        // メール送信データの準備
        const emailData = {
            sessionName: session.name,
            sessionDescription: session.description,
            inviteLink,
            inviterName,
            customMessage: message,
            startDate: session.startDate ? new Date(session.startDate).toLocaleDateString('ja-JP', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            }) : '',
            endDate: session.endDate ? new Date(session.endDate).toLocaleDateString('ja-JP', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            }) : '',
        };
        // メール送信の実行
        const emailResults = await emailService_1.emailService.sendBulkInvitationEmails(emails, emailData);
        // 招待結果の準備
        const invitations = emails.map((email) => {
            const isSuccessful = emailResults.successful.includes(email);
            const failedResult = emailResults.failed.find(f => f.email === email);
            return {
                email,
                inviteLink,
                invitedAt: new Date(),
                status: isSuccessful ? 'sent' : 'failed',
                message: message || '',
                emailSent: isSuccessful,
                emailError: failedResult?.error
            };
        });
        // 結果の集計
        const successCount = emailResults.successful.length;
        const failedCount = emailResults.failed.length;
        let responseMessage = '';
        if (successCount > 0 && failedCount === 0) {
            responseMessage = `${successCount}名に招待メールを送信しました`;
        }
        else if (successCount > 0 && failedCount > 0) {
            responseMessage = `${successCount}名に招待メールを送信しました（${failedCount}名は送信に失敗）`;
        }
        else {
            responseMessage = '招待メールの送信に失敗しました';
        }
        return res.json({
            status: failedCount === 0 ? 'success' : 'partial_success',
            data: {
                invitations,
                message: responseMessage,
                summary: {
                    total: emails.length,
                    successful: successCount,
                    failed: failedCount,
                    failedEmails: emailResults.failed
                }
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
        // セッションが完了またはアーカイブされる場合、招待リンクを無効化
        if (status === Session_1.SessionStatus.COMPLETED || status === Session_1.SessionStatus.ARCHIVED) {
            try {
                await invitationService_1.InvitationService.invalidateSessionInvites(id);
                console.log(`セッション ${id} の招待リンクを無効化しました`);
            }
            catch (inviteError) {
                console.warn('招待リンク無効化に失敗しました:', inviteError);
                // 招待リンク無効化の失敗はステータス変更を阻害しない
            }
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