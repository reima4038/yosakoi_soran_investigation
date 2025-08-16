import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import EvaluationPage from '../../components/evaluation/EvaluationPage';
import { evaluationService } from '../../services/evaluationService';
import { AuthContext } from '../../contexts/AuthContext';

// Mock services
jest.mock('../../services/evaluationService');
jest.mock('../../utils/logger');
jest.mock('../../utils/errorMonitoring');

const mockedEvaluationService = evaluationService as jest.Mocked<typeof evaluationService>;

// Mock react-router-dom
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => ({ sessionId: 'integration-test-session' }),
  useNavigate: () => mockNavigate,
}));

const theme = createTheme();

const mockUser = {
  id: 'user123',
  username: 'testuser',
  email: 'test@example.com',
  profile: {
    displayName: 'Integration Test User',
  },
};

const mockAuthContext = {
  user: mockUser,
  login: jest.fn(),
  logout: jest.fn(),
  isLoading: false,
  error: null,
};

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>
    <ThemeProvider theme={theme}>
      <AuthContext.Provider value={mockAuthContext}>
        {children}
      </AuthContext.Provider>
    </ThemeProvider>
  </BrowserRouter>
);

const mockCompleteEvaluationData = {
  evaluation: {
    id: 'eval123',
    sessionId: 'integration-test-session',
    userId: 'user123',
    isComplete: false,
    scores: [],
    comments: [],
    lastSavedAt: new Date('2023-01-01T00:00:00Z'),
  },
  session: {
    id: 'integration-test-session',
    name: 'Complete Integration Test Session',
    description: 'Full evaluation flow test',
    video: {
      id: 'video1',
      title: 'Integration Test Video',
      youtubeId: 'integration123',
      thumbnailUrl: 'https://example.com/integration.jpg',
    },
    template: {
      id: 'template1',
      name: 'Integration Test Template',
      description: 'Template for integration testing',
      categories: [
        {
          id: 'cat1',
          name: 'Technical Performance',
          description: 'Technical skill evaluation',
          weight: 60,
          criteria: [
            {
              id: 'crit1',
              name: 'Accuracy',
              description: 'Accuracy of performance',
              type: 'numeric',
              minValue: 1,
              maxValue: 5,
              weight: 50,
            },
            {
              id: 'crit2',
              name: 'Timing',
              description: 'Timing precision',
              type: 'numeric',
              minValue: 1,
              maxValue: 5,
              weight: 50,
            },
          ],
        },
        {
          id: 'cat2',
          name: 'Artistic Expression',
          description: 'Artistic and creative evaluation',
          weight: 40,
          criteria: [
            {
              id: 'crit3',
              name: 'Creativity',
              description: 'Creative expression',
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

describe('Complete Evaluation Flow Integration Test', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedEvaluationService.getEvaluation.mockResolvedValue(mockCompleteEvaluationData);
    mockedEvaluationService.saveScores.mockResolvedValue(mockCompleteEvaluationData.evaluation);
    mockedEvaluationService.addComment.mockResolvedValue({
      id: 'comment123',
      timestamp: 120,
      text: 'Test comment',
      createdAt: new Date(),
    });
    mockedEvaluationService.submitEvaluation.mockResolvedValue({
      ...mockCompleteEvaluationData.evaluation,
      isComplete: true,
      submittedAt: new Date(),
    });
  });

  it('should complete full evaluation workflow', async () => {
    render(
      <TestWrapper>
        <EvaluationPage />
      </TestWrapper>
    );

    // 1. Wait for page to load
    await waitFor(() => {
      expect(screen.getByText('Complete Integration Test Session')).toBeInTheDocument();
    });

    // 2. Verify initial state
    expect(screen.getByText('Integration Test Video')).toBeInTheDocument();
    expect(screen.getByText('Technical Performance')).toBeInTheDocument();
    expect(screen.getByText('Artistic Expression')).toBeInTheDocument();
    expect(screen.getByText(/進捗: 0% \(0\/3\)/)).toBeInTheDocument();

    // 3. Fill out evaluation scores
    const sliders = screen.getAllByRole('slider');
    
    // Set score for Accuracy (first slider)
    fireEvent.change(sliders[0], { target: { value: '4' } });
    
    // Set score for Timing (second slider)
    fireEvent.change(sliders[1], { target: { value: '5' } });
    
    // Set score for Creativity (third slider)
    fireEvent.change(sliders[2], { target: { value: '3' } });

    // 4. Add comments to criteria
    const commentFields = screen.getAllByPlaceholderText('コメント（任意）');
    fireEvent.change(commentFields[0], { target: { value: 'Good accuracy overall' } });
    fireEvent.change(commentFields[1], { target: { value: 'Perfect timing' } });
    fireEvent.change(commentFields[2], { target: { value: 'Creative but could be improved' } });

    // 5. Add overall comment
    const overallCommentField = screen.getByPlaceholderText('演舞全体に対する総合的なコメントをお書きください');
    fireEvent.change(overallCommentField, { target: { value: 'Overall good performance with room for improvement in creativity' } });

    // 6. Wait for auto-save to complete (mocked)
    await waitFor(() => {
      expect(screen.getByText('✓ 保存済み')).toBeInTheDocument();
    });

    // 7. Verify progress is updated
    await waitFor(() => {
      expect(screen.getByText(/進捗: 100% \(3\/3\)/)).toBeInTheDocument();
    });

    // 8. Submit evaluation
    const submitButton = screen.getByText('評価を提出');
    expect(submitButton).not.toBeDisabled();
    fireEvent.click(submitButton);

    // 9. Confirm submission in dialog
    await waitFor(() => {
      expect(screen.getByText('評価の提出')).toBeInTheDocument();
    });

    expect(screen.getByText(/進捗: 100%/)).toBeInTheDocument();
    expect(screen.getByText(/評価項目: 3\/3/)).toBeInTheDocument();

    const confirmSubmitButton = screen.getByRole('button', { name: '提出する' });
    fireEvent.click(confirmSubmitButton);

    // 10. Verify navigation to results page
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/sessions/integration-test-session/results');
    });

    // 11. Verify all service calls were made
    expect(mockedEvaluationService.getEvaluation).toHaveBeenCalledWith('integration-test-session');
    expect(mockedEvaluationService.submitEvaluation).toHaveBeenCalledWith('integration-test-session');
  });

  it('should handle partial evaluation and auto-save', async () => {
    render(
      <TestWrapper>
        <EvaluationPage />
      </TestWrapper>
    );

    // Wait for page to load
    await waitFor(() => {
      expect(screen.getByText('Complete Integration Test Session')).toBeInTheDocument();
    });

    // Fill out only some scores
    const sliders = screen.getAllByRole('slider');
    fireEvent.change(sliders[0], { target: { value: '4' } });
    fireEvent.change(sliders[1], { target: { value: '5' } });
    // Leave third slider empty

    // Verify partial progress
    await waitFor(() => {
      expect(screen.getByText(/進捗: 67% \(2\/3\)/)).toBeInTheDocument();
    });

    // Try to submit (should show warning)
    const submitButton = screen.getByText('評価を提出');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('一部の評価項目が未完了です。このまま提出してもよろしいですか？')).toBeInTheDocument();
    });

    // Cancel submission
    const cancelButton = screen.getByText('キャンセル');
    fireEvent.click(cancelButton);

    // Complete the evaluation
    fireEvent.change(sliders[2], { target: { value: '3' } });

    // Now submit should work without warning
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.queryByText('一部の評価項目が未完了です')).not.toBeInTheDocument();
    });
  });

  it('should handle timeline comments', async () => {
    render(
      <TestWrapper>
        <EvaluationPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Complete Integration Test Session')).toBeInTheDocument();
    });

    // Add timeline comment
    const addCommentButton = screen.getByText('この時点にコメント追加');
    fireEvent.click(addCommentButton);

    // Fill comment dialog
    await waitFor(() => {
      expect(screen.getByText(/タイムラインコメント追加/)).toBeInTheDocument();
    });

    const commentInput = screen.getByPlaceholderText('この時点での気づきやコメントを入力してください');
    fireEvent.change(commentInput, { target: { value: 'Great movement at this point' } });

    const addButton = screen.getByRole('button', { name: '追加' });
    fireEvent.click(addButton);

    // Verify comment was added
    await waitFor(() => {
      expect(screen.getByText(/コメント: 1件/)).toBeInTheDocument();
    });
  });

  it('should handle error recovery during evaluation flow', async () => {
    // Mock initial success, then failure, then success again
    mockedEvaluationService.getEvaluation.mockResolvedValueOnce(mockCompleteEvaluationData);
    mockedEvaluationService.saveScores
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValue(mockCompleteEvaluationData.evaluation);

    render(
      <TestWrapper>
        <EvaluationPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Complete Integration Test Session')).toBeInTheDocument();
    });

    // Fill out a score (this should trigger auto-save failure)
    const sliders = screen.getAllByRole('slider');
    fireEvent.change(sliders[0], { target: { value: '4' } });

    // Wait for auto-save error
    await waitFor(() => {
      expect(screen.getByText('⚠ 保存エラー')).toBeInTheDocument();
    }, { timeout: 35000 });

    // Manual save should work (mocked to succeed)
    const saveButton = screen.getByText('保存');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText('✓ 保存済み')).toBeInTheDocument();
    });
  });

  it('should handle session state changes during evaluation', async () => {
    // Start with active session
    render(
      <TestWrapper>
        <EvaluationPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Complete Integration Test Session')).toBeInTheDocument();
    });

    // Simulate session expiration by mocking expired session data
    const expiredSessionData = {
      ...mockCompleteEvaluationData,
      session: {
        ...mockCompleteEvaluationData.session,
        endDate: new Date('2020-01-01T00:00:00Z'), // Past date
      },
    };

    mockedEvaluationService.getEvaluation.mockResolvedValue(expiredSessionData);

    // Trigger a re-fetch (simulate periodic check)
    // This would normally happen automatically, but we'll simulate it
    const refreshButton = screen.getByText('Complete Integration Test Session');
    
    // The session state validation should detect expiration
    // and show appropriate warning
    await waitFor(() => {
      expect(screen.getByText('このセッションは期限切れです。評価の提出はできません。')).toBeInTheDocument();
    });
  });

  it('should maintain evaluation state across component re-renders', async () => {
    const { rerender } = render(
      <TestWrapper>
        <EvaluationPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Complete Integration Test Session')).toBeInTheDocument();
    });

    // Fill out some scores
    const sliders = screen.getAllByRole('slider');
    fireEvent.change(sliders[0], { target: { value: '4' } });
    fireEvent.change(sliders[1], { target: { value: '5' } });

    // Re-render component
    rerender(
      <TestWrapper>
        <EvaluationPage />
      </TestWrapper>
    );

    // Verify state is maintained
    await waitFor(() => {
      expect(screen.getByText(/進捗: 67% \(2\/3\)/)).toBeInTheDocument();
    });
  });
});