import { apiClient } from '../utils/api';
import { offlineService } from './offlineService';

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
  private baseUrl = '/api/evaluations';

  /**
   * セッションの評価を開始/取得する（オフライン対応）
   */
  async getEvaluation(sessionId: string): Promise<EvaluationData> {
    try {
      // オンラインの場合は通常通りAPI呼び出し
      if (offlineService.getOnlineStatus()) {
        const response = await api.get<{
          status: string;
          data: EvaluationData;
        }>(`${this.baseUrl}/session/${sessionId}`);

        // データをキャッシュ
        const data = response.data.data;
        await offlineService.cacheSession(data.session);
        await offlineService.cacheVideo(data.session.video);
        await offlineService.cacheTemplate(data.session.template);

        return data;
      } else {
        // オフラインの場合はキャッシュから取得
        const cachedSession = await offlineService.getCachedSession(sessionId);
        if (!cachedSession) {
          throw new Error('オフラインでセッションデータが利用できません');
        }

        // 基本的な評価データ構造を作成
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
    } catch (error) {
      console.error('評価取得エラー:', error);
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
        const response = await api.put<{
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
        const response = await api.post<{
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
        const response = await api.put<{
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
      await api.delete(
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
        const response = await api.post<{
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
      const response = await api.get<{ status: string; data: any }>(
        `${this.baseUrl}/session/${sessionId}/submission-status`
      );
      return response.data.data;
    } catch (error) {
      console.error('提出状況確認エラー:', error);
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
}

export const evaluationService = new EvaluationService();
export default evaluationService;
