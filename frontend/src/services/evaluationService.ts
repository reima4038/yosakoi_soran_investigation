import { apiClient } from '../utils/api';
import { offlineService } from './offlineService';
import { sessionCache, evaluationCache, createCacheKey } from '../utils/cache';
import { optimizedRequest } from '../utils/apiWithTimeout';
import { logger } from '../utils/logger';

export interface EvaluationScore {
  criterionId: string;
  score: number;
  comment?: string;
}

export interface Comment {
  id?: string;
  timestamp: number;
  text: string;
  createdAt?: Date;
}

export interface Evaluation {
  id: string;
  sessionId: string;
  userId: string;
  submittedAt?: Date;
  isComplete: boolean;
  scores: EvaluationScore[];
  comments: Comment[];
  lastSavedAt: Date;
}

export interface EvaluationSession {
  id: string;
  name: string;
  description: string;
  video: {
    id: string;
    title: string;
    youtubeId: string;
    thumbnailUrl: string;
  };
  template: {
    id: string;
    name: string;
    description: string;
    categories: Array<{
      id: string;
      name: string;
      description: string;
      weight: number;
      criteria: Array<{
        id: string;
        name: string;
        description: string;
        type: string;
        minValue: number;
        maxValue: number;
        weight: number;
      }>;
    }>;
  };
  endDate?: Date;
}

export interface EvaluationData {
  evaluation: Evaluation;
  session: EvaluationSession;
}

class EvaluationService {
  private baseUrl = '/evaluations';

