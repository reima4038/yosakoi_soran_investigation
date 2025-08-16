import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import EvaluationPage from '../EvaluationPage';
import { evaluationService } from '../../../services/evaluationService';
import { AuthContext } from '../../../contexts/AuthContext';

// Mock services
jest.mock('../../../services/evaluationService');
jest.mock('../../../utils/logger');
jest.mock('../../../utils/errorMonitoring');

const mockedEvaluationService = evaluationService as jest.Mocked<typeof evaluationService>;

// Mock react-router-dom
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => ({ sessionId: 'test-session-id' }),
  useNavigate: () => mockNavigate,
}));

// Test theme
const theme = createTheme();

// Mock user context
const mockUser = {
  id: 'user123',
  username: 'testuser',
  email: 'test@example.com',
  profile: {
    displayName: 'Test User',
  },
};

const mockAuthContext = {
  user: mockUser,
  login: jest.fn(),
  logout: jest.fn(),
  isLoading: false,
  error: null,
};

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>
    <ThemeProvider theme={theme}>
      <AuthContext.Provider value={mockAuthContext}>
        {children}
      </AuthContext.Provider>
    </ThemeProvider>
  </BrowserRouter>
);

// Mock evaluation data
const mockEvaluationData = {
  evaluation: {
    id: 'eval123',
    sessionId: 'test-session-id',
    userId: 'user123',
    isComplete: false,
    scores: [
      {
        criterionId: 'crit1',
        score: 4,
        comment: 'Good performance',
      },
    ],
    comments: [
      {
        id: 'comment1',
        timestamp: 120,
        text: 'Great timing here',
        createdAt: new Date('2023-01-01T00:00:00Z'),
      },
    ],
    lastSavedAt: new Date('2023-01-01T00:00:00Z'),
  },
  session: {
    id: 'test-session-id',
    name: 'Test Evaluation Session',
    description: 'Test session description',
    video: {
      id: 'video1',
      title: 'Test Video',
      youtubeId: 'test123',
      thumbnailUrl: 'https://example.com/thumb.jpg',
    },
    template: {
      id: 'template1',
      name: 'Test Template',
      description: 'Test template description',
      categories: [
        {
          id: 'cat1',
          name: 'Performance',
          description: 'Performance evaluation',
          weight: 50,
          criteria: [
            {
              id: 'crit1',
              name: 'Technical Skills',
              description: 'Technical skill evaluation',
              type: 'numeric',
              minValue: 1,
              maxValue: 5,
              weight: 100,
            },
          ],
        },
      ],
    },
    endDate: new Date('2024-12-31T23:59:59Z'),
  },
};

