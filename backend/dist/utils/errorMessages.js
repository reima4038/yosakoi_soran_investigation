"use strict";
/**
 * エラーメッセージシステム
 * 多言語対応とユーザーフレンドリーなエラーメッセージを提供
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ERROR_SEVERITY_MAP = exports.ErrorSeverity = exports.ERROR_CATEGORIES = exports.ErrorMessageManager = void 0;
exports.getErrorSeverity = getErrorSeverity;
const urlNormalizer_1 = require("./urlNormalizer");
/**
 * 日本語エラーメッセージ
 */
const ERROR_MESSAGES_JA = {
    [urlNormalizer_1.URLValidationErrorType.INVALID_FORMAT]: {
        message: 'URLが正しい形式ではありません',
        suggestion: 'YouTube URLを入力してください',
        example: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        userAction: 'URLを確認して再度入力してください'
    },
    [urlNormalizer_1.URLValidationErrorType.NOT_YOUTUBE]: {
        message: 'YouTube以外のURLは登録できません',
        suggestion: 'YouTube（youtube.com または youtu.be）のURLを入力してください',
        example: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        userAction: 'YouTubeの動画ページからURLをコピーしてください'
    },
    [urlNormalizer_1.URLValidationErrorType.MISSING_VIDEO_ID]: {
        message: 'ビデオIDが見つかりません',
        suggestion: '完全なYouTube URLを入力してください',
        example: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        userAction: '動画ページのURLを確認してください'
    },
    [urlNormalizer_1.URLValidationErrorType.PRIVATE_VIDEO]: {
        message: 'この動画は非公開のため登録できません',
        suggestion: '公開されている動画のURLを入力してください',
        userAction: '動画の公開設定を確認するか、別の動画を選択してください'
    },
    [urlNormalizer_1.URLValidationErrorType.VIDEO_NOT_FOUND]: {
        message: '指定された動画が見つかりません',
        suggestion: 'URLが正しいか確認してください',
        userAction: '動画が削除されていないか確認してください'
    },
    [urlNormalizer_1.URLValidationErrorType.NETWORK_ERROR]: {
        message: 'ネットワークエラーが発生しました',
        suggestion: 'インターネット接続を確認してください',
        userAction: 'しばらく待ってから再度お試しください'
    },
    [urlNormalizer_1.URLValidationErrorType.DUPLICATE_VIDEO]: {
        message: 'この動画は既に登録されています',
        suggestion: '別の動画を選択してください',
        userAction: '登録済みの動画一覧を確認してください'
    }
};
/**
 * 英語エラーメッセージ
 */
const ERROR_MESSAGES_EN = {
    [urlNormalizer_1.URLValidationErrorType.INVALID_FORMAT]: {
        message: 'Invalid URL format',
        suggestion: 'Please enter a YouTube URL',
        example: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        userAction: 'Please check the URL and try again'
    },
    [urlNormalizer_1.URLValidationErrorType.NOT_YOUTUBE]: {
        message: 'Only YouTube URLs are supported',
        suggestion: 'Please enter a YouTube (youtube.com or youtu.be) URL',
        example: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        userAction: 'Please copy the URL from a YouTube video page'
    },
    [urlNormalizer_1.URLValidationErrorType.MISSING_VIDEO_ID]: {
        message: 'Video ID not found',
        suggestion: 'Please enter a complete YouTube URL',
        example: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        userAction: 'Please check the video page URL'
    },
    [urlNormalizer_1.URLValidationErrorType.PRIVATE_VIDEO]: {
        message: 'This video is private and cannot be registered',
        suggestion: 'Please enter a public video URL',
        userAction: 'Please check the video privacy settings or select another video'
    },
    [urlNormalizer_1.URLValidationErrorType.VIDEO_NOT_FOUND]: {
        message: 'The specified video was not found',
        suggestion: 'Please check if the URL is correct',
        userAction: 'Please verify that the video has not been deleted'
    },
    [urlNormalizer_1.URLValidationErrorType.NETWORK_ERROR]: {
        message: 'A network error occurred',
        suggestion: 'Please check your internet connection',
        userAction: 'Please wait a moment and try again'
    },
    [urlNormalizer_1.URLValidationErrorType.DUPLICATE_VIDEO]: {
        message: 'This video has already been registered',
        suggestion: 'Please select a different video',
        userAction: 'Please check the list of registered videos'
    }
};
/**
 * 言語別エラーメッセージマップ
 */
const ERROR_MESSAGES_MAP = {
    ja: ERROR_MESSAGES_JA,
    en: ERROR_MESSAGES_EN
};
/**
 * エラーメッセージマネージャークラス
 */
