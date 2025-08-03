import { 
  ErrorMessageManager, 
  SupportedLanguage, 
  ERROR_CATEGORIES, 
  ErrorSeverity, 
  getErrorSeverity 
} from '../../utils/errorMessages';
import { URLValidationErrorType } from '../../utils/urlNormalizer';

describe('ErrorMessageManager', () => {
  beforeEach(() => {
    // テスト前にデフォルト言語をリセット
    ErrorMessageManager.setDefaultLanguage('ja');
  });

  describe('getMessage', () => {
    it('should return Japanese error message by default', () => {
      const message = ErrorMessageManager.getMessage(URLValidationErrorType.NOT_YOUTUBE);
      
      expect(message.message).toBe('YouTube以外のURLは登録できません');
      expect(message.suggestion).toBe('YouTube（youtube.com または youtu.be）のURLを入力してください');
      expect(message.example).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
      expect(message.userAction).toBe('YouTubeの動画ページからURLをコピーしてください');
    });

    it('should return English error message when specified', () => {
      const message = ErrorMessageManager.getMessage(URLValidationErrorType.NOT_YOUTUBE, 'en');
      
      expect(message.message).toBe('Only YouTube URLs are supported');
      expect(message.suggestion).toBe('Please enter a YouTube (youtube.com or youtu.be) URL');
      expect(message.example).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
      expect(message.userAction).toBe('Please copy the URL from a YouTube video page');
    });

    it('should return fallback message for unknown error type', () => {
      const unknownErrorType = 'UNKNOWN_ERROR' as URLValidationErrorType;
      const message = ErrorMessageManager.getMessage(unknownErrorType);
      
      expect(message.message).toBe('不明なエラーが発生しました');
      expect(message.suggestion).toBe('再度お試しください');
    });

    it('should handle all defined error types', () => {
      const errorTypes = Object.values(URLValidationErrorType);
      
      errorTypes.forEach(errorType => {
        const jaMessage = ErrorMessageManager.getMessage(errorType, 'ja');
        const enMessage = ErrorMessageManager.getMessage(errorType, 'en');
        
        expect(jaMessage.message).toBeTruthy();
        expect(enMessage.message).toBeTruthy();
        expect(typeof jaMessage.message).toBe('string');
        expect(typeof enMessage.message).toBe('string');
      });
    });
  });

  describe('getMultiLanguageMessage', () => {
    it('should return messages in both languages', () => {
      const messages = ErrorMessageManager.getMultiLanguageMessage(URLValidationErrorType.INVALID_FORMAT);
      
      expect(messages.ja).toBeDefined();
      expect(messages.en).toBeDefined();
      expect(messages.ja.message).toBe('URLが正しい形式ではありません');
      expect(messages.en.message).toBe('Invalid URL format');
    });
  });

  describe('getFormattedMessage', () => {
    it('should format message with suggestion and example', () => {
      const formatted = ErrorMessageManager.getFormattedMessage(
        URLValidationErrorType.MISSING_VIDEO_ID, 
        'ja', 
        true
      );
      
      expect(formatted).toContain('ビデオIDが見つかりません');
      expect(formatted).toContain('完全なYouTube URLを入力してください');
      expect(formatted).toContain('例: https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    });

    it('should format message without example when specified', () => {
      const formatted = ErrorMessageManager.getFormattedMessage(
        URLValidationErrorType.MISSING_VIDEO_ID, 
        'ja', 
        false
      );
      
      expect(formatted).toContain('ビデオIDが見つかりません');
      expect(formatted).toContain('完全なYouTube URLを入力してください');
      expect(formatted).not.toContain('例:');
    });

    it('should format English message correctly', () => {
      const formatted = ErrorMessageManager.getFormattedMessage(
        URLValidationErrorType.MISSING_VIDEO_ID, 
        'en', 
        true
      );
      
      expect(formatted).toContain('Video ID not found');
      expect(formatted).toContain('Please enter a complete YouTube URL');
      expect(formatted).toContain('Example: https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    });
  });

  describe('generateHelpMessage', () => {
    it('should generate complete help message structure', () => {
      const help = ErrorMessageManager.generateHelpMessage(URLValidationErrorType.PRIVATE_VIDEO, 'ja');
      
      expect(help.title).toBe('URL検証エラー');
      expect(help.message).toBe('この動画は非公開のため登録できません');
      expect(help.suggestion).toBe('公開されている動画のURLを入力してください');
      expect(help.userAction).toBe('動画の公開設定を確認するか、別の動画を選択してください');
    });

    it('should generate English help message', () => {
      const help = ErrorMessageManager.generateHelpMessage(URLValidationErrorType.PRIVATE_VIDEO, 'en');
      
      expect(help.title).toBe('URL Validation Error');
      expect(help.message).toBe('This video is private and cannot be registered');
      expect(help.suggestion).toBe('Please enter a public video URL');
      expect(help.userAction).toBe('Please check the video privacy settings or select another video');
    });
  });

  describe('language management', () => {
    it('should set and use default language', () => {
      ErrorMessageManager.setDefaultLanguage('en');
      const message = ErrorMessageManager.getMessage(URLValidationErrorType.NOT_YOUTUBE);
      
      expect(message.message).toBe('Only YouTube URLs are supported');
    });

    it('should return supported languages', () => {
      const languages = ErrorMessageManager.getSupportedLanguages();
      
      expect(languages).toContain('ja');
      expect(languages).toContain('en');
      expect(languages.length).toBe(2);
    });

    it('should check if language is supported', () => {
      expect(ErrorMessageManager.isLanguageSupported('ja')).toBe(true);
      expect(ErrorMessageManager.isLanguageSupported('en')).toBe(true);
      expect(ErrorMessageManager.isLanguageSupported('fr')).toBe(false);
      expect(ErrorMessageManager.isLanguageSupported('invalid')).toBe(false);
    });
  });

  describe('detectLanguageFromBrowser', () => {
    it('should detect Japanese from Accept-Language header', () => {
      const language = ErrorMessageManager.detectLanguageFromBrowser('ja-JP,ja;q=0.9,en;q=0.8');
      expect(language).toBe('ja');
    });

    it('should detect English from Accept-Language header', () => {
      const language = ErrorMessageManager.detectLanguageFromBrowser('en-US,en;q=0.9');
      expect(language).toBe('en');
    });

    it('should return default language for unsupported language', () => {
      const language = ErrorMessageManager.detectLanguageFromBrowser('fr-FR,fr;q=0.9');
      expect(language).toBe('ja'); // デフォルト言語
    });

    it('should return default language when no Accept-Language provided', () => {
      const language = ErrorMessageManager.detectLanguageFromBrowser();
      expect(language).toBe('ja');
    });

    it('should handle complex Accept-Language headers', () => {
      const language = ErrorMessageManager.detectLanguageFromBrowser('fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7,ja;q=0.6');
      expect(language).toBe('en'); // 最初にサポートされている言語
    });
  });

  describe('error categories', () => {
    it('should categorize format errors correctly', () => {
      expect(ERROR_CATEGORIES.FORMAT_ERROR).toContain(URLValidationErrorType.INVALID_FORMAT);
      expect(ERROR_CATEGORIES.FORMAT_ERROR).toContain(URLValidationErrorType.NOT_YOUTUBE);
      expect(ERROR_CATEGORIES.FORMAT_ERROR).toContain(URLValidationErrorType.MISSING_VIDEO_ID);
    });

    it('should categorize video errors correctly', () => {
      expect(ERROR_CATEGORIES.VIDEO_ERROR).toContain(URLValidationErrorType.PRIVATE_VIDEO);
      expect(ERROR_CATEGORIES.VIDEO_ERROR).toContain(URLValidationErrorType.VIDEO_NOT_FOUND);
      expect(ERROR_CATEGORIES.VIDEO_ERROR).toContain(URLValidationErrorType.DUPLICATE_VIDEO);
    });

    it('should categorize system errors correctly', () => {
      expect(ERROR_CATEGORIES.SYSTEM_ERROR).toContain(URLValidationErrorType.NETWORK_ERROR);
    });
  });

  describe('error severity', () => {
    it('should return correct severity for format errors', () => {
      expect(getErrorSeverity(URLValidationErrorType.INVALID_FORMAT)).toBe(ErrorSeverity.LOW);
      expect(getErrorSeverity(URLValidationErrorType.NOT_YOUTUBE)).toBe(ErrorSeverity.LOW);
      expect(getErrorSeverity(URLValidationErrorType.MISSING_VIDEO_ID)).toBe(ErrorSeverity.LOW);
    });

    it('should return correct severity for video errors', () => {
      expect(getErrorSeverity(URLValidationErrorType.PRIVATE_VIDEO)).toBe(ErrorSeverity.MEDIUM);
      expect(getErrorSeverity(URLValidationErrorType.VIDEO_NOT_FOUND)).toBe(ErrorSeverity.MEDIUM);
      expect(getErrorSeverity(URLValidationErrorType.DUPLICATE_VIDEO)).toBe(ErrorSeverity.MEDIUM);
    });

    it('should return correct severity for system errors', () => {
      expect(getErrorSeverity(URLValidationErrorType.NETWORK_ERROR)).toBe(ErrorSeverity.HIGH);
    });

    it('should return medium severity for unknown error types', () => {
      const unknownErrorType = 'UNKNOWN_ERROR' as URLValidationErrorType;
      expect(getErrorSeverity(unknownErrorType)).toBe(ErrorSeverity.MEDIUM);
    });
  });

  describe('comprehensive error type coverage', () => {
    it('should have messages for all error types', () => {
      const errorTypes = Object.values(URLValidationErrorType);
      
      errorTypes.forEach(errorType => {
        const jaMessage = ErrorMessageManager.getMessage(errorType, 'ja');
        const enMessage = ErrorMessageManager.getMessage(errorType, 'en');
        
        // 基本的なメッセージが存在することを確認
        expect(jaMessage.message).toBeTruthy();
        expect(enMessage.message).toBeTruthy();
        
        // 日本語メッセージが日本語らしいことを確認（ひらがな・カタカナ・漢字を含む）
        expect(jaMessage.message).toMatch(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/);
        
        // 英語メッセージが英語らしいことを確認（アルファベットを含む）
        expect(enMessage.message).toMatch(/[a-zA-Z]/);
      });
    });
  });
});