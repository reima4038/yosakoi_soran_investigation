"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auth = exports.validationMiddleware = exports.requireSelfOrAdmin = exports.requireEvaluator = exports.requireAdmin = exports.requireRole = exports.optionalAuth = exports.authenticateToken = void 0;
const authService_1 = require("../services/authService");
const User_1 = require("../models/User");
/**
 * JWT認証ミドルウェア
 */
const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
        if (!token) {
            res.status(401).json({
                status: 'error',
                code: 'UNAUTHORIZED',
                message: 'アクセストークンが必要です'
            });
            return;
        }
        const decoded = authService_1.AuthService.verifyToken(token);
        req.user = decoded;
        next();
    }
    catch (error) {
        res.status(401).json({
            status: 'error',
            code: 'INVALID_TOKEN',
            message: error instanceof Error ? error.message : 'トークンが無効です'
        });
    }
};
exports.authenticateToken = authenticateToken;
/**
 * オプショナル認証ミドルウェア（トークンがあれば認証、なくても通す）
 */
const optionalAuth = async (req, _res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1];
        if (token) {
            const decoded = authService_1.AuthService.verifyToken(token);
            req.user = decoded;
        }
        next();
    }
    catch (error) {
        // オプショナル認証なのでエラーでも通す
        next();
    }
};
exports.optionalAuth = optionalAuth;
/**
 * ロールベースアクセス制御ミドルウェア
 */
const requireRole = (allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json({
                status: 'error',
                code: 'UNAUTHORIZED',
                message: '認証が必要です'
            });
            return;
        }
        if (!allowedRoles.includes(req.user.role)) {
            res.status(403).json({
                status: 'error',
                code: 'FORBIDDEN',
                message: 'このリソースにアクセスする権限がありません'
            });
            return;
        }
        next();
    };
};
exports.requireRole = requireRole;
/**
 * 管理者権限チェックミドルウェア
 */
exports.requireAdmin = (0, exports.requireRole)([User_1.UserRole.ADMIN]);
/**
 * 評価者以上の権限チェックミドルウェア
 */
exports.requireEvaluator = (0, exports.requireRole)([User_1.UserRole.ADMIN, User_1.UserRole.EVALUATOR]);
/**
 * 自分自身または管理者のみアクセス可能
 */
const requireSelfOrAdmin = (userIdParam = 'userId') => {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json({
                status: 'error',
                code: 'UNAUTHORIZED',
                message: '認証が必要です'
            });
            return;
        }
        const targetUserId = req.params[userIdParam];
        const isOwner = req.user.userId === targetUserId;
        const isAdmin = req.user.role === User_1.UserRole.ADMIN;
        if (!isOwner && !isAdmin) {
            res.status(403).json({
                status: 'error',
                code: 'FORBIDDEN',
                message: 'このリソースにアクセスする権限がありません'
            });
            return;
        }
        next();
    };
};
exports.requireSelfOrAdmin = requireSelfOrAdmin;
// バリデーションミドルウェアは後のタスクで実装
const validationMiddleware = () => {
    // Validation middleware placeholder
};
exports.validationMiddleware = validationMiddleware;
// エイリアス
exports.auth = exports.authenticateToken;
//# sourceMappingURL=index.js.map