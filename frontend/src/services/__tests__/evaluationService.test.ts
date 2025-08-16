import { evaluationService } from '../evaluationService';
import { apiClient } from '../../utils/api';
import { offlineService } from '../offlineService';

// Mock the API client and offline service
jest.mock('../../utils/api');
jest.mock('../offlineService');
const mockedApiClient = apiClient as jest.Mocked<typeof apiClient>;
const mockedOfflineService = offlineService as jest.Mocked<typeof offlineService>;

describe('EvaluationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock offline service to return online status by default
    mockedOfflineService.getOnlineStatus.mockReturnValue(true);
  });

  describe('getEvaluation', () => {
    it('should fetch evaluation successfully when online', async () => {
      const mockEvaluationData = {
        evaluation: {
          id: '507f1f77bcf86cd799439011',
          sessionId: '507f1f77bcf86cd799439012',
          userId: '507f1f77bcf86cd799439013',
          isComplete: false,
          scores: [
            {
              criterionId: 'criterion1',
              score: 85,
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
          id: '507f1f77bcf86cd799439012',
          name: 'Test Session',
          description: 'Test Description',
          video: {
            id: 'video1',
            title: 'Test Video',
            youtubeId: 'test123',
            thumbnailUrl: 'https://example.com/thumb.jpg',
          },
          template: {
            id: 'template1',
            name: 'Test Template',
            description: 'Test Template Description',
            categories: [
              {
                id: 'cat1',
                name: 'Category 1',
                description: 'Category 1 Description',
                weight: 50,
                criteria: [
                  {
                    id: 'criterion1',
                    name: 'Criterion 1',
                    description: 'Criterion 1 Description',
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

      const mockResponse = {
        data: {
          status: 'success',
          data: mockEvaluationData,
        },
      };

      mockedApiClient.get.mockResolvedValue(mockResponse);

      const result = await evaluationService.getEvaluation('507f1f77bcf86cd799439012');

      expect(mockedApiClient.get).toHaveBeenCalledWith('/evaluations/session/507f1f77bcf86cd799439012');
      expect(result).toEqual(mockEvaluationData);
      expect(mockedOfflineService.cacheSession).toHaveBeenCalledWith(mockEvaluationData.session);
      expect(mockedOfflineService.cacheVideo).toHaveBeenCalledWith(mockEvaluationData.session.video);
      expect(mockedOfflineService.cacheTemplate).toHaveBeenCalledWith(mockEvaluationData.session.template);
    });

    it('should return cached data when offline', async () => {
      mockedOfflineService.getOnlineStatus.mockReturnValue(false);
      
      const mockCachedSession = {
        id: '507f1f77bcf86cd799439012',
        name: 'Cached Session',
        description: 'Cached Description',
        video: {
          id: 'video1',
          title: 'Cached Video',
          youtubeId: 'cached123',
          thumbnailUrl: 'https://example.com/cached.jpg',
        },
        template: {
          id: 'template1',
          name: 'Cached Template',
          description: 'Cached Template Description',
          categories: [],
        },
        endDate: new Date('2024-12-31T23:59:59Z'),
      };

      mockedOfflineService.getCachedSession.mockResolvedValue(mockCachedSession);

      const result = await evaluationService.getEvaluation('507f1f77bcf86cd799439012');

      expect(mockedOfflineService.getCachedSession).toHaveBeenCalledWith('507f1f77bcf86cd799439012');
      expect(result.session).toEqual(mockCachedSession);
      expect(result.evaluation.id).toBe('offline_507f1f77bcf86cd799439012');
    });

    it('should throw error when offline and no cached data', async () => {
      mockedOfflineService.getOnlineStatus.mockReturnValue(false);
      mockedOfflineService.getCachedSession.mockResolvedValue(null);

      await expect(evaluationService.getEvaluation('507f1f77bcf86cd799439012'))
        .rejects.toThrow('オフラインでセッションデータが利用できません');
    });
  });

  describe('saveScores', () => {
    it('should save scores successfully when online', async () => {
      const mockEvaluation = {
        id: '507f1f77bcf86cd799439011',
        sessionId: '507f1f77bcf86cd799439012',
        userId: '507f1f77bcf86cd799439013',
        isComplete: false,
        scores: [
          {
            criterionId: 'criterion1',
            score: 90,
            comment: 'Excellent performance',
          },
        ],
        comments: [],
        lastSavedAt: new Date('2023-01-01T00:00:00Z'),
      };

      const mockResponse = {
        data: {
          status: 'success',
          data: { evaluation: mockEvaluation },
        },
      };

      mockedApiClient.put.mockResolvedValue(mockResponse);

      const scores = [
        {
          criterionId: 'criterion1',
          score: 90,
          comment: 'Excellent performance',
        },
      ];

      const result = await evaluationService.saveScores('507f1f77bcf86cd799439012', scores);

      expect(mockedApiClient.put).toHaveBeenCalledWith(
        '/evaluations/session/507f1f77bcf86cd799439012/scores',
        { scores }
      );
      expect(result).toEqual(mockEvaluation);
    });

    it('should save scores offline when offline', async () => {
      mockedOfflineService.getOnlineStatus.mockReturnValue(false);

      const scores = [
        {
          criterionId: 'criterion1',
          score: 90,
          comment: 'Excellent performance',
        },
      ];

      const result = await evaluationService.saveScores('507f1f77bcf86cd799439012', scores);

      expect(mockedOfflineService.saveEvaluation).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439012',
        expect.objectContaining({
          sessionId: '507f1f77bcf86cd799439012',
          scores,
        })
      );
      expect(result.id).toBe('offline_507f1f77bcf86cd799439012');
    });
  });

  describe('submitEvaluation', () => {
    it('should submit evaluation successfully when online', async () => {
      const mockEvaluation = {
        id: '507f1f77bcf86cd799439011',
        sessionId: '507f1f77bcf86cd799439012',
        userId: '507f1f77bcf86cd799439013',
        isComplete: true,
        submittedAt: new Date('2023-01-01T00:00:00Z'),
        scores: [
          {
            criterionId: 'criterion1',
            score: 90,
            comment: 'Excellent performance',
          },
        ],
        comments: [],
        lastSavedAt: new Date('2023-01-01T00:00:00Z'),
      };

      const mockResponse = {
        data: {
          status: 'success',
          data: {
            evaluation: mockEvaluation,
            submissionSummary: {
              submittedAt: '2023-01-01T00:00:00Z',
              sessionId: '507f1f77bcf86cd799439012',
            },
          },
        },
      };

      mockedApiClient.post.mockResolvedValue(mockResponse);

      const result = await evaluationService.submitEvaluation('507f1f77bcf86cd799439012');

      expect(mockedApiClient.post).toHaveBeenCalledWith('/evaluations/session/507f1f77bcf86cd799439012/submit');
      expect(result).toEqual(mockEvaluation);
    });

    it('should submit evaluation offline when offline', async () => {
      mockedOfflineService.getOnlineStatus.mockReturnValue(false);

      const result = await evaluationService.submitEvaluation('507f1f77bcf86cd799439012');

      expect(mockedOfflineService.saveEvaluation).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439012',
        expect.objectContaining({
          sessionId: '507f1f77bcf86cd799439012',
          isComplete: true,
        })
      );
      expect(result.id).toBe('offline_507f1f77bcf86cd799439012');
      expect(result.isComplete).toBe(true);
    });
  });

  describe('addComment', () => {
    it('should add comment successfully when online', async () => {
      const mockComment = {
        id: '507f1f77bcf86cd799439014',
        timestamp: 180,
        text: 'Nice move at this point',
        createdAt: new Date('2023-01-01T00:00:00Z'),
      };

      const mockResponse = {
        data: {
          status: 'success',
          data: { comment: mockComment },
        },
      };

      mockedApiClient.post.mockResolvedValue(mockResponse);

      const result = await evaluationService.addComment('507f1f77bcf86cd799439012', 180, 'Nice move at this point');

      expect(mockedApiClient.post).toHaveBeenCalledWith(
        '/evaluations/session/507f1f77bcf86cd799439012/comments',
        {
          timestamp: 180,
          text: 'Nice move at this point',
        }
      );
      expect(result).toEqual(mockComment);
    });

    it('should add comment offline when offline', async () => {
      mockedOfflineService.getOnlineStatus.mockReturnValue(false);

      const result = await evaluationService.addComment('507f1f77bcf86cd799439012', 180, 'Nice move at this point');

      expect(mockedOfflineService.saveComment).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439012',
        expect.objectContaining({
          timestamp: 180,
          text: 'Nice move at this point',
        })
      );
      expect(result.timestamp).toBe(180);
      expect(result.text).toBe('Nice move at this point');
    });
  });

  describe('updateComment', () => {
    it('should update comment successfully when online', async () => {
      const mockComment = {
        id: '507f1f77bcf86cd799439014',
        timestamp: 180,
        text: 'Updated comment text',
        createdAt: new Date('2023-01-01T00:00:00Z'),
      };

      const mockResponse = {
        data: {
          status: 'success',
          data: { comment: mockComment },
        },
      };

      mockedApiClient.put.mockResolvedValue(mockResponse);

      const result = await evaluationService.updateComment(
        '507f1f77bcf86cd799439012',
        '507f1f77bcf86cd799439014',
        'Updated comment text'
      );

      expect(mockedApiClient.put).toHaveBeenCalledWith(
        '/evaluations/session/507f1f77bcf86cd799439012/comments/507f1f77bcf86cd799439014',
        { text: 'Updated comment text' }
      );
      expect(result).toEqual(mockComment);
    });

    it('should update comment offline when offline', async () => {
      mockedOfflineService.getOnlineStatus.mockReturnValue(false);

      const result = await evaluationService.updateComment(
        '507f1f77bcf86cd799439012',
        '507f1f77bcf86cd799439014',
        'Updated comment text'
      );

      expect(mockedOfflineService.saveComment).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439012',
        expect.objectContaining({
          id: '507f1f77bcf86cd799439014',
          text: 'Updated comment text',
        })
      );
      expect(result.text).toBe('Updated comment text');
    });
  });

  describe('deleteComment', () => {
    it('should delete comment successfully', async () => {
      mockedApiClient.delete.mockResolvedValue({});

      await evaluationService.deleteComment('507f1f77bcf86cd799439012', '507f1f77bcf86cd799439014');

      expect(mockedApiClient.delete).toHaveBeenCalledWith(
        '/evaluations/session/507f1f77bcf86cd799439012/comments/507f1f77bcf86cd799439014'
      );
    });
  });

  describe('getSubmissionStatus', () => {
    it('should fetch submission status successfully', async () => {
      const mockStatus = {
        isSubmitted: true,
        submittedAt: new Date('2023-01-01T00:00:00Z'),
        isComplete: true,
        totalScores: 5,
        totalComments: 3,
        lastSavedAt: new Date('2023-01-01T00:00:00Z'),
      };

      const mockResponse = {
        data: {
          status: 'success',
          data: mockStatus,
        },
      };

      mockedApiClient.get.mockResolvedValue(mockResponse);

      const result = await evaluationService.getSubmissionStatus('507f1f77bcf86cd799439012');

      expect(mockedApiClient.get).toHaveBeenCalledWith(
        '/evaluations/session/507f1f77bcf86cd799439012/submission-status'
      );
      expect(result).toEqual(mockStatus);
    });
  });

  describe('Error Handling', () => {
    it('should handle 404 errors when fetching evaluation', async () => {
      const mockError = {
        response: {
          status: 404,
          data: {
            status: 'error',
            message: 'セッションが見つかりません',
          },
        },
      };

      mockedApiClient.get.mockRejectedValue(mockError);

      await expect(
        evaluationService.getEvaluation('invalid-id')
      ).rejects.toEqual(mockError);
    });

    it('should handle 403 errors when fetching evaluation', async () => {
      const mockError = {
        response: {
          status: 403,
          data: {
            status: 'error',
            message: 'このセッションの評価権限がありません',
          },
        },
      };

      mockedApiClient.get.mockRejectedValue(mockError);

      await expect(
        evaluationService.getEvaluation('507f1f77bcf86cd799439012')
      ).rejects.toEqual(mockError);
    });

    it('should handle validation errors when saving scores', async () => {
      const mockError = {
        response: {
          status: 400,
          data: {
            status: 'error',
            message: 'スコアデータが無効です',
          },
        },
      };

      mockedApiClient.put.mockRejectedValue(mockError);

      const invalidScores = [
        {
          criterionId: 'criterion1',
          score: 150, // Invalid score
          comment: 'Test comment',
        },
      ];

      await expect(
        evaluationService.saveScores('507f1f77bcf86cd799439012', invalidScores)
      ).rejects.toEqual(mockError);
    });

    it('should handle submission errors with missing criteria', async () => {
      const mockError = {
        response: {
          status: 400,
          data: {
            status: 'error',
            message: 'すべての評価項目を入力してください',
            data: {
              completionDetails: {
                totalCriteria: 5,
                completedCriteria: 3,
                missingCriteria: [
                  { id: 'crit1', name: 'Criterion 1', categoryName: 'Category 1' },
                  { id: 'crit2', name: 'Criterion 2', categoryName: 'Category 1' },
                ],
              },
            },
          },
        },
      };

      mockedApiClient.post.mockRejectedValue(mockError);

      await expect(
        evaluationService.submitEvaluation('507f1f77bcf86cd799439012')
      ).rejects.toEqual(mockError);
    });

    it('should handle network errors', async () => {
      const networkError = new Error('Network Error');
      networkError.code = 'NETWORK_ERROR';
      mockedApiClient.get.mockRejectedValue(networkError);

      await expect(
        evaluationService.getEvaluation('507f1f77bcf86cd799439012')
      ).rejects.toThrow('Network Error');
    });

    it('should handle server errors (500)', async () => {
      const serverError = {
        response: {
          status: 500,
          data: {
            status: 'error',
            message: 'Internal Server Error',
          },
        },
      };

      mockedApiClient.get.mockRejectedValue(serverError);

      await expect(
        evaluationService.getEvaluation('507f1f77bcf86cd799439012')
      ).rejects.toEqual(serverError);
    });
  });
});
