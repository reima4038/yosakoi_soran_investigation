"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const Share_1 = require("../models/Share");
const Session_1 = require("../models/Session");
const Evaluation_1 = require("../models/Evaluation");
const middleware_1 = require("../middleware");
const mongoose_1 = __importDefault(require("mongoose"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const router = (0, express_1.Router)();
// 共有設定作成
router.post('/', middleware_1.authenticateToken, async (req, res) => {
    try {
        const { resourceType, resourceId, visibility, password, allowedUsers, permissions, expiresAt, settings } = req.body;
        // 必須フィールドの検証
        if (!resourceType || !resourceId) {
            return res.status(400).json({
                status: 'error',
                message: 'リソースタイプとリソースIDは必須です'
            });
        }
        if (!Object.values(Share_1.ShareType).includes(resourceType)) {
            return res.status(400).json({
                status: 'error',
                message: '無効なリソースタイプです'
            });
        }
        if (!mongoose_1.default.Types.ObjectId.isValid(resourceId)) {
            return res.status(400).json({
                status: 'error',
                message: '無効なリソースIDです'
            });
        }
        // リソースの存在確認と権限チェック
        let resource;
        const userId = new mongoose_1.default.Types.ObjectId(req.user.userId);
        switch (resourceType) {
            case Share_1.ShareType.SESSION_RESULTS:
                resource = await Session_1.Session.findById(resourceId);
                if (!resource) {
                    return res.status(404).json({
                        status: 'error',
                        message: 'セッションが見つかりません'
                    });
                }
                // セッション作成者のみ共有可能
                if (!resource.creatorId.equals(userId)) {
                    return res.status(403).json({
                        status: 'error',
                        message: 'このセッションを共有する権限がありません'
                    });
                }
                break;
            case Share_1.ShareType.EVALUATION:
                resource = await Evaluation_1.Evaluation.findById(resourceId);
                if (!resource) {
                    return res.status(404).json({
                        status: 'error',
                        message: '評価が見つかりません'
                    });
                }
                // 評価者本人のみ共有可能
                if (!resource.userId.equals(userId)) {
                    return res.status(403).json({
                        status: 'error',
                        message: 'この評価を共有する権限がありません'
                    });
                }
                break;
            default:
                return res.status(400).json({
                    status: 'error',
                    message: 'サポートされていないリソースタイプです'
                });
        }
        // 既存の共有設定をチェック
        const existingShare = await Share_1.Share.findOne({
            resourceType,
            resourceId: new mongoose_1.default.Types.ObjectId(resourceId),
            creatorId: userId,
            isActive: true
        });
        if (existingShare) {
            return res.status(409).json({
                status: 'error',
                message: 'このリソースは既に共有されています',
                data: { shareId: existingShare._id }
            });
        }
        // パスワードのハッシュ化
        let hashedPassword;
        if (visibility === Share_1.ShareVisibility.PASSWORD_PROTECTED && password) {
            hashedPassword = await bcrypt_1.default.hash(password, 10);
        }
        // 共有トークン生成
        const shareToken = Share_1.Share.generateShareToken();
        // 共有設定作成
        const share = new Share_1.Share({
            resourceType,
            resourceId: new mongoose_1.default.Types.ObjectId(resourceId),
            creatorId: userId,
            shareToken,
            visibility: visibility || Share_1.ShareVisibility.PRIVATE,
            password: hashedPassword,
            allowedUsers: allowedUsers ? allowedUsers.map((id) => new mongoose_1.default.Types.ObjectId(id)) : [],
            permissions: permissions || [Share_1.SharePermission.VIEW],
            expiresAt: expiresAt ? new Date(expiresAt) : undefined,
            settings: {
                allowComments: settings?.allowComments ?? true,
                allowDownload: settings?.allowDownload ?? false,
                showEvaluatorNames: settings?.showEvaluatorNames ?? false,
                showIndividualScores: settings?.showIndividualScores ?? true
            }
        });
        await share.save();
        // 作成された共有設定を取得（パスワードは除外）
        const createdShare = await Share_1.Share.findById(share._id)
            .populate('allowedUsers', 'username profile.displayName')
            .select('-password');
        const shareUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/share/${shareToken}`;
        return res.status(201).json({
            status: 'success',
            data: {
                share: createdShare,
                shareUrl
            }
        });
    }
    catch (error) {
        console.error('共有設定作成エラー:', error);
        return res.status(500).json({
            status: 'error',
            message: '共有設定の作成に失敗しました',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// 共有設定一覧取得
router.get('/', middleware_1.authenticateToken, async (req, res) => {
    try {
        const { resourceType, page = 1, limit = 10 } = req.query;
        const skip = (Number(page) - 1) * Number(limit);
        const userId = new mongoose_1.default.Types.ObjectId(req.user.userId);
        // フィルター条件の構築
        const filter = { creatorId: userId };
        if (resourceType && Object.values(Share_1.ShareType).includes(resourceType)) {
            filter.resourceType = resourceType;
        }
        // 共有設定一覧取得
        const [shares, total] = await Promise.all([
            Share_1.Share.find(filter)
                .populate('allowedUsers', 'username profile.displayName')
                .populate('resourceId')
                .select('-password')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(Number(limit)),
            Share_1.Share.countDocuments(filter)
        ]);
        // 共有URLを追加
        const sharesWithUrls = shares.map(share => ({
            ...share.toObject(),
            shareUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/share/${share.shareToken}`
        }));
        return res.json({
            status: 'success',
            data: {
                shares: sharesWithUrls,
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
        console.error('共有設定一覧取得エラー:', error);
        return res.status(500).json({
            status: 'error',
            message: '共有設定一覧の取得に失敗しました'
        });
    }
});
// 共有設定詳細取得
router.get('/:id', middleware_1.authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                status: 'error',
                message: '無効な共有設定IDです'
            });
        }
        const share = await Share_1.Share.findById(id)
            .populate('allowedUsers', 'username profile.displayName')
            .populate('resourceId')
            .select('-password');
        if (!share) {
            return res.status(404).json({
                status: 'error',
                message: '共有設定が見つかりません'
            });
        }
        // 作成者のみアクセス可能
        if (!share.creatorId.equals(new mongoose_1.default.Types.ObjectId(req.user.userId))) {
            return res.status(403).json({
                status: 'error',
                message: 'この共有設定にアクセスする権限がありません'
            });
        }
        const shareUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/share/${share.shareToken}`;
        return res.json({
            status: 'success',
            data: {
                ...share.toObject(),
                shareUrl
            }
        });
    }
    catch (error) {
        console.error('共有設定詳細取得エラー:', error);
        return res.status(500).json({
            status: 'error',
            message: '共有設定詳細の取得に失敗しました'
        });
    }
});
// 共有設定更新
router.put('/:id', middleware_1.authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                status: 'error',
                message: '無効な共有設定IDです'
            });
        }
        const share = await Share_1.Share.findById(id);
        if (!share) {
            return res.status(404).json({
                status: 'error',
                message: '共有設定が見つかりません'
            });
        }
        // 作成者のみ更新可能
        if (!share.creatorId.equals(new mongoose_1.default.Types.ObjectId(req.user.userId))) {
            return res.status(403).json({
                status: 'error',
                message: '共有設定を更新する権限がありません'
            });
        }
        // パスワードの処理
        if (updates.password) {
            updates.password = await bcrypt_1.default.hash(updates.password, 10);
        }
        // allowedUsersの処理
        if (updates.allowedUsers) {
            updates.allowedUsers = updates.allowedUsers.map((id) => new mongoose_1.default.Types.ObjectId(id));
        }
        // 更新実行
        Object.assign(share, updates);
        await share.save();
        const updatedShare = await Share_1.Share.findById(id)
            .populate('allowedUsers', 'username profile.displayName')
            .populate('resourceId')
            .select('-password');
        const shareUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/share/${share.shareToken}`;
        return res.json({
            status: 'success',
            data: {
                ...updatedShare.toObject(),
                shareUrl
            }
        });
    }
    catch (error) {
        console.error('共有設定更新エラー:', error);
        return res.status(500).json({
            status: 'error',
            message: '共有設定の更新に失敗しました',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// 共有設定削除
router.delete('/:id', middleware_1.authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                status: 'error',
                message: '無効な共有設定IDです'
            });
        }
        const share = await Share_1.Share.findById(id);
        if (!share) {
            return res.status(404).json({
                status: 'error',
                message: '共有設定が見つかりません'
            });
        }
        // 作成者のみ削除可能
        if (!share.creatorId.equals(new mongoose_1.default.Types.ObjectId(req.user.userId))) {
            return res.status(403).json({
                status: 'error',
                message: '共有設定を削除する権限がありません'
            });
        }
        await Share_1.Share.findByIdAndDelete(id);
        return res.json({
            status: 'success',
            message: '共有設定が削除されました'
        });
    }
    catch (error) {
        console.error('共有設定削除エラー:', error);
        return res.status(500).json({
            status: 'error',
            message: '共有設定の削除に失敗しました'
        });
    }
});
// 共有コンテンツアクセス（認証不要）
router.get('/public/:token', middleware_1.optionalAuth, async (req, res) => {
    try {
        const { token } = req.params;
        const { password } = req.query;
        const share = await Share_1.Share.findOne({ shareToken: token, isActive: true })
            .populate('resourceId')
            .populate('creatorId', 'username profile.displayName');
        if (!share) {
            return res.status(404).json({
                status: 'error',
                message: '共有コンテンツが見つかりません'
            });
        }
        // 有効期限チェック
        if (share.isExpired()) {
            return res.status(410).json({
                status: 'error',
                message: '共有コンテンツの有効期限が切れています'
            });
        }
        // アクセス権限チェック
        const userId = req.user?.userId;
        if (!share.hasAccess(userId)) {
            return res.status(403).json({
                status: 'error',
                message: 'このコンテンツにアクセスする権限がありません'
            });
        }
        // パスワード保護の場合のパスワード確認
        if (share.visibility === Share_1.ShareVisibility.PASSWORD_PROTECTED) {
            if (!password) {
                return res.status(401).json({
                    status: 'error',
                    message: 'パスワードが必要です',
                    requiresPassword: true
                });
            }
            const shareWithPassword = await Share_1.Share.findById(share._id).select('+password');
            if (!shareWithPassword?.password || !await bcrypt_1.default.compare(password, shareWithPassword.password)) {
                return res.status(401).json({
                    status: 'error',
                    message: 'パスワードが正しくありません'
                });
            }
        }
        // アクセスログ記録
        const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
        const userAgent = req.get('User-Agent') || 'unknown';
        await share.logAccess(userId, ipAddress, userAgent);
        // リソースデータの取得
        let resourceData;
        switch (share.resourceType) {
            case Share_1.ShareType.SESSION_RESULTS:
                // セッション結果データを取得
                const session = await Session_1.Session.findById(share.resourceId)
                    .populate('videoId', 'title youtubeId thumbnailUrl metadata')
                    .populate('templateId')
                    .populate('evaluators', 'username profile.displayName');
                // TODO: 評価結果データも含める
                resourceData = {
                    session,
                    evaluations: [], // 実際の評価データを取得
                    analytics: {} // 分析データを取得
                };
                break;
            case Share_1.ShareType.EVALUATION:
                // 個別評価データを取得
                const evaluation = await Evaluation_1.Evaluation.findById(share.resourceId)
                    .populate('userId', 'username profile.displayName')
                    .populate('sessionId');
                resourceData = { evaluation };
                break;
            default:
                resourceData = share.resourceId;
        }
        return res.json({
            status: 'success',
            data: {
                share: {
                    id: share._id,
                    resourceType: share.resourceType,
                    visibility: share.visibility,
                    permissions: share.permissions,
                    settings: share.settings,
                    createdAt: share.createdAt,
                    expiresAt: share.expiresAt,
                    creator: share.creatorId
                },
                resource: resourceData
            }
        });
    }
    catch (error) {
        console.error('共有コンテンツアクセスエラー:', error);
        return res.status(500).json({
            status: 'error',
            message: '共有コンテンツの取得に失敗しました'
        });
    }
});
// 共有設定の有効/無効切り替え
router.patch('/:id/toggle', middleware_1.authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                status: 'error',
                message: '無効な共有設定IDです'
            });
        }
        const share = await Share_1.Share.findById(id);
        if (!share) {
            return res.status(404).json({
                status: 'error',
                message: '共有設定が見つかりません'
            });
        }
        // 作成者のみ切り替え可能
        if (!share.creatorId.equals(new mongoose_1.default.Types.ObjectId(req.user.userId))) {
            return res.status(403).json({
                status: 'error',
                message: '共有設定を変更する権限がありません'
            });
        }
        share.isActive = !share.isActive;
        await share.save();
        return res.json({
            status: 'success',
            data: {
                id: share._id,
                isActive: share.isActive
            }
        });
    }
    catch (error) {
        console.error('共有設定切り替えエラー:', error);
        return res.status(500).json({
            status: 'error',
            message: '共有設定の切り替えに失敗しました'
        });
    }
});
// 共有アクセス統計取得
router.get('/:id/analytics', middleware_1.authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                status: 'error',
                message: '無効な共有設定IDです'
            });
        }
        const share = await Share_1.Share.findById(id)
            .populate('accessLog.userId', 'username profile.displayName');
        if (!share) {
            return res.status(404).json({
                status: 'error',
                message: '共有設定が見つかりません'
            });
        }
        // 作成者のみアクセス可能
        if (!share.creatorId.equals(new mongoose_1.default.Types.ObjectId(req.user.userId))) {
            return res.status(403).json({
                status: 'error',
                message: 'アクセス統計を確認する権限がありません'
            });
        }
        // アクセス統計の計算
        const totalAccess = share.accessLog.length;
        const uniqueUsers = new Set(share.accessLog
            .filter(log => log.userId)
            .map(log => log.userId.toString())).size;
        const anonymousAccess = share.accessLog.filter(log => !log.userId).length;
        // 日別アクセス数
        const dailyAccess = share.accessLog.reduce((acc, log) => {
            const date = log.accessedAt.toISOString().split('T')[0];
            acc[date] = (acc[date] || 0) + 1;
            return acc;
        }, {});
        // 最近のアクセス（最新10件）
        const recentAccess = share.accessLog
            .sort((a, b) => b.accessedAt.getTime() - a.accessedAt.getTime())
            .slice(0, 10);
        return res.json({
            status: 'success',
            data: {
                summary: {
                    totalAccess,
                    uniqueUsers,
                    anonymousAccess,
                    firstAccess: share.accessLog.length > 0 ?
                        Math.min(...share.accessLog.map(log => log.accessedAt.getTime())) : null,
                    lastAccess: share.accessLog.length > 0 ?
                        Math.max(...share.accessLog.map(log => log.accessedAt.getTime())) : null
                },
                dailyAccess,
                recentAccess
            }
        });
    }
    catch (error) {
        console.error('共有アクセス統計取得エラー:', error);
        return res.status(500).json({
            status: 'error',
            message: 'アクセス統計の取得に失敗しました'
        });
    }
});
exports.default = router;
//# sourceMappingURL=shares.js.map