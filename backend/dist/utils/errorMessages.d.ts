/**
 * エラーメッセージシステム
 * 多言語対応とユーザーフレンドリーなエラーメッセージを提供
 */
import { URLValidationErrorType } from './urlNormalizer';
export type SupportedLanguage = 'ja' | 'en';
export interface ErrorMessageData {
    message: string;
    suggestion?: string;
    example?: string;
    userAction?: string;
}
export interface LocalizedErrorMessages {
    [key: string]: ErrorMessageData;
}
/**
 * エラーメッセージマネージャークラス
 */
export declare class ErrorMessageManager {
    private static defaultLanguage;
    /**
     * デフォルト言語を設定
     */
    static setDefaultLanguage(language: SupportedLanguage): void;
    /**
     * エラーメッセージを取得
     */
    static getMessage(errorType: URLValidationErrorType, language?: SupportedLanguage): ErrorMessageData;
    /**
     * 複数言語のメッセージを取得
     */
    static getMultiLanguageMessage(errorType: URLValidationErrorType): Record<SupportedLanguage, ErrorMessageData>;
    /**
     * フォーマット済みエラーメッセージを取得
     */
    static getFormattedMessage(errorType: URLValidationErrorType, language?: SupportedLanguage, includeExample?: boolean): string;
    /**
     * ユーザー向けヘルプメッセージを生成
     */
    static generateHelpMessage(errorType: URLValidationErrorType, language?: SupportedLanguage): {
        title: string;
        message: string;
        suggestion: string;
        example?: string;
        userAction?: string;
    };
    /**
     * サポートされている言語一覧を取得
     */
    static getSupportedLanguages(): SupportedLanguage[];
    /**
     * 言語がサポートされているかチェック
     */
    static isLanguageSupported(language: string): language is SupportedLanguage;
    /**
     * ブラウザの言語設定から適切な言語を検出
     */
    static detectLanguageFromBrowser(acceptLanguage?: string): SupportedLanguage;
}
/**
 * エラーメッセージのカテゴリ分類
 */
export declare const ERROR_CATEGORIES: {
    readonly FORMAT_ERROR: readonly [URLValidationErrorType.INVALID_FORMAT, URLValidationErrorType.NOT_YOUTUBE, URLValidationErrorType.MISSING_VIDEO_ID];
    readonly VIDEO_ERROR: readonly [URLValidationErrorType.PRIVATE_VIDEO, URLValidationErrorType.VIDEO_NOT_FOUND, URLValidationErrorType.DUPLICATE_VIDEO];
    readonly SYSTEM_ERROR: readonly [URLValidationErrorType.NETWORK_ERROR];
};
/**
 * エラーの重要度レベル
 */
export declare enum ErrorSeverity {
    LOW = "low",// ユーザーが簡単に修正可能
    MEDIUM = "medium",// ユーザーの操作が必要
    HIGH = "high"
}
/**
 * エラータイプと重要度のマッピング
 */
export declare const ERROR_SEVERITY_MAP: Record<URLValidationErrorType, ErrorSeverity>;
/**
 * エラーの重要度を取得
 */
export declare function getErrorSeverity(errorType: URLValidationErrorType): ErrorSeverity;
//# sourceMappingURL=errorMessages.d.ts.map