"use strict";
/**
 * 言語検出ミドルウェア
 * リクエストヘッダーから適切な言語を検出し、リクエストオブジェクトに追加
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.languageDetectionMiddleware = languageDetectionMiddleware;
exports.getRequestLanguage = getRequestLanguage;
exports.setResponseLanguage = setResponseLanguage;
exports.createLocalizedErrorResponse = createLocalizedErrorResponse;
const errorMessages_1 = require("../utils/errorMessages");
/**
 * 言語検出ミドルウェア
 */
function languageDetectionMiddleware(req, res, next) {
    // Accept-Languageヘッダーから言語を検出
    const acceptLanguage = req.headers['accept-language'];
    const detectedLanguage = errorMessages_1.ErrorMessageManager.detectLanguageFromBrowser(acceptLanguage);
    // リクエストオブジェクトに検出された言語を追加
    req.detectedLanguage = detectedLanguage;
    next();
}
/**
 * クエリパラメータまたはヘッダーから言語を取得するヘルパー関数
 */
function getRequestLanguage(req) {
    // 1. クエリパラメータの 'lang' をチェック
    const queryLang = req.query.lang;
    if (queryLang && errorMessages_1.ErrorMessageManager.isLanguageSupported(queryLang)) {
        return queryLang;
    }
    // 2. カスタムヘッダー 'X-Language' をチェック
    const headerLang = req.headers['x-language'];
    if (headerLang && errorMessages_1.ErrorMessageManager.isLanguageSupported(headerLang)) {
        return headerLang;
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
function setResponseLanguage(res, language) {
    res.setHeader('Content-Language', language);
}
/**
 * 多言語対応のエラーレスポンスを生成するヘルパー関数
 */
function createLocalizedErrorResponse(error, language, includeDetails = false) {
    const baseResponse = {
        success: false,
        error: {
            type: error.type || 'UNKNOWN_ERROR',
            message: error.message || 'An error occurred',
            language: language
        }
    };
    // URLValidationErrorの場合、詳細なエラー情報を追加
    if (error.type && errorMessages_1.ErrorMessageManager.isLanguageSupported(language)) {
        const messageData = errorMessages_1.ErrorMessageManager.getMessage(error.type, language);
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
//# sourceMappingURL=languageDetection.js.map