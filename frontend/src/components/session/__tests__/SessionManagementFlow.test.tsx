import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { store } from '../../../store';
import { AuthProvider, UserRole } from '../../../contexts/AuthContext';
import SessionDetailPage from '../SessionDetailPage';
import SessionEditPage from '../SessionEditPage';
import ParticipantManagementPage from '../ParticipantManagementPage';
import { sessionService } from '../../../services/sessionService';
import { Session, SessionStatus, SessionUserRole } from '../../../types';

// モックの設定
jest.mock('../../../services/sessionService');
jest.mock('../../../contexts/AuthContext', () => ({
  ...jest.requireActual('../../../contexts/AuthContext'),
  useAuth: jest.fn(),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const mockSessionService = sessionService as jest.Mocked<typeof sessionService>;
const mockUseAuth = jest.fn();

const theme = createTheme();

// テスト用のモックデータ
const mockSession: Session = {
  id: 'session-1',
  name: 'テストセッション',
  description: 'テスト用のセッションです',
  startDate: new Date('2024-01-01T10:00:00Z'),
  endDate: new Date('2024-01-31T18:00:00Z'),
  status: SessionStatus.ACTIVE,
  videoId: 'video-1',
  templateId: 'template-1',
  creatorId: 'user-1',
  participants: [
    {
      sessionId: 'session-1',
      userId: 'user-1',
      role: SessionUserRole.OWNER,
      hasSubmitted: true,
      invitedAt: new Date('2024-01-01T00:00:00Z'),
      joinedAt: new Date('2024-01-01T01:00:00Z'),
    },
    {
      sessionId: 'session-1',
      userId: 'user-2',
      role: SessionUserRole.EVALUATOR,
      hasSubmitted: false,
      invitedAt: new Date('2024-01-01T00:00:00Z'),
      joinedAt: new Date('2024-01-01T02:00:00Z'),
    },
  ],
  createdAt: new Date('2024-01-01T00:00:00Z'),
  settings: {
    isAnonymous: false,
    showResultsAfterSubmit: true,
    allowComments: true,
  },
};

const mockAdminUser = {
  id: 'admin-1',
  username: 'admin',
  email: 'admin@example.com',
  role: UserRole.ADMIN,
  profile: {
    displayName: '管理者',
  },
};

const mockEvaluatorUser = {
  id: 'user-1',
  username: 'evaluator',
  email: 'evaluator@example.com',
  role: UserRole.EVALUATOR,
  profile: {
    displayName: '評価者',
  },
};

const mockUnauthorizedUser = {
  id: 'user-3',
  username: 'user',
  email: 'user@example.com',
  role: UserRole.USER,
  profile: {
    displayName: '一般ユーザー',
  },
};

const TestWrapper: React.FC<{ 
  children: React.ReactNode;
  initialEntries?: string[];
}> = ({ children, initialEntries = ['/'] }) => (
  <Provider store={store}>
    <ThemeProvider theme={theme}>
      <MemoryRouter initialEntries={initialEntries}>
        {children}
      </MemoryRouter>
    </ThemeProvider>
  </Provider>
);

describe('セッション管理フローの統合テスト', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // useAuthのモック設定
    require('../../../contexts/AuthContext').useAuth = mockUseAuth;
    
    // デフォルトのモック設定
    mockSessionService.getSession.mockResolvedValue(mockSession);
    mockSessionService.updateSession.mockResolvedValue(mockSession);
    mockSessionService.inviteEvaluators.mockResolvedValue({ success: true });
    mockSessionService.getSessionParticipants.mockResolvedValue([]);
  });

  describe('セッション詳細 → 編集 → 保存のフロー', () => {
    test('ADMINユーザーが正常なフローでセッション編集を完了できる', async () => {
      // ADMINユーザーでログイン
      mockUseAuth.mockReturnValue({
        user: mockAdminUser,
        isAuthenticated: true,
        hasAnyRole: jest.fn().mockReturnValue(true),
      });

      // セッション詳細ページをレンダリング
      render(
        <TestWrapper initialEntries={['/sessions/session-1']}>
          <SessionDetailPage />
        </TestWrapper>
      );

      // セッション詳細が表示されるまで待機
      await waitFor(() => {
        expect(screen.getByText('テストセッション')).toBeInTheDocument();
      });

      // 編集ボタンが表示されることを確認
      const editButton = screen.getByRole('button', { name: /編集/i });
      expect(editButton).toBeInTheDocument();

      // sessionService.getSessionが呼ばれたことを確認
      expect(mockSessionService.getSession).toHaveBeenCalledWith('session-1');
    });

    test('セッション編集ページで基本情報を変更して保存できる', async () => {
      // ADMINユーザーでログイン
      mockUseAuth.mockReturnValue({
        user: mockAdminUser,
        isAuthenticated: true,
        hasAnyRole: jest.fn().mockReturnValue(true),
      });

      // セッション編集ページをレンダリング
      render(
        <TestWrapper initialEntries={['/sessions/session-1/edit']}>
          <SessionEditPage />
        </TestWrapper>
      );

      // セッション情報が読み込まれるまで待機
      await waitFor(() => {
        expect(screen.getByDisplayValue('テストセッション')).toBeInTheDocument();
      });

      // セッション名を変更
      const nameInput = screen.getByDisplayValue('テストセッション');
      fireEvent.change(nameInput, { target: { value: '更新されたセッション' } });

      // 保存ボタンをクリック
      const saveButton = screen.getByRole('button', { name: /変更を保存/i });
      fireEvent.click(saveButton);

      // updateSessionが呼ばれることを確認
      await waitFor(() => {
        expect(mockSessionService.updateSession).toHaveBeenCalledWith(
          'session-1',
          expect.objectContaining({
            name: '更新されたセッション',
          })
        );
      });
    });

    test('権限がないユーザーは編集ページでエラーが表示される', async () => {
      // 権限のないユーザーでログイン
      mockUseAuth.mockReturnValue({
        user: mockUnauthorizedUser,
        isAuthenticated: true,
        hasAnyRole: jest.fn().mockReturnValue(false),
      });

      // セッション編集ページをレンダリング
      render(
        <TestWrapper initialEntries={['/sessions/session-1/edit']}>
          <SessionEditPage />
        </TestWrapper>
      );

      // 権限エラーメッセージが表示されることを確認
      await waitFor(() => {
        expect(screen.getByText(/このセッションを編集する権限がありません/i)).toBeInTheDocument();
      });
    });
  });

  describe('セッション詳細 → 参加者管理 → 招待のフロー', () => {
    test('ADMINユーザーが正常なフローで参加者招待を完了できる', async () => {
      // ADMINユーザーでログイン
      mockUseAuth.mockReturnValue({
        user: mockAdminUser,
        isAuthenticated: true,
        hasAnyRole: jest.fn().mockReturnValue(true),
      });

      // 参加者管理ページをレンダリング
      render(
        <TestWrapper initialEntries={['/sessions/session-1/participants']}>
          <ParticipantManagementPage />
        </TestWrapper>
      );

      // ページが読み込まれるまで待機
      await waitFor(() => {
        expect(screen.getByText(/参加者管理/i)).toBeInTheDocument();
      });

      // 招待ボタンをクリック
      const inviteButton = screen.getByRole('button', { name: /招待/i });
      fireEvent.click(inviteButton);

      // 招待ダイアログが表示されることを確認
      await waitFor(() => {
        expect(screen.getByText(/参加者を招待/i)).toBeInTheDocument();
      });

      // メールアドレスを入力
      const emailInput = screen.getByLabelText(/メールアドレス/i);
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });

      // 招待送信ボタンをクリック
      const sendButton = screen.getByRole('button', { name: /招待を送信/i });
      fireEvent.click(sendButton);

      // inviteEvaluatorsが呼ばれることを確認
      await waitFor(() => {
        expect(mockSessionService.inviteEvaluators).toHaveBeenCalledWith(
          'session-1',
          ['test@example.com'],
          expect.any(String)
        );
      });
    });

    test('無効なメールアドレスでバリデーションエラーが表示される', async () => {
      // ADMINユーザーでログイン
      mockUseAuth.mockReturnValue({
        user: mockAdminUser,
        isAuthenticated: true,
        hasAnyRole: jest.fn().mockReturnValue(true),
      });

      // 参加者管理ページをレンダリング
      render(
        <TestWrapper initialEntries={['/sessions/session-1/participants']}>
          <ParticipantManagementPage />
        </TestWrapper>
      );

      // ページが読み込まれるまで待機
      await waitFor(() => {
        expect(screen.getByText(/参加者管理/i)).toBeInTheDocument();
      });

      // 招待ボタンをクリック
      const inviteButton = screen.getByRole('button', { name: /招待/i });
      fireEvent.click(inviteButton);

      // 無効なメールアドレスを入力
      const emailInput = screen.getByLabelText(/メールアドレス/i);
      fireEvent.change(emailInput, { target: { value: 'invalid-email' } });

      // 招待送信ボタンをクリック
      const sendButton = screen.getByRole('button', { name: /招待を送信/i });
      fireEvent.click(sendButton);

      // バリデーションエラーが表示されることを確認
      await waitFor(() => {
        expect(screen.getByText(/正しいメールアドレスを入力してください/i)).toBeInTheDocument();
      });

      // APIが呼ばれないことを確認
      expect(mockSessionService.inviteEvaluators).not.toHaveBeenCalled();
    });
  });

  describe('権限による表示制御のテスト', () => {
    test('ADMINユーザーは全ての機能にアクセスできる', async () => {
      // ADMINユーザーでログイン
      mockUseAuth.mockReturnValue({
        user: mockAdminUser,
        isAuthenticated: true,
        hasAnyRole: jest.fn().mockReturnValue(true),
      });

      // セッション詳細ページをレンダリング
      render(
        <TestWrapper initialEntries={['/sessions/session-1']}>
          <SessionDetailPage />
        </TestWrapper>
      );

      // セッション詳細が表示されるまで待機
      await waitFor(() => {
        expect(screen.getByText('テストセッション')).toBeInTheDocument();
      });

      // 編集ボタンが表示されることを確認
      expect(screen.getByRole('button', { name: /編集/i })).toBeInTheDocument();

      // 参加者管理ボタンが表示されることを確認（参加者タブ内）
      const participantTab = screen.getByRole('tab', { name: /参加者/i });
      fireEvent.click(participantTab);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /参加者管理/i })).toBeInTheDocument();
      });
    });

    test('EVALUATORユーザーは自分のセッションのみ編集できる', async () => {
      // セッション作成者のEVALUATORユーザーでログイン
      mockUseAuth.mockReturnValue({
        user: mockEvaluatorUser,
        isAuthenticated: true,
        hasAnyRole: jest.fn().mockReturnValue(true),
      });

      // セッション詳細ページをレンダリング
      render(
        <TestWrapper initialEntries={['/sessions/session-1']}>
          <SessionDetailPage />
        </TestWrapper>
      );

      // セッション詳細が表示されるまで待機
      await waitFor(() => {
        expect(screen.getByText('テストセッション')).toBeInTheDocument();
      });

      // 編集ボタンが表示されることを確認（作成者なので）
      expect(screen.getByRole('button', { name: /編集/i })).toBeInTheDocument();
    });

    test('一般ユーザーは編集機能にアクセスできない', async () => {
      // 一般ユーザーでログイン
      mockUseAuth.mockReturnValue({
        user: mockUnauthorizedUser,
        isAuthenticated: true,
        hasAnyRole: jest.fn().mockReturnValue(false),
      });

      // セッション詳細ページをレンダリング
      render(
        <TestWrapper initialEntries={['/sessions/session-1']}>
          <SessionDetailPage />
        </TestWrapper>
      );

      // セッション詳細が表示されるまで待機
      await waitFor(() => {
        expect(screen.getByText('テストセッション')).toBeInTheDocument();
      });

      // 編集ボタンが表示されないことを確認
      expect(screen.queryByRole('button', { name: /編集/i })).not.toBeInTheDocument();
    });

    test('他人のセッションを編集しようとするEVALUATORユーザーは権限エラーになる', async () => {
      // 他人のセッション
      const otherUserSession = {
        ...mockSession,
        creatorId: 'other-user',
      };
      mockSessionService.getSession.mockResolvedValue(otherUserSession);

      // EVALUATORユーザーでログイン（セッション作成者ではない）
      mockUseAuth.mockReturnValue({
        user: mockEvaluatorUser,
        isAuthenticated: true,
        hasAnyRole: jest.fn().mockReturnValue(true),
      });

      // セッション編集ページをレンダリング
      render(
        <TestWrapper initialEntries={['/sessions/session-1/edit']}>
          <SessionEditPage />
        </TestWrapper>
      );

      // 権限エラーメッセージが表示されることを確認
      await waitFor(() => {
        expect(screen.getByText(/このセッションを編集する権限がありません/i)).toBeInTheDocument();
      });
    });
  });
});

export {};