import { Request, Response, NextFunction } from 'express';
import { AuthService, JWTPayload } from '../services/authService';
import { UserRole } from '../models/User';

// 認証済みユーザー情報をRequestに追加
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

/**
 * JWT認証ミドルウェア
 */
export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
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

    const decoded = AuthService.verifyToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({
      status: 'error',
      code: 'INVALID_TOKEN',
      message: error instanceof Error ? error.message : 'トークンが無効です'
    });
  }
};

/**
 * オプショナル認証ミドルウェア（トークンがあれば認証、なくても通す）
 */
export const optionalAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = AuthService.verifyToken(token);
      req.user = decoded;
    }
    
    next();
  } catch (error) {
    // オプショナル認証なのでエラーでも通す
    next();
  }
};

/**
 * ロールベースアクセス制御ミドルウェア
 */
export const requireRole = (allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
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

/**
 * 管理者権限チェックミドルウェア
 */
export const requireAdmin = requireRole([UserRole.ADMIN]);

/**
 * 評価者以上の権限チェックミドルウェア
 */
export const requireEvaluator = requireRole([UserRole.ADMIN, UserRole.EVALUATOR]);

/**
 * 自分自身または管理者のみアクセス可能
 */
export const requireSelfOrAdmin = (userIdParam: string = 'userId') => {
  return (req: Request, res: Response, next: NextFunction): void => {
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
    const isAdmin = req.user.role === UserRole.ADMIN;

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

// バリデーションミドルウェアは後のタスクで実装
export const validationMiddleware = () => {
  // Validation middleware placeholder
};