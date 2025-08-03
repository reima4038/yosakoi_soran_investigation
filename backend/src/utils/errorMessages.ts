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
 * 日本語エラーメッセージ
 */
const ERROR_MESSAGES_JA: LocalizedErrorMessages = {
  [URLValidationErrorType.INVALID_FORMAT]: {
    message: 'URLが正しい形式ではありません',
    suggestion: 'YouTube URLを入力してください',
    example: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    userAction: 'URLを確認して再度入力してください'
  },
  [URLValidationErrorType.NOT_YOUTUBE]: {
    message: 'YouTube以外のURLは登録できません',
    suggestion: 'YouTube（youtube.com または youtu.be）のURLを入力してください',
    example: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    userAction: 'YouTubeの動画ページからURLをコピーしてください'
  },
  [URLValidationErrorType.MISSING_VIDEO_ID]: {
    message: 'ビデオIDが見つかりません',
    suggestion: '完全なYouTube URLを入力してください',
    example: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    userAction: '動画ページのURLを確認してください'
  },
  [URLValidationErrorType.PRIVATE_VIDEO]: {
    message: 'この動画は非公開のため登録できません',
    suggestion: '公開されている動画のURLを入力してください',
    userAction: '動画の公開設定を確認するか、別の動画を選択してください'
  },
  [URLValidationErrorType.VIDEO_NOT_FOUND]: {
    message: '指定された動画が見つかりません',
    suggestion: 'URLが正しいか確認してください',
    userAction: '動画が削除されていないか確認してください'
  },
  [URLValidationErrorType.NETWORK_ERROR]: {
    message: 'ネットワークエラーが発生しました',
    suggestion: 'インターネット接続を確認してください',
    userAction: 'しばらく待ってから再度お試しください'
  },
  [URLValidationErrorType.DUPLICATE_VIDEO]: {
    message: 'この動画は既に登録されています',
    suggestion: '別の動画を選択してください',
    userAction: '登録済みの動画一覧を確認してください'
  }
};

/**
 * 英語エラーメッセージ
 */
const ERROR_MESSAGES_EN: LocalizedErrorMessages = {
  [URLValidationErrorType.INVALID_FORMAT]: {
    message: 'Invalid URL format',
    suggestion: 'Please enter a YouTube URL',
    example: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    userAction: 'Please check the URL and try again'
  },
  [URLValidationErrorType.NOT_YOUTUBE]: {
    message: 'Only YouTube URLs are supported',
    suggestion: 'Please enter a YouTube (youtube.com or youtu.be) URL',
    example: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    userAction: 'Please copy the URL from a YouTube video page'
  },
  [URLValidationErrorType.MISSING_VIDEO_ID]: {
    message: 'Video ID not found',
    suggestion: 'Please enter a complete YouTube URL',
    example: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    userAction: 'Please check the video page URL'
  },
  [URLValidationErrorType.PRIVATE_VIDEO]: {
    message: 'This video is private and cannot be registered',
    suggestion: 'Please enter a public video URL',
    userAction: 'Please check the video privacy settings or select another video'
  },
  [URLValidationErrorType.VIDEO_NOT_FOUND]: {
    message: 'The specified video was not found',
    suggestion: 'Please check if the URL is correct',
    userAction: 'Please verify that the video has not been deleted'
  },
  [URLValidationErrorType.NETWORK_ERROR]: {
    message: 'A network error occurred',
    suggestion: 'Please check your internet connection',
    userAction: 'Please wait a moment and try again'
  },
  [URLValidationErrorType.DUPLICATE_VIDEO]: {
    message: 'This video has already been registered',
    suggestion: 'Please select a different video',
    userAction: 'Please check the list of registered videos'
  }
};

/**
 * 言語別エラーメッセージマップ
 */
const ERROR_MESSAGES_MAP: Record<SupportedLanguage, LocalizedErrorMessages> = {
  ja: ERROR_MESSAGES_JA,
  en: ERROR_MESSAGES_EN
};

/**
 * エラーメッセージマネージャークラス
 */
