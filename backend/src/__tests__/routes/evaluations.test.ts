import request from 'supertest';
import app from '../../index';
import { Evaluation } from '../../models/Evaluation';
import { Session, SessionStatus } from '../../models/Session';
import { Video } from '../../models/Video';
import { Template } from '../../models/Template';
import { User } from '../../models/User';
import { connectDB, disconnectDB } from '../setup';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

describe('Evaluations API', () => {
  let authToken: string;
  let testUser: any;
  let testVideo: any;
  let testTemplate: any;
  let testSession: any;

  beforeAll(async () => {
    await connectDB();
    
    // Wait for connection to be ready
    if (mongoose.connection.readyState !== 1) {
      await new Promise((resolve) => {
        mongoose.connection.once('connected', resolve);
      });
    }
  });

  afterAll(async () => {
    await disconnectDB();
  });

  beforeEach(async () => {
    // テストユーザーの作成
    testUser = await User.create({
      username: 'testuser',
      email: 'test@example.com',
      passwordHash: 'hashedpassword',
      role: 'evaluator'
    });

    // JWTトークンの生成
    authToken = jwt.sign(
      { userId: testUser._id, username: testUser.username, email: testUser.email, role: testUser.role },
      process.env.JWT_SECRET || 'test-secret-key-for-testing',
      { 
        expiresIn: '1h',
        issuer: 'yosakoi-evaluation-system',
        audience: 'yosakoi-users'
      }
    );

    // テスト用動画の作成
    testVideo = await Video.create({
      youtubeId: 'dQw4w9WgXcQ',
      title: 'テスト動画',
      channelName: 'テストチャンネル',
      uploadDate: new Date(),
      description: 'テスト用の動画です',
      metadata: {
        teamName: 'テストチーム',
        performanceName: 'テスト演舞'
      },
      tags: ['test'],
      thumbnailUrl: 'https://example.com/thumbnail.jpg',
      createdBy: testUser._id
    });

    // テスト用テンプレートの作成
    testTemplate = await Template.create({
      name: 'テストテンプレート',
      description: 'テスト用のテンプレートです',
      creatorId: testUser._id,
      categories: [{
        id: 'cat1',
        name: 'テストカテゴリ',
        description: 'テスト用カテゴリ',
        weight: 1.0,
        criteria: [{
          id: 'crit1',
          name: 'テスト項目1',
          description: 'テスト用評価項目1',
          type: 'numeric',
          minValue: 1,
          maxValue: 10,
          weight: 0.5
        }, {
          id: 'crit2',
          name: 'テスト項目2',
          description: 'テスト用評価項目2',
          type: 'scale',
          minValue: 1,
          maxValue: 5,
          weight: 0.5
        }]
      }]
    });

    // テスト用セッションの作成
    testSession = await Session.create({
      name: 'テストセッション',
      description: 'テスト用セッション',
      videoId: testVideo._id,
      templateId: testTemplate._id,
      creatorId: testUser._id,
      status: SessionStatus.ACTIVE,
      startDate: new Date(Date.now() + 1000),
      evaluators: [testUser._id]
    });
  });

  afterEach(async () => {
    await Evaluation.deleteMany({});
    await Session.deleteMany({});
    await Video.deleteMany({});
    await Template.deleteMany({});
    await User.deleteMany({});
  });

  describe('GET /api/evaluations/session/:sessionId', () => {
    it('評価を開始/取得できる', async () => {
      const response = await request(app)
        .get(`/api/evaluations/session/${testSession._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.evaluation).toBeDefined();
      expect(response.body.data.session).toBeDefined();
      expect(response.body.data.session.name).toBe(testSession.name);
      expect(response.body.data.session.template).toBeDefined();
    });

    it('存在しないセッションの場合はエラーを返す', async () => {
      const response = await request(app)
        .get('/api/evaluations/session/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('セッションが見つかりません');
    });

    it('非アクティブなセッションの場合はエラーを返す', async () => {
      // セッションを非アクティブにする
      testSession.status = SessionStatus.DRAFT;
      await testSession.save();

      const response = await request(app)
        .get(`/api/evaluations/session/${testSession._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('評価できません');
    });

    it('評価権限がない場合はエラーを返す', async () => {
      // 別のユーザーを作成
      const otherUser = await User.create({
        username: 'otheruser',
        email: 'other@example.com',
        passwordHash: 'hashedpassword',
        role: 'evaluator'
      });

      const otherToken = jwt.sign(
        { userId: otherUser._id, username: otherUser.username, email: otherUser.email, role: otherUser.role },
        process.env.JWT_SECRET || 'test-secret-key-for-testing',
        { 
          expiresIn: '1h',
          issuer: 'yosakoi-evaluation-system',
          audience: 'yosakoi-users'
        }
      );

      const response = await request(app)
        .get(`/api/evaluations/session/${testSession._id}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(403);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('評価権限がありません');
    });
  });

  describe('PUT /api/evaluations/session/:sessionId/scores', () => {
    beforeEach(async () => {
      await Evaluation.create({
        sessionId: testSession._id,
        userId: testUser._id,
        scores: [],
        comments: [],
        isComplete: false
      });
    });

    it('評価スコアを保存できる', async () => {
      const scores = [
        { criterionId: 'crit1', score: 8, comment: 'とても良い' },
        { criterionId: 'crit2', score: 4, comment: '普通' }
      ];

      const response = await request(app)
        .put(`/api/evaluations/session/${testSession._id}/scores`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ scores })
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.evaluation.scores).toHaveLength(2);
      expect(response.body.data.evaluation.scores[0].score).toBe(8);
      expect(response.body.data.evaluation.scores[0].comment).toBe('とても良い');
    });

    it('既存スコアを更新できる', async () => {
      // 最初のスコアを保存
      await request(app)
        .put(`/api/evaluations/session/${testSession._id}/scores`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ scores: [{ criterionId: 'crit1', score: 5, comment: '普通' }] });

      // スコアを更新
      const updatedScores = [
        { criterionId: 'crit1', score: 9, comment: '素晴らしい' }
      ];

      const response = await request(app)
        .put(`/api/evaluations/session/${testSession._id}/scores`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ scores: updatedScores })
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.evaluation.scores).toHaveLength(1);
      expect(response.body.data.evaluation.scores[0].score).toBe(9);
      expect(response.body.data.evaluation.scores[0].comment).toBe('素晴らしい');
    });

    it('無効なスコアデータの場合はエラーを返す', async () => {
      const response = await request(app)
        .put(`/api/evaluations/session/${testSession._id}/scores`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ scores: 'invalid' })
        .expect(400);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('スコアデータが無効');
    });
  });

  describe('POST /api/evaluations/session/:sessionId/comments', () => {
    beforeEach(async () => {
      await Evaluation.create({
        sessionId: testSession._id,
        userId: testUser._id,
        scores: [],
        comments: [],
        isComplete: false
      });
    });

    it('コメントを追加できる', async () => {
      const commentData = {
        timestamp: 120,
        text: 'この部分が素晴らしい'
      };

      const response = await request(app)
        .post(`/api/evaluations/session/${testSession._id}/comments`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(commentData)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.comment.timestamp).toBe(120);
      expect(response.body.data.comment.text).toBe('この部分が素晴らしい');
    });

    it('タイムスタンプが無効な場合はエラーを返す', async () => {
      const commentData = {
        timestamp: 'invalid',
        text: 'コメント'
      };

      const response = await request(app)
        .post(`/api/evaluations/session/${testSession._id}/comments`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(commentData)
        .expect(400);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('タイムスタンプとコメント内容は必須');
    });

    it('コメント内容が空の場合はエラーを返す', async () => {
      const commentData = {
        timestamp: 120,
        text: ''
      };

      const response = await request(app)
        .post(`/api/evaluations/session/${testSession._id}/comments`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(commentData)
        .expect(400);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('タイムスタンプとコメント内容は必須');
    });
  });

  describe('POST /api/evaluations/session/:sessionId/submit', () => {
    let testEvaluation: any;

    beforeEach(async () => {
      testEvaluation = await Evaluation.create({
        sessionId: testSession._id,
        userId: testUser._id,
        scores: [],
        comments: [],
        isComplete: false
      });

      // スコアを個別に追加
      testEvaluation.scores.push({
        evaluationId: testEvaluation._id,
        criterionId: 'crit1',
        score: 8,
        comment: 'とても良い'
      });
      testEvaluation.scores.push({
        evaluationId: testEvaluation._id,
        criterionId: 'crit2',
        score: 4,
        comment: '普通'
      });
      await testEvaluation.save();
    });

    it('完了した評価を提出できる', async () => {
      const response = await request(app)
        .post(`/api/evaluations/session/${testSession._id}/submit`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.evaluation.submittedAt).toBeDefined();
      expect(response.body.data.evaluation.isComplete).toBe(true);
    });

    it('既に提出済みの場合はエラーを返す', async () => {
      // 最初の提出
      await request(app)
        .post(`/api/evaluations/session/${testSession._id}/submit`)
        .set('Authorization', `Bearer ${authToken}`);

      // 2回目の提出
      const response = await request(app)
        .post(`/api/evaluations/session/${testSession._id}/submit`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('既に提出済み');
    });

    it('不完全な評価は提出できない', async () => {
      // スコアを削除して不完全にする
      testEvaluation.scores = [];
      testEvaluation.scores.push({
        evaluationId: testEvaluation._id,
        criterionId: 'crit1',
        score: 8,
        comment: 'とても良い'
      });
      // crit2が不足
      await testEvaluation.save();

      const response = await request(app)
        .post(`/api/evaluations/session/${testSession._id}/submit`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('すべての評価項目を入力');
      expect(response.body.data.completionDetails).toBeDefined();
      expect(response.body.data.completionDetails.isComplete).toBe(false);
      expect(response.body.data.missingCriteria).toBeDefined();
    });

    it('提出時に詳細なサマリーを返す', async () => {
      const response = await request(app)
        .post(`/api/evaluations/session/${testSession._id}/submit`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.evaluation.submittedAt).toBeDefined();
      expect(response.body.data.submissionSummary).toBeDefined();
      expect(response.body.data.submissionSummary.totalScores).toBe(2);
      expect(response.body.data.submissionSummary.sessionName).toBe(testSession.name);
      expect(response.body.data.submissionSummary.completionDetails).toBeDefined();
    });
  });

  describe('PUT /api/evaluations/session/:sessionId/comments/:commentId', () => {
    let testComment: any;

    beforeEach(async () => {
      await Evaluation.create({
        sessionId: testSession._id,
        userId: testUser._id,
        scores: [],
        comments: [],
        isComplete: false
      });

      // コメントを追加
      await request(app)
        .post(`/api/evaluations/session/${testSession._id}/comments`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ timestamp: 60, text: '元のコメント' });

      // 評価を再取得してコメントIDを取得
      const evaluation = await Evaluation.findOne({
        sessionId: testSession._id,
        userId: testUser._id
      });
      testComment = evaluation?.comments[0];
    });

    it('コメントを更新できる', async () => {
      const updatedText = '更新されたコメント';

      const response = await request(app)
        .put(`/api/evaluations/session/${testSession._id}/comments/${testComment.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ text: updatedText })
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.comment.text).toBe(updatedText);
    });

    it('空のコメントは更新できない', async () => {
      const response = await request(app)
        .put(`/api/evaluations/session/${testSession._id}/comments/${testComment.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ text: '' })
        .expect(400);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('コメント内容は必須');
    });
  });

  describe('DELETE /api/evaluations/session/:sessionId/comments/:commentId', () => {
    let testComment: any;

    beforeEach(async () => {
      await Evaluation.create({
        sessionId: testSession._id,
        userId: testUser._id,
        scores: [],
        comments: [],
        isComplete: false
      });

      // コメントを追加
      await request(app)
        .post(`/api/evaluations/session/${testSession._id}/comments`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ timestamp: 60, text: 'テストコメント' });

      // 評価を再取得してコメントIDを取得
      const evaluation = await Evaluation.findOne({
        sessionId: testSession._id,
        userId: testUser._id
      });
      testComment = evaluation?.comments[0];
    });

    it('コメントを削除できる', async () => {
      const response = await request(app)
        .delete(`/api/evaluations/session/${testSession._id}/comments/${testComment.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.message).toContain('削除されました');
    });

    it('存在しないコメントは削除できない', async () => {
      const response = await request(app)
        .delete(`/api/evaluations/session/${testSession._id}/comments/507f1f77bcf86cd799439011`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('コメントが見つかりません');
    });
  });

  describe('GET /api/evaluations/session/:sessionId/submission-status', () => {
    let testEvaluation: any;

    beforeEach(async () => {
      testEvaluation = await Evaluation.create({
        sessionId: testSession._id,
        userId: testUser._id,
        scores: [],
        comments: [],
        isComplete: false
      });

      // スコアとコメントを個別に追加
      testEvaluation.scores.push({
        evaluationId: testEvaluation._id,
        criterionId: 'crit1',
        score: 8,
        comment: 'とても良い'
      });

      testEvaluation.comments.push({
        evaluationId: testEvaluation._id,
        userId: testUser._id,
        timestamp: 60,
        text: 'テストコメント',
        createdAt: new Date()
      });

      await testEvaluation.save();
    });

    it('提出前の状況を確認できる', async () => {
      const response = await request(app)
        .get(`/api/evaluations/session/${testSession._id}/submission-status`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.isSubmitted).toBe(false);
      expect(response.body.data.submittedAt).toBeUndefined();
      expect(response.body.data.totalScores).toBe(1);
      expect(response.body.data.totalComments).toBe(1);
      expect(response.body.data.completionDetails).toBeDefined();
      expect(response.body.data.completionDetails.isComplete).toBe(false);
    });

    it('提出後の状況を確認できる', async () => {
      // 評価を完了させて提出
      testEvaluation.scores.push({
        evaluationId: testEvaluation._id,
        criterionId: 'crit2',
        score: 4,
        comment: '普通'
      });
      await testEvaluation.save();

      await request(app)
        .post(`/api/evaluations/session/${testSession._id}/submit`)
        .set('Authorization', `Bearer ${authToken}`);

      const response = await request(app)
        .get(`/api/evaluations/session/${testSession._id}/submission-status`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.isSubmitted).toBe(true);
      expect(response.body.data.submittedAt).toBeDefined();
      expect(response.body.data.isComplete).toBe(true);
      expect(response.body.data.totalScores).toBe(2);
      expect(response.body.data.completionDetails.isComplete).toBe(true);
    });

    it('存在しないセッションの場合はエラーを返す', async () => {
      const response = await request(app)
        .get('/api/evaluations/session/507f1f77bcf86cd799439011/submission-status')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('セッションが見つかりません');
    });
  });

  describe('認証なしアクセス', () => {
    it('認証なしではアクセスできない', async () => {
      await request(app)
        .get(`/api/evaluations/session/${testSession._id}`)
        .expect(401);
    });
  });
});