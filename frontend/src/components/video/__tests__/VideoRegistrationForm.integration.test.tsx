/**
 * VideoRegistrationForm 統合テスト
 * EnhancedURLInput統合後の基本動作を検証
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
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

// 基本的なモック設定
jest.mock('../../../services/videoService', () => ({
  videoService: {
    getYouTubeInfo: jest.fn().mockResolvedValue({
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
    }),
    createVideo: jest.fn().mockResolvedValue({ id: '1' }),
  },
}));

jest.mock('../../common/EnhancedURLInput', () => {
  return function MockEnhancedURLInput(props: any) {
    return (
      <div data-testid="enhanced-url-input">
        <input
          value={props.value}
          onChange={(e) => props.onChange(e.target.value)}
          placeholder={props.placeholder}
        />
        <div>Mock EnhancedURLInput</div>
      </div>
    );
  };
});

describe('VideoRegistrationForm Integration', () => {
  const defaultProps = {
    open: true,
    onClose: jest.fn(),
    onSuccess: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('コンポーネントが正常にレンダリングされる', () => {
    renderWithTheme(<VideoRegistrationForm {...defaultProps} />);
    
    expect(screen.getByText('動画登録')).toBeInTheDocument();
    expect(screen.getByTestId('enhanced-url-input')).toBeInTheDocument();
    expect(screen.getByText('Mock EnhancedURLInput')).toBeInTheDocument();
  });

  it('初期状態で動画確認ボタンが無効になっている', () => {
    renderWithTheme(<VideoRegistrationForm {...defaultProps} />);
    
    const checkButton = screen.getByText('動画を確認');
    expect(checkButton).toBeDisabled();
  });

  it('キャンセルボタンが表示される', () => {
    renderWithTheme(<VideoRegistrationForm {...defaultProps} />);
    
    expect(screen.getByText('キャンセル')).toBeInTheDocument();
  });

  it('対応URL形式のヒントが表示される', () => {
    renderWithTheme(<VideoRegistrationForm {...defaultProps} />);
    
    expect(screen.getByText(/対応しているURL形式:/)).toBeInTheDocument();
    expect(screen.getByText(/標準URL:/)).toBeInTheDocument();
    expect(screen.getByText(/短縮URL:/)).toBeInTheDocument();
  });

  it('ダイアログが閉じている時は表示されない', () => {
    renderWithTheme(<VideoRegistrationForm {...defaultProps} open={false} />);
    
    expect(screen.queryByText('動画登録')).not.toBeInTheDocument();
  });
});