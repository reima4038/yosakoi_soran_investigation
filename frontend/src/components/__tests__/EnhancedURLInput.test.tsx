import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import EnhancedURLInput from '../common/EnhancedURLInput';

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

// クリップボードAPIのモック
Object.assign(navigator, {
  clipboard: {
    readText: jest.fn(),
  },
});

describe('EnhancedURLInput', () => {
  const defaultProps = {
    value: '',
    onChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render with default props', () => {
    renderWithTheme(<EnhancedURLInput {...defaultProps} />);
    
    expect(screen.getByLabelText('YouTube URL')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('https://www.youtube.com/watch?v=...')).toBeInTheDocument();
  });

  it('should call onChange when input value changes', async () => {
    const onChange = jest.fn();
    
    renderWithTheme(<EnhancedURLInput {...defaultProps} onChange={onChange} />);
    
    const input = screen.getByLabelText('YouTube URL');
    fireEvent.change(input, { target: { value: 'test-url' } });
    
    expect(onChange).toHaveBeenCalledWith('test-url');
  });

  it('should show validation status for valid URL', async () => {
    renderWithTheme(<EnhancedURLInput {...defaultProps} debounceDelay={100} />);
    
    const input = screen.getByLabelText('YouTube URL');
    fireEvent.change(input, { target: { value: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' } });
    
    act(() => {
      jest.advanceTimersByTime(100);
    });

    await waitFor(() => {
      expect(screen.getByText('✓ 有効なYouTube URL')).toBeInTheDocument();
    });
  });

  it('should show error message for invalid URL', async () => {
    renderWithTheme(<EnhancedURLInput {...defaultProps} debounceDelay={100} />);
    
    const input = screen.getByLabelText('YouTube URL');
    fireEvent.change(input, { target: { value: 'https://vimeo.com/123456' } });
    
    act(() => {
      jest.advanceTimersByTime(100);
    });

    await waitFor(() => {
      expect(screen.getByText('YouTube以外のURLは登録できません')).toBeInTheDocument();
    });
  });

  it('should call onValidURL when valid URL is entered', async () => {
    const onValidURL = jest.fn();
    
    renderWithTheme(
      <EnhancedURLInput {...defaultProps} onValidURL={onValidURL} debounceDelay={100} />
    );
    
    const input = screen.getByLabelText('YouTube URL');
    fireEvent.change(input, { target: { value: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' } });
    
    act(() => {
      jest.advanceTimersByTime(100);
    });

    await waitFor(() => {
      expect(onValidURL).toHaveBeenCalledWith(
        expect.objectContaining({
          videoId: 'dQw4w9WgXcQ',
          canonical: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
        })
      );
    });
  });

  it('should call onInvalidURL when invalid URL is entered', async () => {
    const onInvalidURL = jest.fn();
    
    renderWithTheme(
      <EnhancedURLInput {...defaultProps} onInvalidURL={onInvalidURL} debounceDelay={100} />
    );
    
    const input = screen.getByLabelText('YouTube URL');
    fireEvent.change(input, { target: { value: 'https://vimeo.com/123456' } });
    
    act(() => {
      jest.advanceTimersByTime(100);
    });

    await waitFor(() => {
      expect(onInvalidURL).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'NOT_YOUTUBE',
          message: 'YouTube以外のURLは登録できません'
        })
      );
    });
  });

  it('should handle custom label and placeholder', () => {
    renderWithTheme(
      <EnhancedURLInput 
        {...defaultProps} 
        label="カスタムラベル"
        placeholder="カスタムプレースホルダー"
      />
    );
    
    expect(screen.getByLabelText('カスタムラベル')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('カスタムプレースホルダー')).toBeInTheDocument();
  });

  it('should handle disabled state', () => {
    renderWithTheme(<EnhancedURLInput {...defaultProps} disabled={true} />);
    
    const input = screen.getByLabelText('YouTube URL');
    expect(input).toBeDisabled();
  });

  it('should handle external error state', () => {
    renderWithTheme(
      <EnhancedURLInput {...defaultProps} error={true} helperText="外部エラー" />
    );
    
    expect(screen.getByText('外部エラー')).toBeInTheDocument();
  });

  it('should handle required field', () => {
    renderWithTheme(<EnhancedURLInput {...defaultProps} required={true} />);
    
    const input = screen.getByLabelText('YouTube URL *');
    expect(input).toBeRequired();
  });
});