  /**
   * セッションの評価を開始/取得する（オフライン対応・キャッシュ最適化）
   */
  async getEvaluation(sessionId: string, forceRefresh: boolean = false): Promise<EvaluationData> {
    const cacheKey = createCacheKey('evaluation', sessionId);
    const sessionCacheKey = createCacheKey('session', sessionId);
    
    try {
      // オンラインの場合は最適化されたリクエストを使用
      if (offlineService.getOnlineStatus()) {
        logger.info(`評価データ取得開始: ${sessionId}`, 'EvaluationService', { 
          forceRefresh,
          url: `${this.baseUrl}/session/${sessionId}`,
          timestamp: new Date().toISOString()
        });
        
        // 階層キャッシュ戦略: セッションデータとユーザー固有の評価データを分離
        const data = await optimizedRequest(
          cacheKey,
          async () => {
            logger.debug(`API呼び出し実行: ${this.baseUrl}/session/${sessionId}`, 'EvaluationService');
            const response = await apiClient.get<{
              status: string;
              data: EvaluationData;
            }>(`${this.baseUrl}/session/${sessionId}`);
            logger.debug(`API呼び出し成功: ${this.baseUrl}/session/${sessionId}`, 'EvaluationService', {
              status: response.status,
              dataKeys: Object.keys(response.data.data || {}),
            });
            return response.data.data;
          },
          {
            cache: true,
            cacheTtl: 3 * 60 * 1000, // 3分間キャッシュ（評価データは頻繁に更新される可能性）
            requestType: 'evaluation',
            forceRefresh,
            maxRetries: 3,
            timeout: 30000, // 30秒タイムアウトに延長
          }
        );

        // セッション情報を長期キャッシュ（セッション情報は変更頻度が低い）
        sessionCache.set(sessionCacheKey, data.session, 10 * 60 * 1000); // 10分間

        // オフラインサービスにもキャッシュ（並列実行で高速化）
        await Promise.all([
          offlineService.cacheSession(data.session),
          offlineService.cacheVideo(data.session.video),
          offlineService.cacheTemplate(data.session.template),
        ]);

        logger.info(`評価データ取得成功: ${sessionId}`, 'EvaluationService');
        return data;
      } else {
        // オフラインの場合はキャッシュから取得
        logger.info(`オフラインモード: キャッシュから評価データ取得: ${sessionId}`, 'EvaluationService');
        
        // まずメモリキャッシュから試行
        const cachedSession = sessionCache.get<EvaluationSession>(sessionCacheKey);
        if (cachedSession) {
          logger.debug('メモリキャッシュからセッション取得', 'EvaluationService');
          
          const evaluationData: EvaluationData = {
            session: cachedSession,
            evaluation: {
              id: `offline_${sessionId}`,
              sessionId,
              userId: 'offline_user',
              submittedAt: undefined,
              isComplete: false,
              scores: [],
              comments: [],
              lastSavedAt: new Date(),
            },
          };
          return evaluationData;
        }

        // メモリキャッシュにない場合はオフラインサービスから取得
        const offlineCachedSession = await offlineService.getCachedSession(sessionId);
        if (!offlineCachedSession) {
          throw new Error('オフラインでセッションデータが利用できません');
        }

        // 基本的な評価データ構造を作成
        const evaluationData: EvaluationData = {
          session: offlineCachedSession,
          evaluation: {
            id: `offline_${sessionId}`,
            sessionId,
            userId: 'offline_user',
            submittedAt: undefined,
            isComplete: false,
            scores: [],
            comments: [],
            lastSavedAt: new Date(),
          },
        };

        return evaluationData;
      }
    } catch (error: any) {
      logger.error(`評価データ取得エラー: ${sessionId}`, 'EvaluationService', {
        error: error.message,
        isTimeout: error.name === 'TimeoutError',
        isNetworkError: !error.response,
      });
      
      // タイムアウトまたはネットワークエラーの場合のみ、キャッシュからフォールバック
      // 認証エラー（403）や見つからない（404）などのクライアントエラーはフォールバックしない
      const shouldFallbackToCache = (
        error.name === 'TimeoutError' || 
        !error.response || 
        (error.response && error.response.status >= 500)
      );
      
      if (shouldFallbackToCache) {
        logger.info('エラー時キャッシュフォールバック試行', 'EvaluationService', {
          errorType: error.name,
          httpStatus: error.response?.status,
        });
        
        const cachedSession = sessionCache.get<EvaluationSession>(sessionCacheKey);
        if (cachedSession) {
          logger.info('キャッシュからフォールバック成功', 'EvaluationService');
          
          const evaluationData: EvaluationData = {
            session: cachedSession,
            evaluation: {
              id: `fallback_${sessionId}`,
              sessionId,
              userId: 'cached_user',
              submittedAt: undefined,
              isComplete: false,
              scores: [],
              comments: [],
              lastSavedAt: new Date(),
            },
          };
          return evaluationData;
        }
      }
      
      throw error;
    }
  }

  /**
   * 評価スコアを保存する（オフライン対応リアルタイム保存）
   */
  async saveScores(
    sessionId: string,
    scores: EvaluationScore[]
  ): Promise<Evaluation> {
    try {
      if (offlineService.getOnlineStatus()) {
        // オンラインの場合は通常通りAPI呼び出し
        const response = await apiClient.put<{
          status: string;
          data: { evaluation: Evaluation };
        }>(`${this.baseUrl}/session/${sessionId}/scores`, { scores });
        return response.data.data.evaluation;
      } else {
        // オフラインの場合はローカルに保存
        const evaluationData = {
          sessionId,
          scores,
          lastSavedAt: new Date(),
        };

        await offlineService.saveEvaluation(sessionId, evaluationData);

        // 仮の評価オブジェクトを返す
        const evaluation: Evaluation = {
          id: `offline_${sessionId}`,
          sessionId,
          userId: 'offline_user',
          submittedAt: undefined,
          isComplete: false,
          scores,
          comments: [],
          lastSavedAt: new Date(),
        };

        return evaluation;
      }
    } catch (error) {
      console.error('評価保存エラー:', error);
      throw error;
    }
  }

