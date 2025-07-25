import { api } from '../utils/api';
import { Session, SessionStatus } from '../types';

export interface CreateSessionRequest {
  name: string;
  description?: string;
  videoId: string;
  templateId: string;
  startDate?: Date;
  endDate?: Date;
  settings?: {
    allowAnonymous?: boolean;
    requireComments?: boolean;
    showRealTimeResults?: boolean;
    maxEvaluationsPerUser?: number;
  };
}

export interface UpdateSessionRequest {
  name?: string;
  description?: string;
  startDate?: Date;
  endDate?: Date;
  settings?: {
    allowAnonymous?: boolean;
    requireComments?: boolean;
    showRealTimeResults?: boolean;
    maxEvaluationsPerUser?: number;
  };
}

export interface SessionListParams {
  status?: SessionStatus;
  page?: number;
  limit?: number;
}

export interface SessionListResponse {
  sessions: Session[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

class SessionService {
  private baseUrl = '/api/sessions';

  /**
   * セッションを作成する
   */
  async createSession(sessionData: CreateSessionRequest): Promise<Session> {
    try {
      const response = await api.post<{ status: string; data: Session }>(
        this.baseUrl,
        sessionData
      );
      return response.data.data;
    } catch (error) {
      console.error('セッション作成エラー:', error);
      throw error;
    }
  }

  /**
   * セッション一覧を取得する
   */
  async getSessions(params: SessionListParams = {}): Promise<SessionListResponse> {
    try {
      const queryParams = new URLSearchParams();
      
      if (params.status) queryParams.append('status', params.status);
      if (params.page) queryParams.append('page', params.page.toString());
      if (params.limit) queryParams.append('limit', params.limit.toString());

      const url = queryParams.toString() 
        ? `${this.baseUrl}?${queryParams.toString()}`
        : this.baseUrl;

      const response = await api.get<{ status: string; data: SessionListResponse }>(url);
      return response.data.data;
    } catch (error) {
      console.error('セッション一覧取得エラー:', error);
      throw error;
    }
  }

  /**
   * セッション詳細を取得する
   */
  async getSession(sessionId: string): Promise<Session> {
    try {
      const response = await api.get<{ status: string; data: Session }>(
        `${this.baseUrl}/${sessionId}`
      );
      return response.data.data;
    } catch (error) {
      console.error('セッション詳細取得エラー:', error);
      throw error;
    }
  }

  /**
   * セッションを更新する
   */
  async updateSession(sessionId: string, updates: UpdateSessionRequest): Promise<Session> {
    try {
      const response = await api.put<{ status: string; data: Session }>(
        `${this.baseUrl}/${sessionId}`,
        updates
      );
      return response.data.data;
    } catch (error) {
      console.error('セッション更新エラー:', error);
      throw error;
    }
  }

  /**
   * セッションを削除する
   */
  async deleteSession(sessionId: string): Promise<void> {
    try {
      await api.delete(`${this.baseUrl}/${sessionId}`);
    } catch (error) {
      console.error('セッション削除エラー:', error);
      throw error;
    }
  }

  /**
   * セッションのステータスを変更する
   */
  async updateSessionStatus(sessionId: string, status: SessionStatus): Promise<Session> {
    try {
      return await this.updateSession(sessionId, { status } as any);
    } catch (error) {
      console.error('セッションステータス更新エラー:', error);
      throw error;
    }
  }

  /**
   * セッションをアクティブにする
   */
  async activateSession(sessionId: string): Promise<Session> {
    return this.updateSessionStatus(sessionId, SessionStatus.ACTIVE);
  }

  /**
   * セッションを完了する
   */
  async completeSession(sessionId: string): Promise<Session> {
    return this.updateSessionStatus(sessionId, SessionStatus.COMPLETED);
  }

  /**
   * セッションをアーカイブする
   */
  async archiveSession(sessionId: string): Promise<Session> {
    return this.updateSessionStatus(sessionId, SessionStatus.ARCHIVED);
  }

  /**
   * 評価者を招待する
   */
  async inviteEvaluators(sessionId: string, emails: string[], message?: string): Promise<any> {
    try {
      const response = await api.post<{ status: string; data: any }>(
        `${this.baseUrl}/${sessionId}/invite`,
        { emails, message }
      );
      return response.data.data;
    } catch (error) {
      console.error('評価者招待エラー:', error);
      throw error;
    }
  }

  /**
   * 招待リンクでセッションに参加する
   */
  async joinSession(sessionId: string, token: string, userInfo?: any): Promise<any> {
    try {
      const response = await api.post<{ status: string; data: any }>(
        `${this.baseUrl}/${sessionId}/join`,
        { token, userInfo }
      );
      return response.data.data;
    } catch (error) {
      console.error('セッション参加エラー:', error);
      throw error;
    }
  }

  /**
   * セッションステータスを更新する（PATCH版）
   */
  async patchSessionStatus(sessionId: string, status: SessionStatus): Promise<Session> {
    try {
      const response = await api.patch<{ status: string; data: Session }>(
        `${this.baseUrl}/${sessionId}/status`,
        { status }
      );
      return response.data.data;
    } catch (error) {
      console.error('セッションステータス更新エラー:', error);
      throw error;
    }
  }

  /**
   * セッション進捗状況を取得する
   */
  async getSessionProgress(sessionId: string): Promise<any> {
    try {
      const response = await api.get<{ status: string; data: any }>(
        `${this.baseUrl}/${sessionId}/progress`
      );
      return response.data.data;
    } catch (error) {
      console.error('セッション進捗取得エラー:', error);
      throw error;
    }
  }

  /**
   * 期限切れ通知を取得する
   */
  async getOverdueNotifications(): Promise<any> {
    try {
      const response = await api.get<{ status: string; data: any }>(
        `${this.baseUrl}/notifications/overdue`
      );
      return response.data.data;
    } catch (error) {
      console.error('通知取得エラー:', error);
      throw error;
    }
  }
}

export const sessionService = new SessionService();
export default sessionService;