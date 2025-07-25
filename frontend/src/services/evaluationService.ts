import { api } from '../utils/api';

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
   * セッションの評価を開始/取得する
   */
  async getEvaluation(sessionId: string): Promise<EvaluationData> {
    try {
      const response = await api.get<{ status: string; data: EvaluationData }>(
        `${this.baseUrl}/session/${sessionId}`
      );
      return response.data.data;
    } catch (error) {
      console.error('評価取得エラー:', error);
      throw error;
    }
  }

  /**
   * 評価スコアを保存する（リアルタイム保存）
   */
  async saveScores(sessionId: string, scores: EvaluationScore[]): Promise<Evaluation> {
    try {
      const response = await api.put<{ status: string; data: { evaluation: Evaluation } }>(
        `${this.baseUrl}/session/${sessionId}/scores`,
        { scores }
      );
      return response.data.data.evaluation;
    } catch (error) {
      console.error('評価保存エラー:', error);
      throw error;
    }
  }

  /**
   * コメントを追加する
   */
  async addComment(sessionId: string, timestamp: number, text: string): Promise<Comment> {
    try {
      const response = await api.post<{ status: string; data: { comment: Comment } }>(
        `${this.baseUrl}/session/${sessionId}/comments`,
        { timestamp, text }
      );
      return response.data.data.comment;
    } catch (error) {
      console.error('コメント追加エラー:', error);
      throw error;
    }
  }

  /**
   * コメントを更新する
   */
  async updateComment(sessionId: string, commentId: string, text: string): Promise<Comment> {
    try {
      const response = await api.put<{ status: string; data: { comment: Comment } }>(
        `${this.baseUrl}/session/${sessionId}/comments/${commentId}`,
        { text }
      );
      return response.data.data.comment;
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
      await api.delete(`${this.baseUrl}/session/${sessionId}/comments/${commentId}`);
    } catch (error) {
      console.error('コメント削除エラー:', error);
      throw error;
    }
  }

  /**
   * 評価を提出する
   */
  async submitEvaluation(sessionId: string): Promise<Evaluation> {
    try {
      const response = await api.post<{ status: string; data: { evaluation: Evaluation } }>(
        `${this.baseUrl}/session/${sessionId}/submit`
      );
      return response.data.data.evaluation;
    } catch (error) {
      console.error('評価提出エラー:', error);
      throw error;
    }
  }

  /**
   * 評価の進捗を計算する
   */
  calculateProgress(evaluation: Evaluation, template: EvaluationSession['template']): {
    totalCriteria: number;
    completedCriteria: number;
    progressPercentage: number;
    missingCriteria: string[];
  } {
    const allCriteria = template.categories.flatMap(category => category.criteria);
    const totalCriteria = allCriteria.length;
    const scoredCriteriaIds = evaluation.scores.map(score => score.criterionId);
    const completedCriteria = scoredCriteriaIds.length;
    const progressPercentage = totalCriteria > 0 ? (completedCriteria / totalCriteria) * 100 : 0;
    
    const missingCriteria = allCriteria
      .filter(criterion => !scoredCriteriaIds.includes(criterion.id))
      .map(criterion => criterion.name);

    return {
      totalCriteria,
      completedCriteria,
      progressPercentage,
      missingCriteria
    };
  }

  /**
   * スコアの自動保存（デバウンス付き）
   */
  private saveTimeouts: Map<string, NodeJS.Timeout> = new Map();

  debouncedSaveScores(sessionId: string, scores: EvaluationScore[], delay: number = 1000): Promise<Evaluation> {
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