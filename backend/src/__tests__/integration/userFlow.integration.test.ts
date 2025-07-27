import request from 'supertest';
import app from '../../index';
import { connectDB, disconnectDB } from '../setup';
import { User } from '../../models/User';
import { Video } from '../../models/Video';
import { Session } from '../../models/Session';
import { Template } from '../../models/Template';

describe('User Flow Integration Tests', () => {
  let authToken: string;
  let userId: string;

  beforeAll(async () => {
    await connectDB();
  });

  afterAll(async () => {
    await disconnectDB();
  });

  beforeEach(async () => {
    // Clean up all collections
    await User.deleteMany({});
    await Video.deleteMany({});
    await Session.deleteMany({});
    await Template.deleteMany({});

    // Create and authenticate a test user
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'testuser',
        email: 'test@example.com',
        password: 'Password123'
      });

    authToken = registerResponse.body.data.token;
    userId = registerResponse.body.data.user._id;
  });

  describe('Complete Evaluation Session Flow', () => {
    it('should complete full evaluation session workflow', async () => {
      // Step 1: Create a template
      const templateData = {
        name: 'テスト評価テンプレート',
        description: 'テスト用の評価テンプレート',
        categories: [
          {
            name: 'テクニック',
            description: '技術的な評価',
            weight: 0.4,
            criteria: [
              {
                name: '基本動作',
                description: '基本的な動作の正確性',
                type: 'numeric',
                minValue: 0,
                maxValue: 100,
                weight: 1.0
              }
            ]
          },
          {
            name: '表現力',
            description: '表現力の評価',
            weight: 0.6,
            criteria: [
              {
                name: '感情表現',
                description: '感情の表現力',
                type: 'numeric',
                minValue: 0,
                maxValue: 100,
                weight: 1.0
              }
            ]
          }
        ]
      };

      const templateResponse = await request(app)
        .post('/api/templates')
        .set('Authorization', `Bearer ${authToken}`)
        .send(templateData);

      expect(templateResponse.status).toBe(201);
      const templateId = templateResponse.body.data._id;

      // Step 2: Register a video (mock YouTube API response)
      // const videoData = {
      //   youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      //   metadata: {
      //     teamName: 'テストチーム',
      //     performanceName: 'テスト演舞',
      //     eventName: 'テスト大会',
      //     year: 2023,
      //     location: 'テスト会場'
      //   },
      //   tags: ['テスト', 'よさこい']
      // };

      // Note: This will fail without proper YouTube API setup, but we can test the structure
      // For integration testing, we might need to mock the YouTube service
      
      // Step 3: Create a session (using a mock video ID)
      const mockVideo = new Video({
        youtubeId: 'dQw4w9WgXcQ',
        title: 'Test Video',
        channelName: 'Test Channel',
        uploadDate: new Date(),
        thumbnailUrl: 'https://example.com/thumb.jpg',
        createdBy: userId
      });
      await mockVideo.save();

      const sessionData = {
        name: 'テスト評価セッション',
        description: 'テスト用の評価セッション',
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 86400000).toISOString(), // 1 day later
        videoId: mockVideo._id,
        templateId: templateId,
        settings: {
          isAnonymous: false,
          showResultsAfterSubmit: true,
          allowComments: true
        }
      };

      const sessionResponse = await request(app)
        .post('/api/sessions')
        .set('Authorization', `Bearer ${authToken}`)
        .send(sessionData);

      expect(sessionResponse.status).toBe(201);
      const sessionId = sessionResponse.body.data._id;

      // Step 4: Invite evaluators (self-invitation for testing)
      const inviteResponse = await request(app)
        .post(`/api/sessions/${sessionId}/invite`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          emails: ['test@example.com'],
          message: 'テスト評価への招待'
        });

      expect(inviteResponse.status).toBe(200);

      // Step 5: Start evaluation
      const evaluationResponse = await request(app)
        .get(`/api/evaluations/session/${sessionId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(evaluationResponse.status).toBe(200);

      // Step 6: Save evaluation scores
      const scoresData = {
        scores: [
          {
            criterionId: templateResponse.body.data.categories[0].criteria[0].id,
            score: 85,
            comment: '良い基本動作でした'
          },
          {
            criterionId: templateResponse.body.data.categories[1].criteria[0].id,
            score: 90,
            comment: '素晴らしい表現力'
          }
        ]
      };

      const saveScoresResponse = await request(app)
        .put(`/api/evaluations/session/${sessionId}/scores`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(scoresData);

      expect(saveScoresResponse.status).toBe(200);

      // Step 7: Add timeline comments
      const commentData = {
        timestamp: 120,
        text: 'この部分の動きが特に良かった'
      };

      const commentResponse = await request(app)
        .post(`/api/evaluations/session/${sessionId}/comments`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(commentData);

      expect(commentResponse.status).toBe(201);

      // Step 8: Submit evaluation
      const submitResponse = await request(app)
        .post(`/api/evaluations/session/${sessionId}/submit`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(submitResponse.status).toBe(200);
      expect(submitResponse.body.data.isComplete).toBe(true);
      expect(submitResponse.body.data.submittedAt).toBeDefined();

      // Step 9: Check session progress
      const progressResponse = await request(app)
        .get(`/api/sessions/${sessionId}/progress`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(progressResponse.status).toBe(200);
      expect(progressResponse.body.data.completedEvaluations).toBe(1);
      expect(progressResponse.body.data.totalEvaluators).toBe(1);

      // Step 10: Get session details with results
      const sessionDetailsResponse = await request(app)
        .get(`/api/sessions/${sessionId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(sessionDetailsResponse.status).toBe(200);
      expect(sessionDetailsResponse.body.data.name).toBe(sessionData.name);
    });
  });

  describe('Multi-user Evaluation Flow', () => {
    it('should handle multiple evaluators in same session', async () => {
      // Create second user
      const user2Response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'evaluator2',
          email: 'evaluator2@example.com',
          password: 'Password123'
        });

      const user2Token = user2Response.body.data.token;

      // Create template and video (simplified)
      const template = new Template({
        name: 'Multi-user Template',
        description: 'Template for multi-user testing',
        creatorId: userId,
        categories: [{
          name: 'Overall',
          description: 'Overall evaluation',
          weight: 1.0,
          criteria: [{
            name: 'Performance',
            description: 'Overall performance',
            type: 'numeric',
            minValue: 0,
            maxValue: 100,
            weight: 1.0
          }]
        }]
      });
      await template.save();

      const video = new Video({
        youtubeId: 'test123456',
        title: 'Multi-user Test Video',
        channelName: 'Test Channel',
        uploadDate: new Date(),
        thumbnailUrl: 'https://example.com/thumb.jpg',
        createdBy: userId
      });
      await video.save();

      // Create session
      const sessionData = {
        name: 'Multi-user Session',
        description: 'Session for multiple evaluators',
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 86400000).toISOString(),
        videoId: video._id,
        templateId: template._id
      };

      const sessionResponse = await request(app)
        .post('/api/sessions')
        .set('Authorization', `Bearer ${authToken}`)
        .send(sessionData);

      const sessionId = sessionResponse.body.data._id;

      // Invite second user
      await request(app)
        .post(`/api/sessions/${sessionId}/invite`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          emails: ['evaluator2@example.com'],
          message: 'Multi-user test invitation'
        });

      // Both users start evaluation
      const eval1Response = await request(app)
        .get(`/api/evaluations/session/${sessionId}`)
        .set('Authorization', `Bearer ${authToken}`);

      const eval2Response = await request(app)
        .get(`/api/evaluations/session/${sessionId}`)
        .set('Authorization', `Bearer ${user2Token}`);

      expect(eval1Response.status).toBe(200);
      expect(eval2Response.status).toBe(200);

      // Both users submit different scores
      const criterionId = template.categories[0].criteria[0].id;

      await request(app)
        .put(`/api/evaluations/session/${sessionId}/scores`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          scores: [{
            criterionId: criterionId,
            score: 80,
            comment: 'User 1 evaluation'
          }]
        });

      await request(app)
        .put(`/api/evaluations/session/${sessionId}/scores`)
        .set('Authorization', `Bearer ${user2Token}`)
        .send({
          scores: [{
            criterionId: criterionId,
            score: 90,
            comment: 'User 2 evaluation'
          }]
        });

      // Both users submit
      await request(app)
        .post(`/api/evaluations/session/${sessionId}/submit`)
        .set('Authorization', `Bearer ${authToken}`);

      await request(app)
        .post(`/api/evaluations/session/${sessionId}/submit`)
        .set('Authorization', `Bearer ${user2Token}`);

      // Check final progress
      const finalProgressResponse = await request(app)
        .get(`/api/sessions/${sessionId}/progress`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(finalProgressResponse.status).toBe(200);
      expect(finalProgressResponse.body.data.completedEvaluations).toBe(2);
      expect(finalProgressResponse.body.data.totalEvaluators).toBe(2);
    });
  });

  describe('Error Handling in User Flows', () => {
    it('should handle unauthorized access attempts', async () => {
      // Try to create session without auth
      const response1 = await request(app)
        .post('/api/sessions')
        .send({
          name: 'Unauthorized Session',
          videoId: 'some-id',
          templateId: 'some-id'
        });

      expect(response1.status).toBe(401);

      // Try to access evaluation without auth
      const response2 = await request(app)
        .get('/api/evaluations/session/some-id');

      expect(response2.status).toBe(401);
    });

    it('should handle invalid resource access', async () => {
      // Try to access non-existent session
      const response1 = await request(app)
        .get('/api/sessions/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response1.status).toBe(404);

      // Try to evaluate non-existent session
      const response2 = await request(app)
        .get('/api/evaluations/session/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response2.status).toBe(404);
    });
  });
});