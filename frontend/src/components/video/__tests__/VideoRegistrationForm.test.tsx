/**
 * VideoRegistrationForm コンポーネントのテスト
 * EnhancedURLInput統合後の動作を検証
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import VideoRegistrationForm from '../VideoRegistrationForm';

// Material-UIテーマの設定
const theme = createTheme();

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

// タイマーのモック
beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

// モック設定
jest.mock('../../../services/videoService', () => ({
  videoService: {
    getYouTubeInfo: jest.fn(),
    createVideo: jest.fn(),
  },
}));
jest.mock('../../common/EnhancedURLInput', () => {
  return function MockEnhancedURLInput({ 
    value, 
    onChange, 
    onValidURL, 
    onInvalidURL, 
    onValidationChange,
    ...props 
  }: any) {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      onChange(newValue);
      
      // 簡単なバリデーション
      if (newValue.includes('youtube.com') || newValue.includes('youtu.be')) {
        const normalizedUrl = {
          original: newValue,
          canonical: `https://www.youtube.com/watch?v=dQw4w9WgXcQ`,
          videoId: 'dQw4w9WgXcQ',
          isValid: true
        };
        onValidURL?.(normalizedUrl);
        onValidationChange?.(true);
      } else if (newValue) {
        const error = {
          type: 'INVALID_FORMAT',
          message: '有効なYouTube URLではありません',
          suggestion: 'YouTube URLを入力してください'
        };
        onInvalidURL?.(error);
        onValidationChange?.(false);
      } else {
        onValidationChange?.(false);
      }
    };

    return (
      <input
        data-testid="enhanced-url-input"
        value={value}
        onChange={handleChange}
        placeholder={props.placeholder}
        {...props}
      />
    );
  };
});

const { videoService: mockVideoService } = require('../../../services/videoService');

const mockYouTubeInfo = {
  id: 'dQw4w9WgXcQ',
  title: 'Test Video',
  channelTitle: 'Test Channel',
  publishedAt: '2023-01-01T00:00:00Z',
  viewCount: '1000000',
  thumbnails: {
    default: { url: 'https://example.com/thumb.jpg' },
    medium: { url: 'https://example.com/thumb_medium.jpg' }
  },
  isEmbeddable: true
};

describe('VideoRegistrationForm', () => {
  const defaultProps = {
    open: true,
    onClose: jest.fn(),
    onSuccess: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockVideoService.getYouTubeInfo.mockResolvedValue(mockYouTubeInfo);
    mockVideoService.createVideo.mockResolvedValue({ id: '1', ...mockYouTubeInfo });
  });

  describe('EnhancedURLInput統合', () => {
    it('EnhancedURLInputコンポーネントが表示される', () => {
      renderWithTheme(<VideoRegistrationForm {...defaultProps} />);
      
      expect(screen.getByTestId('enhanced-url-input')).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/https:\/\/www\.youtube\.com\/watch\?v=\.\.\. または https:\/\/youtu\.be\//)).toBeInTheDocument();
    });

    it('有効なYouTube URLを入力すると動画確認ボタンが有効になる', async () => {
      const user = userEvent.setup();
      renderWithTheme(<VideoRegistrationForm {...defaultProps} />);
      
      const urlInput = screen.getByTestId('enhanced-url-input');
      const checkButton = screen.getByText('動画を確認');
      
      // 初期状態では無効
      expect(checkButton).toBeDisabled();
      
      // 有効なURLを入力
      await user.type(urlInput, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
      
      await waitFor(() => {
        expect(checkButton).not.toBeDisabled();
      });
    });

    it('無効なURLを入力すると動画確認ボタンが無効のまま', async () => {
      const user = userEvent.setup();
      renderWithTheme(<VideoRegistrationForm {...defaultProps} />);
      
      const urlInput = screen.getByTestId('enhanced-url-input');
      const checkButton = screen.getByText('動画を確認');
      
      // 無効なURLを入力
      await user.type(urlInput, 'https://example.com/invalid');
      
      await waitFor(() => {
        expect(checkButton).toBeDisabled();
      });
    });
  });

  describe('エラーハンドリング', () => {
    it('動画情報取得エラー時に適切なエラーメッセージを表示', async () => {
      const user = userEvent.setup();
      mockVideoService.getYouTubeInfo.mockRejectedValue({
        response: { data: { message: 'Video is private' } }
      });

      renderWithTheme(<VideoRegistrationForm {...defaultProps} />);
      
      const urlInput = screen.getByTestId('enhanced-url-input');
      await user.type(urlInput, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
      
      const checkButton = screen.getByText('動画を確認');
      await user.click(checkButton);
      
      await waitFor(() => {
        expect(screen.getByText(/この動画は非公開のため登録できません/)).toBeInTheDocument();
      });
    });

    it('動画登録エラー時に適切なエラーメッセージを表示', async () => {
      const user = userEvent.setup();
      mockVideoService.createVideo.mockRejectedValue({
        response: { data: { message: 'Video already exists' } }
      });

      renderWithTheme(<VideoRegistrationForm {...defaultProps} />);
      
      // URL入力からプレビューまで進む
      const urlInput = screen.getByTestId('enhanced-url-input');
      await user.type(urlInput, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
      
      const checkButton = screen.getByText('動画を確認');
      await user.click(checkButton);
      
      await waitFor(() => {
        expect(screen.getByText('詳細情報を入力')).toBeInTheDocument();
      });
      
      // 詳細情報入力画面に進む
      await user.click(screen.getByText('詳細情報を入力'));
      
      await waitFor(() => {
        expect(screen.getByText('登録')).toBeInTheDocument();
      });
      
      // 登録ボタンをクリック
      await user.click(screen.getByText('登録'));
      
      await waitFor(() => {
        expect(screen.getByText(/この動画は既に登録されています/)).toBeInTheDocument();
      });
    });

    it('ネットワークエラー時に適切なエラーメッセージを表示', async () => {
      const user = userEvent.setup();
      mockVideoService.getYouTubeInfo.mockRejectedValue({
        response: { data: { message: 'API quota exceeded' } }
      });

      renderWithTheme(<VideoRegistrationForm {...defaultProps} />);
      
      const urlInput = screen.getByTestId('enhanced-url-input');
      await user.type(urlInput, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
      
      const checkButton = screen.getByText('動画を確認');
      await user.click(checkButton);
      
      await waitFor(() => {
        expect(screen.getByText(/YouTube APIの利用制限に達しました/)).toBeInTheDocument();
      });
    });
  });

  describe('URL正規化', () => {
    it('正規化されたURLでビデオ情報を取得する', async () => {
      const user = userEvent.setup();
      renderWithTheme(<VideoRegistrationForm {...defaultProps} />);
      
      const urlInput = screen.getByTestId('enhanced-url-input');
      await user.type(urlInput, 'https://youtu.be/dQw4w9WgXcQ?si=abc123');
      
      const checkButton = screen.getByText('動画を確認');
      await user.click(checkButton);
      
      await waitFor(() => {
        expect(mockVideoService.getYouTubeInfo).toHaveBeenCalledWith(
          'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
        );
      });
    });

    it('正規化されたURLで動画を登録する', async () => {
      const user = userEvent.setup();
      renderWithTheme(<VideoRegistrationForm {...defaultProps} />);
      
      // URL入力からプレビューまで進む
      const urlInput = screen.getByTestId('enhanced-url-input');
      await user.type(urlInput, 'https://youtu.be/dQw4w9WgXcQ?si=abc123');
      
      const checkButton = screen.getByText('動画を確認');
      await user.click(checkButton);
      
      await waitFor(() => {
        expect(screen.getByText('詳細情報を入力')).toBeInTheDocument();
      });
      
      // 詳細情報入力画面に進む
      await user.click(screen.getByText('詳細情報を入力'));
      
      await waitFor(() => {
        expect(screen.getByText('登録')).toBeInTheDocument();
      });
      
      // 登録ボタンをクリック
      await user.click(screen.getByText('登録'));
      
      await waitFor(() => {
        expect(mockVideoService.createVideo).toHaveBeenCalledWith({
          youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          metadata: {},
          tags: []
        });
      });
    });
  });

  describe('ユーザーフレンドリーな機能', () => {
    it('対応URL形式のヒントが表示される', () => {
      renderWithTheme(<VideoRegistrationForm {...defaultProps} />);
      
      expect(screen.getByText(/対応しているURL形式:/)).toBeInTheDocument();
      expect(screen.getByText(/標準URL: https:\/\/www\.youtube\.com\/watch\?v=VIDEO_ID/)).toBeInTheDocument();
      expect(screen.getByText(/短縮URL: https:\/\/youtu\.be\/VIDEO_ID/)).toBeInTheDocument();
    });

    it('フォームリセット時に全ての状態がクリアされる', async () => {
      const user = userEvent.setup();
      renderWithTheme(<VideoRegistrationForm {...defaultProps} />);
      
      // URL入力
      const urlInput = screen.getByTestId('enhanced-url-input');
      await user.type(urlInput, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
      
      // キャンセルボタンをクリック
      await user.click(screen.getByText('キャンセル'));
      
      expect(defaultProps.onClose).toHaveBeenCalled();
    });
  });

  describe('プレビュー画面の改善', () => {
    it('正規化されたURL情報が表示される', async () => {
      const user = userEvent.setup();
      renderWithTheme(<VideoRegistrationForm {...defaultProps} />);
      
      const urlInput = screen.getByTestId('enhanced-url-input');
      await user.type(urlInput, 'https://youtu.be/dQw4w9WgXcQ?t=30');
      
      const checkButton = screen.getByText('動画を確認');
      await user.click(checkButton);
      
      await waitFor(() => {
        expect(screen.getByText(/動画ID: dQw4w9WgXcQ/)).toBeInTheDocument();
      });
    });

    it('URL正規化の成功メッセージが表示される', async () => {
      const user = userEvent.setup();
      renderWithTheme(<VideoRegistrationForm {...defaultProps} />);
      
      const urlInput = screen.getByTestId('enhanced-url-input');
      await user.type(urlInput, 'https://youtu.be/dQw4w9WgXcQ?si=abc123');
      
      const checkButton = screen.getByText('動画を確認');
      await user.click(checkButton);
      
      await waitFor(() => {
        expect(screen.getByText(/URLが正規化されました/)).toBeInTheDocument();
      });
    });
  });
});