describe('EvaluationPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Loading State', () => {
    it('should show loading indicator while fetching data', async () => {
      // Mock a delayed response
      mockedEvaluationService.getEvaluation.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockEvaluationData), 100))
      );

      render(
        <TestWrapper>
          <EvaluationPage />
        </TestWrapper>
      );

      expect(screen.getByText('評価画面を読み込み中...')).toBeInTheDocument();
      expect(screen.getByText('セッション情報とテンプレートを取得しています')).toBeInTheDocument();

      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.getByText('Test Evaluation Session')).toBeInTheDocument();
      });
    });

    it('should show retry count during retry attempts', async () => {
      // Mock first call to fail, second to succeed
      mockedEvaluationService.getEvaluation
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(mockEvaluationData);

      render(
        <TestWrapper>
          <EvaluationPage />
        </TestWrapper>
      );

      // Wait for error state
      await waitFor(() => {
        expect(screen.getByText(/ネットワークエラー/)).toBeInTheDocument();
      });

      // Click retry button
      const retryButton = screen.getByText('再試行');
      fireEvent.click(retryButton);

      // Should show retry loading state
      await waitFor(() => {
        expect(screen.getByText(/再試行中... \(1回目\)/)).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should display 404 error with appropriate message', async () => {
      const error404 = {
        response: {
          status: 404,
          data: {
            status: 'error',
            message: 'セッションが見つかりません',
          },
        },
      };

      mockedEvaluationService.getEvaluation.mockRejectedValue(error404);

      render(
        <TestWrapper>
          <EvaluationPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('セッションが見つかりません')).toBeInTheDocument();
        expect(screen.getByText('セッション一覧')).toBeInTheDocument();
        expect(screen.getByText('ダッシュボード')).toBeInTheDocument();
      });
    });

    it('should display 403 error with appropriate message', async () => {
      const error403 = {
        response: {
          status: 403,
          data: {
            status: 'error',
            message: 'このセッションの評価権限がありません',
          },
        },
      };

      mockedEvaluationService.getEvaluation.mockRejectedValue(error403);

      render(
        <TestWrapper>
          <EvaluationPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('評価権限がありません')).toBeInTheDocument();
        expect(screen.getByText(/このセッションの評価権限がありません/)).toBeInTheDocument();
      });
    });

    it('should display network error with retry option', async () => {
      const networkError = new Error('Network Error');
      networkError.code = 'NETWORK_ERROR';

      mockedEvaluationService.getEvaluation.mockRejectedValue(networkError);

      render(
        <TestWrapper>
          <EvaluationPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('ネットワークエラー')).toBeInTheDocument();
        expect(screen.getByText('再試行')).toBeInTheDocument();
      });
    });

    it('should handle retry functionality', async () => {
      // First call fails, second succeeds
      mockedEvaluationService.getEvaluation
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(mockEvaluationData);

      render(
        <TestWrapper>
          <EvaluationPage />
        </TestWrapper>
      );

      // Wait for error state
      await waitFor(() => {
        expect(screen.getByText(/予期しないエラー/)).toBeInTheDocument();
      });

      // Click retry
      const retryButton = screen.getByText('再試行');
      fireEvent.click(retryButton);

      // Should eventually show the evaluation page
      await waitFor(() => {
        expect(screen.getByText('Test Evaluation Session')).toBeInTheDocument();
      });

      expect(mockedEvaluationService.getEvaluation).toHaveBeenCalledTimes(2);
    });
  });

  describe('Successful Data Loading', () => {
    beforeEach(() => {
      mockedEvaluationService.getEvaluation.mockResolvedValue(mockEvaluationData);
    });

    it('should display session information correctly', async () => {
      render(
        <TestWrapper>
          <EvaluationPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Test Evaluation Session')).toBeInTheDocument();
        expect(screen.getByText('Test Video')).toBeInTheDocument();
        expect(screen.getByText(/評価者: Test User/)).toBeInTheDocument();
      });
    });

    it('should display evaluation form with criteria', async () => {
      render(
        <TestWrapper>
          <EvaluationPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Performance')).toBeInTheDocument();
        expect(screen.getByText('Technical Skills')).toBeInTheDocument();
        expect(screen.getByText('Technical skill evaluation')).toBeInTheDocument();
      });
    });

    it('should show progress information', async () => {
      render(
        <TestWrapper>
          <EvaluationPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/進捗: 100% \(1\/1\)/)).toBeInTheDocument();
      });
    });

    it('should display session status', async () => {
      render(
        <TestWrapper>
          <EvaluationPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/状態: 不明/)).toBeInTheDocument(); // Since status is not set in mock
      });
    });
  });

  describe('Auto-save Functionality', () => {
    beforeEach(() => {
      mockedEvaluationService.getEvaluation.mockResolvedValue(mockEvaluationData);
      mockedEvaluationService.saveScores.mockResolvedValue(mockEvaluationData.evaluation);
    });

    it('should show auto-save status', async () => {
      render(
        <TestWrapper>
          <EvaluationPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('✓ 保存済み')).toBeInTheDocument();
      });
    });

    it('should handle auto-save errors', async () => {
      mockedEvaluationService.saveScores.mockRejectedValue(new Error('Save failed'));

      render(
        <TestWrapper>
          <EvaluationPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Test Evaluation Session')).toBeInTheDocument();
      });

      // Trigger auto-save by changing a score
      const slider = screen.getByRole('slider');
      fireEvent.change(slider, { target: { value: '3' } });

      // Auto-save should eventually show error status
      await waitFor(() => {
        expect(screen.getByText('⚠ 保存エラー')).toBeInTheDocument();
      }, { timeout: 35000 }); // Auto-save runs every 30 seconds
    });
  });

  describe('Evaluation Submission', () => {
    beforeEach(() => {
      mockedEvaluationService.getEvaluation.mockResolvedValue(mockEvaluationData);
      mockedEvaluationService.submitEvaluation.mockResolvedValue({
        ...mockEvaluationData.evaluation,
        isComplete: true,
        submittedAt: new Date(),
      });
    });

    it('should enable submit button when evaluation is complete', async () => {
      render(
        <TestWrapper>
          <EvaluationPage />
        </TestWrapper>
      );

      await waitFor(() => {
        const submitButton = screen.getByText('評価を提出');
        expect(submitButton).not.toBeDisabled();
      });
    });

    it('should show submission confirmation dialog', async () => {
      render(
        <TestWrapper>
          <EvaluationPage />
        </TestWrapper>
      );

      await waitFor(() => {
        const submitButton = screen.getByText('評価を提出');
        fireEvent.click(submitButton);
      });

      expect(screen.getByText('評価の提出')).toBeInTheDocument();
      expect(screen.getByText('評価を提出しますか？提出後は内容を変更できません。')).toBeInTheDocument();
    });

    it('should handle successful submission', async () => {
      render(
        <TestWrapper>
          <EvaluationPage />
        </TestWrapper>
      );

      await waitFor(() => {
        const submitButton = screen.getByText('評価を提出');
        fireEvent.click(submitButton);
      });

      const confirmButton = screen.getByRole('button', { name: '提出する' });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/sessions/test-session-id/results');
      });
    });

    it('should handle submission errors', async () => {
      const submissionError = {
        response: {
          status: 400,
          data: {
            status: 'error',
            message: 'すべての評価項目を入力してください',
          },
        },
      };

      mockedEvaluationService.submitEvaluation.mockRejectedValue(submissionError);

      render(
        <TestWrapper>
          <EvaluationPage />
        </TestWrapper>
      );

      await waitFor(() => {
        const submitButton = screen.getByText('評価を提出');
        fireEvent.click(submitButton);
      });

      const confirmButton = screen.getByRole('button', { name: '提出する' });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(screen.getByText(/すべての評価項目を入力してください/)).toBeInTheDocument();
      });
    });
  });

  describe('Session State Validation', () => {
    it('should show warning for expired sessions', async () => {
      const expiredSessionData = {
        ...mockEvaluationData,
        session: {
          ...mockEvaluationData.session,
          endDate: new Date('2020-01-01T00:00:00Z'), // Past date
        },
      };

      mockedEvaluationService.getEvaluation.mockResolvedValue(expiredSessionData);

      render(
        <TestWrapper>
          <EvaluationPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('このセッションは期限切れです。評価の提出はできません。')).toBeInTheDocument();
      });
    });

    it('should show success message for submitted evaluations', async () => {
      const submittedEvaluationData = {
        ...mockEvaluationData,
        evaluation: {
          ...mockEvaluationData.evaluation,
          isComplete: true,
          submittedAt: new Date('2023-01-01T00:00:00Z'),
        },
      };

      mockedEvaluationService.getEvaluation.mockResolvedValue(submittedEvaluationData);

      render(
        <TestWrapper>
          <EvaluationPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('評価は既に提出済みです。内容の変更はできません。')).toBeInTheDocument();
      });
    });
  });

  describe('Keyboard Shortcuts', () => {
    beforeEach(() => {
      mockedEvaluationService.getEvaluation.mockResolvedValue(mockEvaluationData);
    });

    it('should open diagnostic panel with Ctrl+Shift+D', async () => {
      render(
        <TestWrapper>
          <EvaluationPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Test Evaluation Session')).toBeInTheDocument();
      });

      // Simulate Ctrl+Shift+D
      fireEvent.keyDown(window, {
        key: 'D',
        ctrlKey: true,
        shiftKey: true,
      });

      await waitFor(() => {
        expect(screen.getByText('診断パネル')).toBeInTheDocument();
      });
    });
  });
});