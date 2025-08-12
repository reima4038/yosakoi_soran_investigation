import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { store } from '../../../store';
import { AuthProvider, UserRole } from '../../../contexts/AuthContext';
import SessionDetailPage from '../SessionDetailPage';
import SessionList from '../SessionList';
import SessionEditPage from '../SessionEditPage';
import ParticipantManagementPage from '../ParticipantManagementPage';
import { sessionService } from '../../../services/sessionService';

// モックの設定
jest.mock('../../../services/sessionService');
jest.mock('../../../contexts/AuthContext', () => ({
  ...jest.requireActual('../../../contexts/AuthContext'),
  useAuth: jest.fn(),
  AuthProvider: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

const mockSessionService = sessionService as jest.Mocked<typeof sessionService>;
const mockUseAuth = jest.fn();

const theme = createTheme();

const mockAdminUser = {
  id: 'admin-1',
  username: 'admin',
  email: 'admin@example.com',
  role: UserRole.ADMIN,
  profile: {
    displayName: '管理者',
  },
};

const TestWrapper: React.FC<{
  children: React.ReactNode;
  initialEntries?: string[];
}> = ({ children, initialEntries = ['/'] }) => (
  <Provider store={store}>
    <ThemeProvider theme={theme}>
      <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>
    </ThemeProvider>
  </Provider>
);

describe('セッション管理のエラーハンドリングテスト', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // useAuthのモック設定
    require('../../../contexts/AuthContext').useAuth = mockUseAuth;

    // デフォルトでADMINユーザーでログイン
    mockUseAuth.mockReturnValue({
      user: mockAdminUser,
      isAuthenticated: true,
      hasAnyRole: jest.fn().mockReturnValue(true),
    });
  });

  describe('存在しないセッションへのアクセステスト', () => {
    test('404エラーが適切に表示される', async () => {
      // 404エラーを返すようにモックを設定
      const notFoundError = new Error('Session not found');
      (notFoundError as any).response = { status: 404 };
      mockSessionService.getSession.mockRejectedValue(notFoundError);

      // セッション詳細ページをレンダリング
      render(
        <TestWrapper initialEntries={['/sessions/non-existent-session']}>
          <SessionDetailPage />
        </TestWrapper>
      );

      // 404エラーメッセージが表示されることを確認
      await waitFor(() => {
        expect(
          screen.getByText(/指定されたセッション.*が見つかりません/i)
        ).toBeInTheDocument();
      });

      // セッション一覧に戻るボタンが表示されることを確認
      expect(
        screen.getByRole('button', { name: /セッション一覧に戻る/i })
      ).toBeInTheDocument();
    });

    test('404エラー時に適切なナビゲーションオプションが表示される', async () => {
      // 404エラーを返すようにモックを設定
      const notFoundError = new Error('Session not found');
      (notFoundError as any).response = { status: 404 };
      mockSessionService.getSession.mockRejectedValue(notFoundError);

      // セッション詳細ページをレンダリング
      render(
        <TestWrapper initialEntries={['/sessions/non-existent-session']}>
          <SessionDetailPage />
        </TestWrapper>
      );

      // エラーメッセージとナビゲーションボタンが表示されることを確認
      await waitFor(() => {
        expect(
          screen.getByText(/指定されたセッション.*が見つかりません/i)
        ).toBeInTheDocument();
      });

      // 複数のナビゲーションオプションが表示されることを確認
      expect(
        screen.getByRole('button', { name: /セッション一覧に戻る/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /ダッシュボードに戻る/i })
      ).toBeInTheDocument();
    });

    test('編集ページで存在しないセッションにアクセスした場合のエラー処理', async () => {
      // 404エラーを返すようにモックを設定
      const notFoundError = new Error('Session not found');
      (notFoundError as any).response = { status: 404 };
      mockSessionService.getSession.mockRejectedValue(notFoundError);

      // セッション編集ページをレンダリング
      render(
        <TestWrapper initialEntries={['/sessions/non-existent-session/edit']}>
          <SessionEditPage />
        </TestWrapper>
      );

      // エラーメッセージが表示されることを確認
      await waitFor(() => {
        expect(
          screen.getByText(/セッション.*取得.*エラー/i)
        ).toBeInTheDocument();
      });

      // ナビゲーションボタンが表示されることを確認
      expect(
        screen.getByRole('button', { name: /セッション一覧に戻る/i })
      ).toBeInTheDocument();
    });
  });

  describe('権限がないユーザーのアクセステスト', () => {
    test('403エラーが適切に表示される', async () => {
      // 403エラーを返すようにモックを設定
      const forbiddenError = new Error('Forbidden');
      (forbiddenError as any).response = { status: 403 };
      mockSessionService.getSession.mockRejectedValue(forbiddenError);

      // セッション詳細ページをレンダリング
      render(
        <TestWrapper initialEntries={['/sessions/session-1']}>
          <SessionDetailPage />
        </TestWrapper>
      );

      // 403エラーメッセージが表示されることを確認
      await waitFor(() => {
        expect(
          screen.getByText(/アクセス権限がありません/i)
        ).toBeInTheDocument();
      });
    });

    test('権限エラー時に詳細な説明が表示される', async () => {
      // 権限のないユーザーでログイン
      mockUseAuth.mockReturnValue({
        user: {
          id: 'user-1',
          username: 'user',
          email: 'user@example.com',
          role: UserRole.USER,
          profile: { displayName: '一般ユーザー' },
        },
        isAuthenticated: true,
        hasAnyRole: jest.fn().mockReturnValue(false),
      });

      // セッション編集ページをレンダリング
      render(
        <TestWrapper initialEntries={['/sessions/session-1/edit']}>
          <SessionEditPage />
        </TestWrapper>
      );

      // 権限エラーメッセージと詳細説明が表示されることを確認
      await waitFor(() => {
        expect(
          screen.getByText(/このセッションを編集する権限がありません/i)
        ).toBeInTheDocument();
      });
    });

    test('参加者管理ページで権限がない場合のエラー処理', async () => {
      // 権限のないユーザーでログイン
      mockUseAuth.mockReturnValue({
        user: {
          id: 'user-1',
          username: 'user',
          email: 'user@example.com',
          role: UserRole.USER,
          profile: { displayName: '一般ユーザー' },
        },
        isAuthenticated: true,
        hasAnyRole: jest.fn().mockReturnValue(false),
      });

      // 参加者管理ページをレンダリング
      render(
        <TestWrapper initialEntries={['/sessions/session-1/participants']}>
          <ParticipantManagementPage />
        </TestWrapper>
      );

      // 権限エラーメッセージが表示されることを確認
      await waitFor(() => {
        expect(
          screen.getByText(/参加者を管理する権限がありません/i)
        ).toBeInTheDocument();
      });
    });
  });

  describe('ネットワークエラー時の動作テスト', () => {
    test('ネットワークエラーが適切に表示される', async () => {
      // ネットワークエラーを返すようにモックを設定
      const networkError = new Error('Network Error');
      (networkError as any).code = 'NETWORK_ERROR';
      mockSessionService.getSession.mockRejectedValue(networkError);

      // セッション詳細ページをレンダリング
      render(
        <TestWrapper initialEntries={['/sessions/session-1']}>
          <SessionDetailPage />
        </TestWrapper>
      );

      // ネットワークエラーメッセージが表示されることを確認
      await waitFor(() => {
        expect(screen.getByText(/ネットワークエラー/i)).toBeInTheDocument();
      });
    });

    test('ネットワークエラー時に再試行ボタンが表示される', async () => {
      // ネットワークエラーを返すようにモックを設定
      const networkError = new Error('Network Error');
      (networkError as any).code = 'NETWORK_ERROR';
      mockSessionService.getSession.mockRejectedValue(networkError);

      // セッション詳細ページをレンダリング
      render(
        <TestWrapper initialEntries={['/sessions/session-1']}>
          <SessionDetailPage />
        </TestWrapper>
      );

      // 再試行ボタンが表示されることを確認
      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /再試行/i })
        ).toBeInTheDocument();
      });
    });

    test('再試行ボタンクリックで再度APIが呼ばれる', async () => {
      // 最初はネットワークエラー、2回目は成功するようにモックを設定
      const networkError = new Error('Network Error');
      (networkError as any).code = 'NETWORK_ERROR';

      mockSessionService.getSession
        .mockRejectedValueOnce(networkError)
        .mockResolvedValueOnce({
          id: 'session-1',
          name: 'テストセッション',
          description: 'テスト用のセッション',
          startDate: new Date('2024-01-01T10:00:00Z'),
          endDate: new Date('2024-01-31T18:00:00Z'),
          status: 'active' as any,
          videoId: 'video-1',
          templateId: 'template-1',
          creatorId: 'user-1',
          participants: [],
          createdAt: new Date('2024-01-01T00:00:00Z'),
          settings: {
            isAnonymous: false,
            showResultsAfterSubmit: true,
            allowComments: true,
          },
        });

      // セッション詳細ページをレンダリング
      render(
        <TestWrapper initialEntries={['/sessions/session-1']}>
          <SessionDetailPage />
        </TestWrapper>
      );

      // エラーメッセージと再試行ボタンが表示されることを確認
      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /再試行/i })
        ).toBeInTheDocument();
      });

      // 再試行ボタンをクリック
      const retryButton = screen.getByRole('button', { name: /再試行/i });
      fireEvent.click(retryButton);

      // APIが再度呼ばれることを確認
      await waitFor(() => {
        expect(mockSessionService.getSession).toHaveBeenCalledTimes(2);
      });

      // 成功後にセッション名が表示されることを確認
      await waitFor(() => {
        expect(screen.getByText('テストセッション')).toBeInTheDocument();
      });
    });

    test('セッション更新時のネットワークエラー処理', async () => {
      // 最初の取得は成功、更新時にネットワークエラー
      mockSessionService.getSession.mockResolvedValue({
        id: 'session-1',
        name: 'テストセッション',
        description: 'テスト用のセッション',
        startDate: new Date('2024-01-01T10:00:00Z'),
        endDate: new Date('2024-01-31T18:00:00Z'),
        status: 'active' as any,
        videoId: 'video-1',
        templateId: 'template-1',
        creatorId: 'admin-1',
        participants: [],
        createdAt: new Date('2024-01-01T00:00:00Z'),
        settings: {
          isAnonymous: false,
          showResultsAfterSubmit: true,
          allowComments: true,
        },
      });

      const networkError = new Error('Network Error');
      (networkError as any).code = 'NETWORK_ERROR';
      mockSessionService.updateSession.mockRejectedValue(networkError);

      // セッション編集ページをレンダリング
      render(
        <TestWrapper initialEntries={['/sessions/session-1/edit']}>
          <SessionEditPage />
        </TestWrapper>
      );

      // セッション情報が読み込まれるまで待機
      await waitFor(() => {
        expect(
          screen.getByDisplayValue('テストセッション')
        ).toBeInTheDocument();
      });

      // セッション名を変更
      const nameInput = screen.getByDisplayValue('テストセッション');
      fireEvent.change(nameInput, {
        target: { value: '更新されたセッション' },
      });

      // 保存ボタンをクリック
      const saveButton = screen.getByRole('button', { name: /変更を保存/i });
      fireEvent.click(saveButton);

      // ネットワークエラーメッセージが表示されることを確認
      await waitFor(() => {
        expect(screen.getByText(/ネットワークエラー/i)).toBeInTheDocument();
      });
    });
  });

  describe('サーバーエラー時の動作テスト', () => {
    test('500エラーが適切に表示される', async () => {
      // 500エラーを返すようにモックを設定
      const serverError = new Error('Internal Server Error');
      (serverError as any).response = { status: 500 };
      mockSessionService.getSession.mockRejectedValue(serverError);

      // セッション詳細ページをレンダリング
      render(
        <TestWrapper initialEntries={['/sessions/session-1']}>
          <SessionDetailPage />
        </TestWrapper>
      );

      // サーバーエラーメッセージが表示されることを確認
      await waitFor(() => {
        expect(screen.getByText(/サーバーエラー/i)).toBeInTheDocument();
      });
    });

    test('サーバーエラー時に適切なメッセージが表示される', async () => {
      // 500エラーを返すようにモックを設定
      const serverError = new Error('Internal Server Error');
      (serverError as any).response = { status: 500 };
      mockSessionService.getSession.mockRejectedValue(serverError);

      // セッション詳細ページをレンダリング
      render(
        <TestWrapper initialEntries={['/sessions/session-1']}>
          <SessionDetailPage />
        </TestWrapper>
      );

      // 詳細なエラーメッセージが表示されることを確認
      await waitFor(() => {
        expect(
          screen.getByText(/サーバーで問題が発生しました/i)
        ).toBeInTheDocument();
      });
    });

    test('参加者招待時のサーバーエラー処理', async () => {
      // セッション取得は成功、招待時にサーバーエラー
      mockSessionService.getSession.mockResolvedValue({
        id: 'session-1',
        name: 'テストセッション',
        description: 'テスト用のセッション',
        startDate: new Date('2024-01-01T10:00:00Z'),
        endDate: new Date('2024-01-31T18:00:00Z'),
        status: 'active' as any,
        videoId: 'video-1',
        templateId: 'template-1',
        creatorId: 'admin-1',
        participants: [],
        createdAt: new Date('2024-01-01T00:00:00Z'),
        settings: {
          isAnonymous: false,
          showResultsAfterSubmit: true,
          allowComments: true,
        },
      });

      mockSessionService.getSessionParticipants.mockResolvedValue([]);

      const serverError = new Error('Internal Server Error');
      (serverError as any).response = { status: 500 };
      mockSessionService.inviteEvaluators.mockRejectedValue(serverError);

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

      // メールアドレスを入力
      const emailInput = screen.getByLabelText(/メールアドレス/i);
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });

      // 招待送信ボタンをクリック
      const sendButton = screen.getByRole('button', { name: /招待を送信/i });
      fireEvent.click(sendButton);

      // サーバーエラーメッセージが表示されることを確認
      await waitFor(() => {
        expect(screen.getByText(/サーバーエラー/i)).toBeInTheDocument();
      });
    });
  });

  describe('データ整合性エラーのテスト', () => {
    test('不正なセッションデータでのエラー処理', async () => {
      // 不正なデータを返すようにモックを設定
      mockSessionService.getSession.mockResolvedValue(null as any);

      // セッション詳細ページをレンダリング
      render(
        <TestWrapper initialEntries={['/sessions/session-1']}>
          <SessionDetailPage />
        </TestWrapper>
      );

      // データエラーメッセージが表示されることを確認
      await waitFor(() => {
        expect(
          screen.getByText(/セッションデータが見つかりません/i)
        ).toBeInTheDocument();
      });
    });

    test('無効な日付データでのエラー処理', async () => {
      // 無効な日付データを含むセッションデータを返すようにモックを設定
      mockSessionService.getSession.mockResolvedValue({
        id: 'session-1',
        name: 'テストセッション',
        description: 'テスト用のセッション',
        startDate: 'invalid-date' as any,
        endDate: null as any,
        status: 'active' as any,
        videoId: 'video-1',
        templateId: 'template-1',
        creatorId: 'admin-1',
        participants: [],
        createdAt: undefined as any,
        settings: {
          isAnonymous: false,
          showResultsAfterSubmit: true,
          allowComments: true,
        },
      });

      // セッション詳細ページをレンダリング
      render(
        <TestWrapper initialEntries={['/sessions/session-1']}>
          <SessionDetailPage />
        </TestWrapper>
      );

      // セッション名は表示されるが、日付エラーは適切に処理されることを確認
      await waitFor(() => {
        expect(screen.getByText('テストセッション')).toBeInTheDocument();
      });

      // 無効な日付が適切に処理されることを確認
      expect(
        screen.getByText(/未設定|無効な日付|日付エラー/)
      ).toBeInTheDocument();
    });

    test('参加者データに無効な日付が含まれる場合のエラー処理', async () => {
      // 参加者データに無効な日付を含むセッションデータを返すようにモックを設定
      mockSessionService.getSession.mockResolvedValue({
        id: 'session-1',
        name: 'テストセッション',
        description: 'テスト用のセッション',
        startDate: new Date('2024-01-01T10:00:00Z'),
        endDate: new Date('2024-01-31T18:00:00Z'),
        status: 'active' as any,
        videoId: 'video-1',
        templateId: 'template-1',
        creatorId: 'admin-1',
        participants: [],
        createdAt: new Date('2024-01-01T00:00:00Z'),
        settings: {
          isAnonymous: false,
          showResultsAfterSubmit: true,
          allowComments: true,
        },
        participantDetails: [
          {
            id: 'participant-1',
            name: 'テスト参加者',
            email: 'participant@example.com',
            role: 'evaluator',
            hasSubmitted: false,
            invitedAt: 'invalid-date' as any,
            joinedAt: null as any,
          },
        ],
      } as any);

      // セッション詳細ページをレンダリング
      render(
        <TestWrapper initialEntries={['/sessions/session-1']}>
          <SessionDetailPage />
        </TestWrapper>
      );

      // セッション名は表示されることを確認
      await waitFor(() => {
        expect(screen.getByText('テストセッション')).toBeInTheDocument();
      });

      // 参加者タブをクリック
      const participantTab = screen.getByRole('tab', { name: /参加者/i });
      fireEvent.click(participantTab);

      // 参加者情報が表示され、無効な日付が適切に処理されることを確認
      await waitFor(() => {
        expect(screen.getByText('テスト参加者')).toBeInTheDocument();
        expect(
          screen.getByText(/未設定|無効な日付|日付エラー/)
        ).toBeInTheDocument();
      });
    });

    test('セッション一覧でのエラー処理', async () => {
      // セッション一覧取得でエラー
      const listError = new Error('Failed to fetch sessions');
      mockSessionService.getSessions.mockRejectedValue(listError);

      // セッション一覧ページをレンダリング
      render(
        <TestWrapper initialEntries={['/sessions']}>
          <SessionList />
        </TestWrapper>
      );

      // エラーメッセージが表示されることを確認
      await waitFor(() => {
        expect(
          screen.getByText(/セッション一覧の取得に失敗しました/i)
        ).toBeInTheDocument();
      });
    });
  });
});

export {};