export class ErrorMessageManager {
  private static defaultLanguage: SupportedLanguage = 'ja';

  /**
   * デフォルト言語を設定
   */
  static setDefaultLanguage(language: SupportedLanguage): void {
    this.defaultLanguage = language;
  }

  /**
   * エラーメッセージを取得
   */
  static getMessage(
    errorType: URLValidationErrorType,
    language: SupportedLanguage = this.defaultLanguage
  ): ErrorMessageData {
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
  static getMultiLanguageMessage(errorType: URLValidationErrorType): Record<SupportedLanguage, ErrorMessageData> {
    return {
      ja: this.getMessage(errorType, 'ja'),
      en: this.getMessage(errorType, 'en')
    };
  }

  /**
   * フォーマット済みエラーメッセージを取得
   */
  static getFormattedMessage(
    errorType: URLValidationErrorType,
    language: SupportedLanguage = this.defaultLanguage,
    includeExample: boolean = true
  ): string {
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
  static generateHelpMessage(
    errorType: URLValidationErrorType,
    language: SupportedLanguage = this.defaultLanguage
  ): {
    title: string;
    message: string;
    suggestion: string;
    example?: string;
    userAction?: string;
  } {
    const messageData = this.getMessage(errorType, language);
    
    const result: {
      title: string;
      message: string;
      suggestion: string;
      example?: string;
      userAction?: string;
    } = {
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
  static getSupportedLanguages(): SupportedLanguage[] {
    return Object.keys(ERROR_MESSAGES_MAP) as SupportedLanguage[];
  }

  /**
   * 言語がサポートされているかチェック
   */
  static isLanguageSupported(language: string): language is SupportedLanguage {
    return language in ERROR_MESSAGES_MAP;
  }

  /**
   * ブラウザの言語設定から適切な言語を検出
   */
  static detectLanguageFromBrowser(acceptLanguage?: string): SupportedLanguage {
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

/**
 * エラーメッセージのカテゴリ分類
 */
export const ERROR_CATEGORIES = {
  FORMAT_ERROR: [
    URLValidationErrorType.INVALID_FORMAT,
    URLValidationErrorType.NOT_YOUTUBE,
    URLValidationErrorType.MISSING_VIDEO_ID
  ],
  VIDEO_ERROR: [
    URLValidationErrorType.PRIVATE_VIDEO,
    URLValidationErrorType.VIDEO_NOT_FOUND,
    URLValidationErrorType.DUPLICATE_VIDEO
  ],
  SYSTEM_ERROR: [
    URLValidationErrorType.NETWORK_ERROR
  ]
} as const;

/**
 * エラーの重要度レベル
 */
export enum ErrorSeverity {
  LOW = 'low',      // ユーザーが簡単に修正可能
  MEDIUM = 'medium', // ユーザーの操作が必要
  HIGH = 'high'     // システムエラーまたは重大な問題
}

/**
 * エラータイプと重要度のマッピング
 */
export const ERROR_SEVERITY_MAP: Record<URLValidationErrorType, ErrorSeverity> = {
  [URLValidationErrorType.INVALID_FORMAT]: ErrorSeverity.LOW,
  [URLValidationErrorType.NOT_YOUTUBE]: ErrorSeverity.LOW,
  [URLValidationErrorType.MISSING_VIDEO_ID]: ErrorSeverity.LOW,
  [URLValidationErrorType.PRIVATE_VIDEO]: ErrorSeverity.MEDIUM,
  [URLValidationErrorType.VIDEO_NOT_FOUND]: ErrorSeverity.MEDIUM,
  [URLValidationErrorType.DUPLICATE_VIDEO]: ErrorSeverity.MEDIUM,
  [URLValidationErrorType.NETWORK_ERROR]: ErrorSeverity.HIGH
};

/**
 * エラーの重要度を取得
 */
export function getErrorSeverity(errorType: URLValidationErrorType): ErrorSeverity {
  return ERROR_SEVERITY_MAP[errorType] || ErrorSeverity.MEDIUM;
}