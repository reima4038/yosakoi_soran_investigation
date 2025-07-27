import { Evaluation } from '../../models/Evaluation';
import { User, UserRole } from '../../models/User';
import { Session } from '../../models/Session';
import { connectDB, disconnectDB } from '../setup';
import mongoose from 'mongoose';

describe('Evaluation Model', () => {
  let testUser: any;
  let testSession: any;

  beforeAll(async () => {
    await connectDB();
  });

  afterAll(async () => {
    await disconnectDB();
  });

  beforeEach(async () => {
    await Evaluation.deleteMany({});
    await User.deleteMany({});
    await Session.deleteMany({});

    // Create test user
    const userData = {
      username: 'testuser',
      email: 'test@example.com',
      passwordHash: 'password123',
      role: UserRole.USER
    };
    testUser = await new User(userData).save();

    // Create test session
    const sessionData = {
      name: 'Test Session',
      description: 'Test Description',
      startDate: new Date(),
      endDate: new Date(Date.now() + 86400000), // 1 day later
      status: 'active',
      videoId: new mongoose.Types.ObjectId(),
      templateId: new mongoose.Types.ObjectId(),
      creatorId: testUser._id,
      participants: []
    };
    testSession = await new Session(sessionData).save();
  });

  describe('Evaluation Creation', () => {
    it('should create an evaluation with valid data', async () => {
      const evaluationData = {
        sessionId: testSession._id,
        userId: testUser._id,
        isComplete: false,
        scores: [{
          criterionId: 'criterion1',
          score: 85,
          comment: 'Good performance'
        }],
        comments: [{
          userId: testUser._id,
          timestamp: 120,
          text: 'Great timing here'
        }]
      };

      const evaluation = new Evaluation(evaluationData);
      const savedEvaluation = await evaluation.save();

      expect(savedEvaluation.sessionId).toEqual(testSession._id);
      expect(savedEvaluation.userId).toEqual(testUser._id);
      expect(savedEvaluation.isComplete).toBe(false);
      expect(savedEvaluation.scores).toHaveLength(1);
      expect(savedEvaluation.scores[0].criterionId).toBe('criterion1');
      expect(savedEvaluation.scores[0].score).toBe(85);
      expect(savedEvaluation.scores[0].comment).toBe('Good performance');
      expect(savedEvaluation.comments).toHaveLength(1);
      expect(savedEvaluation.comments[0].timestamp).toBe(120);
      expect(savedEvaluation.comments[0].text).toBe('Great timing here');
      expect(savedEvaluation.lastSavedAt).toBeDefined();
    });

    it('should create evaluation with minimal data', async () => {
      const evaluationData = {
        sessionId: testSession._id,
        userId: testUser._id
      };

      const evaluation = new Evaluation(evaluationData);
      const savedEvaluation = await evaluation.save();

      expect(savedEvaluation.sessionId).toEqual(testSession._id);
      expect(savedEvaluation.userId).toEqual(testUser._id);
      expect(savedEvaluation.isComplete).toBe(false);
      expect(savedEvaluation.scores).toHaveLength(0);
      expect(savedEvaluation.comments).toHaveLength(0);
      expect(savedEvaluation.submittedAt).toBeUndefined();
    });
  });

  describe('Validation', () => {
    it('should require sessionId', async () => {
      const evaluationData = {
        userId: testUser._id
      };

      const evaluation = new Evaluation(evaluationData);

      await expect(evaluation.save()).rejects.toThrow('セッションIDは必須です');
    });

    it('should require userId', async () => {
      const evaluationData = {
        sessionId: testSession._id
      };

      const evaluation = new Evaluation(evaluationData);

      await expect(evaluation.save()).rejects.toThrow('ユーザーIDは必須です');
    });

    it('should validate score range', async () => {
      const evaluationData = {
        sessionId: testSession._id,
        userId: testUser._id,
        scores: [{
          criterionId: 'criterion1',
          score: 150 // Too high
        }]
      };

      const evaluation = new Evaluation(evaluationData);

      await expect(evaluation.save()).rejects.toThrow('スコアは100以下である必要があります');
    });

    it('should validate negative score', async () => {
      const evaluationData = {
        sessionId: testSession._id,
        userId: testUser._id,
        scores: [{
          criterionId: 'criterion1',
          score: -10 // Negative
        }]
      };

      const evaluation = new Evaluation(evaluationData);

      await expect(evaluation.save()).rejects.toThrow('スコアは0以上である必要があります');
    });

    it('should validate comment length in scores', async () => {
      const evaluationData = {
        sessionId: testSession._id,
        userId: testUser._id,
        scores: [{
          criterionId: 'criterion1',
          score: 85,
          comment: 'a'.repeat(1001) // Too long
        }]
      };

      const evaluation = new Evaluation(evaluationData);

      await expect(evaluation.save()).rejects.toThrow('コメントは1000文字以下である必要があります');
    });

    it('should validate comment timestamp', async () => {
      const evaluationData = {
        sessionId: testSession._id,
        userId: testUser._id,
        comments: [{
          userId: testUser._id,
          timestamp: -10, // Negative timestamp
          text: 'Test comment'
        }]
      };

      const evaluation = new Evaluation(evaluationData);

      await expect(evaluation.save()).rejects.toThrow('タイムスタンプは0以上である必要があります');
    });

    it('should validate comment text length', async () => {
      const evaluationData = {
        sessionId: testSession._id,
        userId: testUser._id,
        comments: [{
          userId: testUser._id,
          timestamp: 120,
          text: 'a'.repeat(2001) // Too long
        }]
      };

      const evaluation = new Evaluation(evaluationData);

      await expect(evaluation.save()).rejects.toThrow('コメントは2000文字以下である必要があります');
    });

    it('should require comment text', async () => {
      const evaluationData = {
        sessionId: testSession._id,
        userId: testUser._id,
        comments: [{
          userId: testUser._id,
          timestamp: 120
          // Missing text
        }]
      };

      const evaluation = new Evaluation(evaluationData);

      await expect(evaluation.save()).rejects.toThrow('コメント内容は必須です');
    });
  });

  describe('Unique Constraints', () => {
    it('should enforce unique sessionId-userId combination', async () => {
      const evaluationData1 = {
        sessionId: testSession._id,
        userId: testUser._id
      };

      const evaluationData2 = {
        sessionId: testSession._id,
        userId: testUser._id // Same combination
      };

      const evaluation1 = new Evaluation(evaluationData1);
      await evaluation1.save();

      const evaluation2 = new Evaluation(evaluationData2);
      await expect(evaluation2.save()).rejects.toThrow();
    });
  });

  describe('Methods', () => {
    it('should check completion correctly when all criteria are scored', async () => {
      const templateCategories = [
        {
          criteria: [
            { id: 'criterion1' },
            { id: 'criterion2' }
          ]
        }
      ];

      const evaluationData = {
        sessionId: testSession._id,
        userId: testUser._id,
        scores: [
          { criterionId: 'criterion1', score: 85 },
          { criterionId: 'criterion2', score: 90 }
        ]
      };

      const evaluation = new Evaluation(evaluationData);
      const savedEvaluation = await evaluation.save();

      const isComplete = savedEvaluation.checkCompletion(templateCategories);
      expect(isComplete).toBe(true);
      expect(savedEvaluation.isComplete).toBe(true);
    });

    it('should check completion correctly when criteria are missing', async () => {
      const templateCategories = [
        {
          criteria: [
            { id: 'criterion1' },
            { id: 'criterion2' },
            { id: 'criterion3' }
          ]
        }
      ];

      const evaluationData = {
        sessionId: testSession._id,
        userId: testUser._id,
        scores: [
          { criterionId: 'criterion1', score: 85 },
          { criterionId: 'criterion2', score: 90 }
          // Missing criterion3
        ]
      };

      const evaluation = new Evaluation(evaluationData);
      const savedEvaluation = await evaluation.save();

      const isComplete = savedEvaluation.checkCompletion(templateCategories);
      expect(isComplete).toBe(false);
      expect(savedEvaluation.isComplete).toBe(false);
    });
  });

  describe('Pre-save Hooks', () => {
    it('should update lastSavedAt on save', async () => {
      const evaluationData = {
        sessionId: testSession._id,
        userId: testUser._id
      };

      const evaluation = new Evaluation(evaluationData);
      const savedEvaluation = await evaluation.save();

      const originalLastSavedAt = savedEvaluation.lastSavedAt;

      // Wait a bit and save again
      await new Promise(resolve => setTimeout(resolve, 10));
      savedEvaluation.isComplete = true;
      const updatedEvaluation = await savedEvaluation.save();

      expect(updatedEvaluation.lastSavedAt.getTime()).toBeGreaterThan(originalLastSavedAt.getTime());
    });
  });

  describe('Indexes', () => {
    it('should have proper indexes', async () => {
      const indexes = await Evaluation.collection.getIndexes();
      const indexNames = Object.keys(indexes);

      expect(indexNames).toContain('sessionId_1_userId_1');
      expect(indexNames).toContain('sessionId_1');
      expect(indexNames).toContain('userId_1');
      expect(indexNames).toContain('submittedAt_1');
      expect(indexNames).toContain('isComplete_1');
    });
  });
});