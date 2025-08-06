/**
 * 言語検出ミドルウェア
 * リクエストヘッダーから適切な言語を検出し、リクエストオブジェクトに追加
 */
import { Request, Response, NextFunction } from 'express';
import { SupportedLanguage } from '../utils/errorMessages';
declare global {
    namespace Express {
        interface Request {
            detectedLanguage?: SupportedLanguage;
        }
    }
}
/**
 * 言語検出ミドルウェア
 */
export declare function languageDetectionMiddleware(req: Request, res: Response, next: NextFunction): void;
/**
 * クエリパラメータまたはヘッダーから言語を取得するヘルパー関数
 */
export declare function getRequestLanguage(req: Request): SupportedLanguage;
/**
 * レスポンスに言語情報を追加するヘルパー関数
 */
export declare function setResponseLanguage(res: Response, language: SupportedLanguage): void;
/**
 * 多言語対応のエラーレスポンスを生成するヘルパー関数
 */
export declare function createLocalizedErrorResponse(error: any, language: SupportedLanguage, includeDetails?: boolean): {
    success: false;
    error: {
        type: string;
        message: string;
        language: SupportedLanguage;
        suggestion?: string;
        userAction?: string;
        example?: string;
    };
};
//# sourceMappingURL=languageDetection.d.ts.map