class ErrorMessageManager {
    /**
     * デフォルト言語を設定
     */
    static setDefaultLanguage(language) {
        this.defaultLanguage = language;
    }
    /**
     * エラーメッセージを取得
     */
    static getMessage(errorType, language = this.defaultLanguage) {
        const messages = ERROR_MESSAGES_MAP[language] || ERROR_MESSAGES_MAP[this.defaultLanguage];
        const messageData = messages[errorType];
        if (!messageData) {
            // フォールバック用のデフォルトメッセージ
            return {
                message: language === 'en' ? 'An unknown error occurred' : '不明なエラーが発生しました',
                suggestion: language === 'en' ? 'Please try again' : '再度お試しください',
                userAction: language === 'en' ? 'Contact support if the problem persists' : '問題が続く場合はサポートにお問い合わせください'
            };
        }
        return messageData;
    }
    /**
     * 複数言語のメッセージを取得
     */
    static getMultiLanguageMessage(errorType) {
        return {
            ja: this.getMessage(errorType, 'ja'),
            en: this.getMessage(errorType, 'en')
        };
    }
    /**
     * フォーマット済みエラーメッセージを取得
     */
    static getFormattedMessage(errorType, language = this.defaultLanguage, includeExample = true) {
        const messageData = this.getMessage(errorType, language);
        let formatted = messageData.message;
        if (messageData.suggestion) {
            formatted += `\n${messageData.suggestion}`;
        }
        if (includeExample && messageData.example) {
            const exampleLabel = language === 'en' ? 'Example:' : '例:';
            formatted += `\n${exampleLabel} ${messageData.example}`;
        }
        return formatted;
    }
    /**
     * ユーザー向けヘルプメッセージを生成
     */
    static generateHelpMessage(errorType, language = this.defaultLanguage) {
        const messageData = this.getMessage(errorType, language);
        const result = {
            title: language === 'en' ? 'URL Validation Error' : 'URL検証エラー',
            message: messageData.message,
            suggestion: messageData.suggestion || ''
        };
        if (messageData.example !== undefined) {
            result.example = messageData.example;
        }
        if (messageData.userAction !== undefined) {
            result.userAction = messageData.userAction;
        }
        return result;
    }
    /**
     * サポートされている言語一覧を取得
     */
    static getSupportedLanguages() {
        return Object.keys(ERROR_MESSAGES_MAP);
    }
    /**
     * 言語がサポートされているかチェック
     */
    static isLanguageSupported(language) {
        return language in ERROR_MESSAGES_MAP;
    }
    /**
     * ブラウザの言語設定から適切な言語を検出
     */
    static detectLanguageFromBrowser(acceptLanguage) {
        if (!acceptLanguage) {
            return this.defaultLanguage;
        }
        // Accept-Language ヘッダーを解析
        const languages = acceptLanguage
            .split(',')
            .map(lang => lang.split(';')[0].trim().toLowerCase())
            .map(lang => lang.split('-')[0]); // 地域コードを除去
        for (const lang of languages) {
            if (this.isLanguageSupported(lang)) {
                return lang;
            }
        }
        return this.defaultLanguage;
    }
}
exports.ErrorMessageManager = ErrorMessageManager;
ErrorMessageManager.defaultLanguage = 'ja';
/**
 * エラーメッセージのカテゴリ分類
 */
exports.ERROR_CATEGORIES = {
    FORMAT_ERROR: [
        urlNormalizer_1.URLValidationErrorType.INVALID_FORMAT,
        urlNormalizer_1.URLValidationErrorType.NOT_YOUTUBE,
        urlNormalizer_1.URLValidationErrorType.MISSING_VIDEO_ID
    ],
    VIDEO_ERROR: [
        urlNormalizer_1.URLValidationErrorType.PRIVATE_VIDEO,
        urlNormalizer_1.URLValidationErrorType.VIDEO_NOT_FOUND,
        urlNormalizer_1.URLValidationErrorType.DUPLICATE_VIDEO
    ],
    SYSTEM_ERROR: [
        urlNormalizer_1.URLValidationErrorType.NETWORK_ERROR
    ]
};
/**
 * エラーの重要度レベル
 */
var ErrorSeverity;
(function (ErrorSeverity) {
    ErrorSeverity["LOW"] = "low";
    ErrorSeverity["MEDIUM"] = "medium";
    ErrorSeverity["HIGH"] = "high"; // システムエラーまたは重大な問題
})(ErrorSeverity || (exports.ErrorSeverity = ErrorSeverity = {}));
/**
 * エラータイプと重要度のマッピング
 */
exports.ERROR_SEVERITY_MAP = {
    [urlNormalizer_1.URLValidationErrorType.INVALID_FORMAT]: ErrorSeverity.LOW,
    [urlNormalizer_1.URLValidationErrorType.NOT_YOUTUBE]: ErrorSeverity.LOW,
    [urlNormalizer_1.URLValidationErrorType.MISSING_VIDEO_ID]: ErrorSeverity.LOW,
    [urlNormalizer_1.URLValidationErrorType.PRIVATE_VIDEO]: ErrorSeverity.MEDIUM,
    [urlNormalizer_1.URLValidationErrorType.VIDEO_NOT_FOUND]: ErrorSeverity.MEDIUM,
    [urlNormalizer_1.URLValidationErrorType.DUPLICATE_VIDEO]: ErrorSeverity.MEDIUM,
    [urlNormalizer_1.URLValidationErrorType.NETWORK_ERROR]: ErrorSeverity.HIGH
};
/**
 * エラーの重要度を取得
 */
function getErrorSeverity(errorType) {
    return exports.ERROR_SEVERITY_MAP[errorType] || ErrorSeverity.MEDIUM;
}
//# sourceMappingURL=errorMessages.js.map