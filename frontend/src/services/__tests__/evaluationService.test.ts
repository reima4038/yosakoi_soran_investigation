import { evaluationService } from '../evaluationService';
import { apiClient } from '../../utils/api';

// Mock the API client
jest.mock('../../utils/api');
const mockedApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe('EvaluationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getEvaluation', () => {
    it('should fetch evaluation successfully', async () => {
      const mockEvaluation = {
        _id: '507f1f77bcf86cd799439011',
        sessionId: '507f1f77bcf86cd799439012',
        userId: '507f1f77bcf86cd799439013',
        isComplete: false,
        scores: [
          {
            criterionId: 'criterion1',
            score: 85,
            comment: 'Good performance'
          }
        ],
        comments: [
          {
            userId: '507f1f77bcf86cd799439013',
            timestamp: 120,
            text: 'Great timing here',
            createdAt: '2023-01-01T00:00:00Z'
          }
        ],
        lastSavedAt: '2023-01-01T00:00:00Z'
      };

      const mockResponse = {
        data: {
          data: mockEvaluation
        }
      };

      mockedApiClient.get.mockResolvedValue(mockResponse);

      const result = await evaluationService.getEvaluation('507f1f77bcf86cd799439012');

      expect(mockedApiClient.get).toHaveBeenCalledWith('/evaluations/507f1f77bcf86cd799439012');
      expect(result).toEqual(mockEvaluation);
    });
  });

  describe('saveEvaluation', () => {
    it('should save evaluation successfully', async () => {
      const mockEvaluation = {
        _id: '507f1f77bcf86cd799439011',
        sessionId: '507f1f77bcf86cd799439012',
        userId: '507f1f77bcf86cd799439013',
        isComplete: false,
        scores: [
          {
            criterionId: 'criterion1',
            score: 90,
            comment: 'Excellent performance'
          }
        ],
        comments: [],
        lastSavedAt: '2023-01-01T00:00:00Z'
      };

      const mockResponse = {
        data: {
          data: mockEvaluation
        }
      };

      mockedApiClient.post.mockResolvedValue(mockResponse);

      const evaluationData = {
        sessionId: '507f1f77bcf86cd799439012',
        scores: [
          {
            criterionId: 'criterion1',
            score: 90,
            comment: 'Excellent performance'
          }
        ],
        comments: []
      };

      const result = await evaluationService.saveEvaluation(evaluationData);

      expect(mockedApiClient.post).toHaveBeenCalledWith('/evaluations', evaluationData);
      expect(result).toEqual(mockEvaluation);
    });
  });

  describe('submitEvaluation', () => {
    it('should submit evaluation successfully', async () => {
      const mockEvaluation = {
        _id: '507f1f77bcf86cd799439011',
        sessionId: '507f1f77bcf86cd799439012',
        userId: '507f1f77bcf86cd799439013',
        isComplete: true,
        submittedAt: '2023-01-01T00:00:00Z',
        scores: [
          {
            criterionId: 'criterion1',
            score: 90,
            comment: 'Excellent performance'
          }
        ],
        comments: [],
        lastSavedAt: '2023-01-01T00:00:00Z'
      };

      const mockResponse = {
        data: {
          data: mockEvaluation
        }
      };

      mockedApiClient.post.mockResolvedValue(mockResponse);

      const result = await evaluationService.submitEvaluation('507f1f77bcf86cd799439011');

      expect(mockedApiClient.post).toHaveBeenCalledWith('/evaluations/507f1f77bcf86cd799439011/submit');
      expect(result).toEqual(mockEvaluation);
    });
  });

  describe('addComment', () => {
    it('should add comment successfully', async () => {
      const mockComment = {
        _id: '507f1f77bcf86cd799439014',
        evaluationId: '507f1f77bcf86cd799439011',
        userId: '507f1f77bcf86cd799439013',
        timestamp: 180,
        text: 'Nice move at this point',
        createdAt: '2023-01-01T00:00:00Z'
      };

      const mockResponse = {
        data: {
          data: mockComment
        }
      };

      mockedApiClient.post.mockResolvedValue(mockResponse);

      const commentData = {
        evaluationId: '507f1f77bcf86cd799439011',
        timestamp: 180,
        text: 'Nice move at this point'
      };

      const result = await evaluationService.addComment(commentData);

      expect(mockedApiClient.post).toHaveBeenCalledWith('/evaluations/comments', commentData);
      expect(result).toEqual(mockComment);
    });
  });

  describe('updateComment', () => {
    it('should update comment successfully', async () => {
      const mockComment = {
        _id: '507f1f77bcf86cd799439014',
        evaluationId: '507f1f77bcf86cd799439011',
        userId: '507f1f77bcf86cd799439013',
        timestamp: 180,
        text: 'Updated comment text',
        createdAt: '2023-01-01T00:00:00Z'
      };

      const mockResponse = {
        data: {
          data: mockComment
        }
      };

      mockedApiClient.put.mockResolvedValue(mockResponse);

      const updateData = {
        text: 'Updated comment text'
      };

      const result = await evaluationService.updateComment('507f1f77bcf86cd799439014', updateData);

      expect(mockedApiClient.put).toHaveBeenCalledWith('/evaluations/comments/507f1f77bcf86cd799439014', updateData);
      expect(result).toEqual(mockComment);
    });
  });

  describe('deleteComment', () => {
    it('should delete comment successfully', async () => {
      mockedApiClient.delete.mockResolvedValue({});

      await evaluationService.deleteComment('507f1f77bcf86cd799439014');

      expect(mockedApiClient.delete).toHaveBeenCalledWith('/evaluations/comments/507f1f77bcf86cd799439014');
    });
  });

  describe('getSessionEvaluations', () => {
    it('should fetch session evaluations successfully', async () => {
      const mockEvaluations = [
        {
          _id: '507f1f77bcf86cd799439011',
          sessionId: '507f1f77bcf86cd799439012',
          userId: '507f1f77bcf86cd799439013',
          user: {
            _id: '507f1f77bcf86cd799439013',
            username: 'evaluator1',
            email: 'evaluator1@example.com'
          },
          isComplete: true,
          submittedAt: '2023-01-01T00:00:00Z',
          scores: [],
          comments: []
        }
      ];

      const mockResponse = {
        data: {
          data: mockEvaluations
        }
      };

      mockedApiClient.get.mockResolvedValue(mockResponse);

      const result = await evaluationService.getSessionEvaluations('507f1f77bcf86cd799439012');

      expect(mockedApiClient.get).toHaveBeenCalledWith('/evaluations/session/507f1f77bcf86cd799439012');
      expect(result).toEqual(mockEvaluations);
    });
  });

  describe('getEvaluationSummary', () => {
    it('should fetch evaluation summary successfully', async () => {
      const mockSummary = {
        sessionId: '507f1f77bcf86cd799439012',
        totalEvaluators: 5,
        completedEvaluations: 3,
        averageScores: {
          criterion1: 85.5,
          criterion2: 78.2
        },
        scoreDistribution: {
          criterion1: [80, 85, 90, 88, 82],
          criterion2: [75, 78, 82, 76, 80]
        },
        commentCount: 15,
        lastUpdated: '2023-01-01T00:00:00Z'
      };

      const mockResponse = {
        data: {
          data: mockSummary
        }
      };

      mockedApiClient.get.mockResolvedValue(mockResponse);

      const result = await evaluationService.getEvaluationSummary('507f1f77bcf86cd799439012');

      expect(mockedApiClient.get).toHaveBeenCalledWith('/evaluations/session/507f1f77bcf86cd799439012/summary');
      expect(result).toEqual(mockSummary);
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors when fetching evaluation', async () => {
      const mockError = {
        response: {
          status: 404,
          data: {
            message: 'Evaluation not found'
          }
        }
      };

      mockedApiClient.get.mockRejectedValue(mockError);

      await expect(evaluationService.getEvaluation('invalid-id'))
        .rejects.toEqual(mockError);
    });

    it('should handle validation errors when saving evaluation', async () => {
      const mockError = {
        response: {
          status: 400,
          data: {
            message: 'Validation error',
            errors: {
              'scores.0.score': 'Score must be between 0 and 100'
            }
          }
        }
      };

      mockedApiClient.post.mockRejectedValue(mockError);

      const invalidData = {
        sessionId: '507f1f77bcf86cd799439012',
        scores: [
          {
            criterionId: 'criterion1',
            score: 150, // Invalid score
            comment: 'Test comment'
          }
        ],
        comments: []
      };

      await expect(evaluationService.saveEvaluation(invalidData))
        .rejects.toEqual(mockError);
    });

    it('should handle network errors', async () => {
      const networkError = new Error('Network Error');
      mockedApiClient.get.mockRejectedValue(networkError);

      await expect(evaluationService.getEvaluation('507f1f77bcf86cd799439012'))
        .rejects.toThrow('Network Error');
    });
  });
});