import { apiClient } from '../utils/api';
import { Evaluation, Session, Template, User } from '../types';

export interface AnalyticsData {
  evaluations: Evaluation[];
  session: Session;
  template: Template;
  users: User[];
}

export interface SessionComparison {
  sessions: Session[];
  evaluations: Evaluation[][];
  templates: Template[];
}

export const analyticsService = {
  // Get analytics data for a specific session
  async getSessionAnalytics(sessionId: string): Promise<AnalyticsData> {
    try {
      const response = await apiClient.get(`/analytics/session/${sessionId}`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch session analytics:', error);
      throw error;
    }
  },

  // Compare multiple sessions
  async compareSessions(sessionIds: string[]): Promise<SessionComparison> {
    try {
      const response = await apiClient.get(
        `/analytics/compare?sessions=${sessionIds.join(',')}`
      );
      return response.data;
    } catch (error) {
      console.error('Failed to compare sessions:', error);
      throw error;
    }
  },

  // Export analytics data
  async exportSessionData(
    sessionId: string,
    format: 'pdf' | 'csv' | 'json'
  ): Promise<Blob> {
    try {
      const response = await apiClient.get(
        `/analytics/export/${sessionId}?format=${format}`,
        {
          responseType: 'blob',
        }
      );
      return response.data;
    } catch (error) {
      console.error('Failed to export session data:', error);
      throw error;
    }
  },

  // Get detailed score distribution for a session
  async getScoreDistribution(sessionId: string): Promise<
    {
      criterionId: string;
      scores: number[];
      average: number;
      standardDeviation: number;
      min: number;
      max: number;
    }[]
  > {
    try {
      const response = await apiClient.get(
        `/analytics/session/${sessionId}/distribution`
      );
      return response.data;
    } catch (error) {
      console.error('Failed to fetch score distribution:', error);
      throw error;
    }
  },

  // Get evaluator agreement analysis
  async getEvaluatorAgreement(sessionId: string): Promise<{
    overallAgreement: number;
    criterionAgreement: {
      criterionId: string;
      agreement: number;
      variance: number;
    }[];
  }> {
    try {
      const response = await apiClient.get(
        `/analytics/session/${sessionId}/agreement`
      );
      return response.data;
    } catch (error) {
      console.error('Failed to fetch evaluator agreement:', error);
      throw error;
    }
  },

  // Get timeline comment analysis
  async getCommentAnalysis(sessionId: string): Promise<{
    totalComments: number;
    averageCommentsPerEvaluator: number;
    timelineDistribution: {
      timestamp: number;
      commentCount: number;
    }[];
    sentimentAnalysis?: {
      positive: number;
      neutral: number;
      negative: number;
    };
  }> {
    try {
      const response = await apiClient.get(
        `/analytics/session/${sessionId}/comments`
      );
      return response.data;
    } catch (error) {
      console.error('Failed to fetch comment analysis:', error);
      throw error;
    }
  },
};
