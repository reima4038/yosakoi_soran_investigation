import { Request, Response, NextFunction } from 'express';
import { JWTPayload } from '../services/authService';
import { UserRole } from '../models/User';
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
export declare const authenticateToken: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * オプショナル認証ミドルウェア（トークンがあれば認証、なくても通す）
 */
export declare const optionalAuth: (req: Request, _res: Response, next: NextFunction) => Promise<void>;
/**
 * ロールベースアクセス制御ミドルウェア
 */
export declare const requireRole: (allowedRoles: UserRole[]) => (req: Request, res: Response, next: NextFunction) => void;
/**
 * 管理者権限チェックミドルウェア
 */
export declare const requireAdmin: (req: Request, res: Response, next: NextFunction) => void;
/**
 * 評価者以上の権限チェックミドルウェア
 */
export declare const requireEvaluator: (req: Request, res: Response, next: NextFunction) => void;
/**
 * 自分自身または管理者のみアクセス可能
 */
export declare const requireSelfOrAdmin: (userIdParam?: string) => (req: Request, res: Response, next: NextFunction) => void;
export declare const validationMiddleware: () => void;
//# sourceMappingURL=index.d.ts.map