/**
 * 言語検出ミドルウェア
 * リクエストヘッダーから適切な言語を検出し、リクエストオブジェクトに追加
 */

import { Request, Response, NextFunction } from 'express';
import { ErrorMessageManager, SupportedLanguage } from '../utils/errorMessages';

// Requestオブジェクトを拡張して言語情報を追加
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
export function languageDetectionMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Accept-Languageヘッダーから言語を検出
  const acceptLanguage = req.headers['accept-language'];
  const detectedLanguage = ErrorMessageManager.detectLanguageFromBrowser(acceptLanguage);
  
  // リクエストオブジェクトに検出された言語を追加
  req.detectedLanguage = detectedLanguage;
  
  next();
}

/**
 * クエリパラメータまたはヘッダーから言語を取得するヘルパー関数
 */
export function getRequestLanguage(req: Request): SupportedLanguage {
  // 1. クエリパラメータの 'lang' をチェック
  const queryLang = req.query.lang as string;
  if (queryLang && ErrorMessageManager.isLanguageSupported(queryLang)) {
    return queryLang as SupportedLanguage;
  }
  
  // 2. カスタムヘッダー 'X-Language' をチェック
  const headerLang = req.headers['x-language'] as string;
  if (headerLang && ErrorMessageManager.isLanguageSupported(headerLang)) {
    return headerLang as SupportedLanguage;
  }
  
  // 3. ミドルウェアで検出された言語を使用
  if (req.detectedLanguage) {
    return req.detectedLanguage;
  }
  
  // 4. デフォルト言語を返す
  return 'ja';
}

/**
 * レスポンスに言語情報を追加するヘルパー関数
 */
export function setResponseLanguage(res: Response, language: SupportedLanguage): void {
  res.setHeader('Content-Language', language);
}

/**
 * 多言語対応のエラーレスポンスを生成するヘルパー関数
 */
export function createLocalizedErrorResponse(
  error: any,
  language: SupportedLanguage,
  includeDetails: boolean = false
) {
  const baseResponse: {
    success: false;
    error: {
      type: string;
      message: string;
      language: SupportedLanguage;
      suggestion?: string;
      userAction?: string;
      example?: string;
    };
  } = {
    success: false,
    error: {
      type: error.type || 'UNKNOWN_ERROR',
      message: error.message || 'An error occurred',
      language: language
    }
  };

  // URLValidationErrorの場合、詳細なエラー情報を追加
  if (error.type && ErrorMessageManager.isLanguageSupported(language)) {
    const messageData = ErrorMessageManager.getMessage(error.type, language);
    
    baseResponse.error.message = messageData.message;
    
    if (messageData.suggestion !== undefined) {
      baseResponse.error.suggestion = messageData.suggestion;
    }
    
    if (messageData.userAction !== undefined) {
      baseResponse.error.userAction = messageData.userAction;
    }

    if (includeDetails && messageData.example !== undefined) {
      baseResponse.error.example = messageData.example;
    }
  }

  return baseResponse;
}