  /**
   * コメントを追加する（オフライン対応）
   */
  async addComment(
    sessionId: string,
    timestamp: number,
    text: string
  ): Promise<Comment> {
    try {
      if (offlineService.getOnlineStatus()) {
        // オンラインの場合は通常通りAPI呼び出し
        const response = await apiClient.post<{
          status: string;
          data: { comment: Comment };
        }>(`${this.baseUrl}/session/${sessionId}/comments`, {
          timestamp,
          text,
        });
        return response.data.data.comment;
      } else {
        // オフラインの場合はローカルに保存
        const comment: Comment = {
          id: `offline_comment_${Date.now()}_${Math.random()}`,
          timestamp,
          text,
          createdAt: new Date(),
        };

        await offlineService.saveComment(sessionId, comment);
        return comment;
      }
    } catch (error) {
      console.error('コメント追加エラー:', error);
      throw error;
    }
  }

  /**
   * コメントを更新する（オフライン対応）
   */
  async updateComment(
    sessionId: string,
    commentId: string,
    text: string
  ): Promise<Comment> {
    try {
      if (offlineService.getOnlineStatus()) {
        // オンラインの場合は通常通りAPI呼び出し
        const response = await apiClient.put<{
          status: string;
          data: { comment: Comment };
        }>(`${this.baseUrl}/session/${sessionId}/comments/${commentId}`, {
          text,
        });
        return response.data.data.comment;
      } else {
        // オフラインの場合は更新されたコメントを保存
        const updatedComment: Comment = {
          id: commentId,
          timestamp: 0, // 実際の実装では既存のタイムスタンプを保持
          text,
          createdAt: new Date(),
        };

        await offlineService.saveComment(sessionId, updatedComment);
        return updatedComment;
      }
    } catch (error) {
      console.error('コメント更新エラー:', error);
      throw error;
    }
  }

  /**
   * コメントを削除する
   */
  async deleteComment(sessionId: string, commentId: string): Promise<void> {
    try {
      await apiClient.delete(
        `${this.baseUrl}/session/${sessionId}/comments/${commentId}`
      );
    } catch (error) {
      console.error('コメント削除エラー:', error);
      throw error;
    }
  }

  /**
   * 評価を提出する（オフライン対応）
   */
  async submitEvaluation(sessionId: string): Promise<Evaluation> {
    try {
      if (offlineService.getOnlineStatus()) {
        // オンラインの場合は通常通りAPI呼び出し
        const response = await apiClient.post<{
          status: string;
          data: {
            evaluation: Evaluation;
            submissionSummary: any;
          };
        }>(`${this.baseUrl}/session/${sessionId}/submit`);
        return response.data.data.evaluation;
      } else {
        // オフラインの場合は提出予約として保存
        const submissionData = {
          sessionId,
          submittedAt: new Date(),
          isComplete: true,
        };

        await offlineService.saveEvaluation(sessionId, submissionData);

        // 仮の提出済み評価オブジェクトを返す
        const evaluation: Evaluation = {
          id: `offline_${sessionId}`,
          sessionId,
          userId: 'offline_user',
          submittedAt: new Date(),
          isComplete: true,
          scores: [],
          comments: [],
          lastSavedAt: new Date(),
        };

        return evaluation;
      }
    } catch (error) {
      console.error('評価提出エラー:', error);
      throw error;
    }
  }

  /**
   * 提出状況を確認する
   */
  async getSubmissionStatus(sessionId: string): Promise<any> {
    try {
      const response = await apiClient.get<{ status: string; data: any }>(
        `${this.baseUrl}/session/${sessionId}/submission-status`
      );
      return response.data.data;
    } catch (error) {
      
      throw error;
    }
  }

