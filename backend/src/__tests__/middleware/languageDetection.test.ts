import { Request, Response, NextFunction } from 'express';
import { 
  languageDetectionMiddleware, 
  getRequestLanguage, 
  setResponseLanguage, 
  createLocalizedErrorResponse 
} from '../../middleware/languageDetection';
import { URLValidationErrorType } from '../../utils/urlNormalizer';

// モックのRequest, Response, NextFunction
const mockRequest = (headers: any = {}, query: any = {}) => ({
  headers,
  query
} as Request);

const mockResponse = () => {
  const res = {} as Response;
  res.setHeader = jest.fn();
  return res;
};

const mockNext = jest.fn() as NextFunction;

describe('Language Detection Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('languageDetectionMiddleware', () => {
    it('should detect Japanese from Accept-Language header', () => {
      const req = mockRequest({ 'accept-language': 'ja-JP,ja;q=0.9,en;q=0.8' });
      const res = mockResponse();

      languageDetectionMiddleware(req, res, mockNext);

      expect(req.detectedLanguage).toBe('ja');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should detect English from Accept-Language header', () => {
      const req = mockRequest({ 'accept-language': 'en-US,en;q=0.9' });
      const res = mockResponse();

      languageDetectionMiddleware(req, res, mockNext);

      expect(req.detectedLanguage).toBe('en');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should default to Japanese for unsupported language', () => {
      const req = mockRequest({ 'accept-language': 'fr-FR,fr;q=0.9' });
      const res = mockResponse();

      languageDetectionMiddleware(req, res, mockNext);

      expect(req.detectedLanguage).toBe('ja');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle missing Accept-Language header', () => {
      const req = mockRequest({});
      const res = mockResponse();

      languageDetectionMiddleware(req, res, mockNext);

      expect(req.detectedLanguage).toBe('ja');
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('getRequestLanguage', () => {
    it('should prioritize query parameter lang', () => {
      const req = mockRequest(
        { 'accept-language': 'ja-JP', 'x-language': 'ja' },
        { lang: 'en' }
      );
      req.detectedLanguage = 'ja';

      const language = getRequestLanguage(req);
      expect(language).toBe('en');
    });

    it('should use X-Language header when query param is not available', () => {
      const req = mockRequest(
        { 'accept-language': 'ja-JP', 'x-language': 'en' },
        {}
      );
      req.detectedLanguage = 'ja';

      const language = getRequestLanguage(req);
      expect(language).toBe('en');
    });

    it('should use detected language when headers are not available', () => {
      const req = mockRequest({ 'accept-language': 'ja-JP' }, {});
      req.detectedLanguage = 'ja';

      const language = getRequestLanguage(req);
      expect(language).toBe('ja');
    });

    it('should default to Japanese when no language info is available', () => {
      const req = mockRequest({}, {});

      const language = getRequestLanguage(req);
      expect(language).toBe('ja');
    });

    it('should ignore invalid query parameter', () => {
      const req = mockRequest(
        { 'x-language': 'en' },
        { lang: 'invalid' }
      );
      req.detectedLanguage = 'ja';

      const language = getRequestLanguage(req);
      expect(language).toBe('en');
    });

    it('should ignore invalid header language', () => {
      const req = mockRequest(
        { 'x-language': 'invalid' },
        {}
      );
      req.detectedLanguage = 'ja';

      const language = getRequestLanguage(req);
      expect(language).toBe('ja');
    });
  });

  describe('setResponseLanguage', () => {
    it('should set Content-Language header', () => {
      const res = mockResponse();
      
      setResponseLanguage(res, 'en');
      
      expect(res.setHeader).toHaveBeenCalledWith('Content-Language', 'en');
    });
  });

  describe('createLocalizedErrorResponse', () => {
    it('should create basic error response', () => {
      const error = {
        type: URLValidationErrorType.NOT_YOUTUBE,
        message: 'Original message'
      };

      const response = createLocalizedErrorResponse(error, 'ja');

      expect(response.success).toBe(false);
      expect(response.error.type).toBe(URLValidationErrorType.NOT_YOUTUBE);
      expect(response.error.message).toBe('YouTube以外のURLは登録できません');
      expect(response.error.language).toBe('ja');
      expect(response.error.suggestion).toBe('YouTube（youtube.com または youtu.be）のURLを入力してください');
      expect(response.error.userAction).toBe('YouTubeの動画ページからURLをコピーしてください');
    });

    it('should create English error response', () => {
      const error = {
        type: URLValidationErrorType.NOT_YOUTUBE,
        message: 'Original message'
      };

      const response = createLocalizedErrorResponse(error, 'en');

      expect(response.success).toBe(false);
      expect(response.error.type).toBe(URLValidationErrorType.NOT_YOUTUBE);
      expect(response.error.message).toBe('Only YouTube URLs are supported');
      expect(response.error.language).toBe('en');
      expect(response.error.suggestion).toBe('Please enter a YouTube (youtube.com or youtu.be) URL');
      expect(response.error.userAction).toBe('Please copy the URL from a YouTube video page');
    });

    it('should include example when includeDetails is true', () => {
      const error = {
        type: URLValidationErrorType.MISSING_VIDEO_ID,
        message: 'Original message'
      };

      const response = createLocalizedErrorResponse(error, 'ja', true);

      expect((response.error as any).example).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    });

    it('should not include example when includeDetails is false', () => {
      const error = {
        type: URLValidationErrorType.MISSING_VIDEO_ID,
        message: 'Original message'
      };

      const response = createLocalizedErrorResponse(error, 'ja', false);

      expect((response.error as any).example).toBeUndefined();
    });

    it('should handle unknown error types', () => {
      const error = {
        type: 'UNKNOWN_ERROR',
        message: 'Unknown error occurred'
      };

      const response = createLocalizedErrorResponse(error, 'ja');

      expect(response.success).toBe(false);
      expect(response.error.type).toBe('UNKNOWN_ERROR');
      expect(response.error.message).toBe('不明なエラーが発生しました'); // ErrorMessageManagerのフォールバックメッセージ
      expect(response.error.language).toBe('ja');
    });

    it('should handle errors without type', () => {
      const error = {
        message: 'Some error'
      };

      const response = createLocalizedErrorResponse(error, 'ja');

      expect(response.success).toBe(false);
      expect(response.error.type).toBe('UNKNOWN_ERROR');
      expect(response.error.message).toBe('Some error');
      expect(response.error.language).toBe('ja');
    });

    it('should handle errors without message', () => {
      const error = {
        type: URLValidationErrorType.NETWORK_ERROR
      };

      const response = createLocalizedErrorResponse(error, 'ja');

      expect(response.success).toBe(false);
      expect(response.error.type).toBe(URLValidationErrorType.NETWORK_ERROR);
      expect(response.error.message).toBe('ネットワークエラーが発生しました');
      expect(response.error.language).toBe('ja');
    });
  });
});