  /**
   * 評価の進捗を計算する
   */
  calculateProgress(
    evaluation: Evaluation,
    template: EvaluationSession['template']
  ): {
    totalCriteria: number;
    completedCriteria: number;
    progressPercentage: number;
    missingCriteria: string[];
  } {
    const allCriteria = template.categories.flatMap(
      category => category.criteria
    );
    const totalCriteria = allCriteria.length;
    const scoredCriteriaIds = evaluation.scores.map(score => score.criterionId);
    const completedCriteria = scoredCriteriaIds.length;
    const progressPercentage =
      totalCriteria > 0 ? (completedCriteria / totalCriteria) * 100 : 0;

    const missingCriteria = allCriteria
      .filter(criterion => !scoredCriteriaIds.includes(criterion.id))
      .map(criterion => criterion.name);

    return {
      totalCriteria,
      completedCriteria,
      progressPercentage,
      missingCriteria,
    };
  }

  /**
   * スコアの自動保存（デバウンス付き）
   */
  private saveTimeouts: Map<string, NodeJS.Timeout> = new Map();

  debouncedSaveScores(
    sessionId: string,
    scores: EvaluationScore[],
    delay: number = 1000
  ): Promise<Evaluation> {
    return new Promise((resolve, reject) => {
      // 既存のタイムアウトをクリア
      const existingTimeout = this.saveTimeouts.get(sessionId);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }

      // 新しいタイムアウトを設定
      const timeout = setTimeout(async () => {
        try {
          const result = await this.saveScores(sessionId, scores);
          this.saveTimeouts.delete(sessionId);
          resolve(result);
        } catch (error) {
          this.saveTimeouts.delete(sessionId);
          reject(error);
        }
      }, delay);

      this.saveTimeouts.set(sessionId, timeout);
    });
  }

  /**
   * 関連データのプリロード
   */
  async preloadRelatedData(sessionId: string): Promise<void> {
    const { preloadData } = await import('../utils/apiWithTimeout');
    
    try {
      // 並列でプリロード実行
      await Promise.allSettled([
        // セッション詳細のプリロード
        preloadData(
          createCacheKey('session_details', sessionId),
          () => apiClient.get(`/sessions/${sessionId}/details`),
          { priority: 'low' }
        ),
        
        // 他の評価者の進捗状況のプリロード（管理者の場合）
        preloadData(
          createCacheKey('session_progress', sessionId),
          () => apiClient.get(`/sessions/${sessionId}/progress`),
          { priority: 'low' }
        ),
        
        // セッション統計のプリロード
        preloadData(
          createCacheKey('session_stats', sessionId),
          () => apiClient.get(`/sessions/${sessionId}/stats`),
          { priority: 'low' }
        ),
      ]);
      
      logger.debug('関連データプリロード完了', 'EvaluationService', { sessionId });
    } catch (error) {
      logger.warn('関連データプリロード失敗', 'EvaluationService', { sessionId, error });
      // プリロードの失敗は無視
    }
  }

  /**
   * パフォーマンス最適化されたバッチ保存
   */
  async batchSaveData(
    sessionId: string,
    data: {
      scores?: EvaluationScore[];
      comments?: Comment[];
      overallComment?: string;
    }
  ): Promise<void> {
    const { batchOptimizedRequests } = await import('../utils/apiWithTimeout');
    
    const requests = [];
    
    if (data.scores) {
      requests.push({
        cacheKey: createCacheKey('save_scores', sessionId),
        requestFn: () => this.saveScores(sessionId, data.scores!),
        options: { priority: 'high' as const, requestType: 'submission' as const }
      });
    }
    
    if (data.comments) {
      for (const comment of data.comments) {
        requests.push({
          cacheKey: createCacheKey('save_comment', sessionId, comment.id || Date.now()),
          requestFn: () => this.addComment(sessionId, comment.timestamp, comment.text),
          options: { priority: 'normal' as const }
        });
      }
    }
    
    try {
      await batchOptimizedRequests(requests, { concurrency: 2, failFast: false });
      logger.info('バッチ保存完了', 'EvaluationService', { sessionId, requestCount: requests.length });
    } catch (error) {
      logger.error('バッチ保存失敗', 'EvaluationService', { sessionId, error });
      throw error;
    }
  }
}

export const evaluationService = new EvaluationService();
export default evaluationService;
