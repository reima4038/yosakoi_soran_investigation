import request from 'supertest';
import app from '../../index';
import { Session, SessionStatus } from '../../models/Session';
import { Video } from '../../models/Video';
import { Template } from '../../models/Template';
import { User } from '../../models/User';
import { connectDB, disconnectDB } from '../setup';
import jwt from 'jsonwebtoken';

describe('Sessions API', () => {
  let authToken: string;
  let testUser: any;
  let testVideo: any;
  let testTemplate: any;

  beforeAll(async () => {
    await connectDB();
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
      youtubeId: 'dQw4w9WgXcQ', // Valid YouTube ID format
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
        name: 'テストカテゴリ',
        description: 'テスト用カテゴリ',
        weight: 1.0,
        criteria: [{
          name: 'テスト項目',
          description: 'テスト用評価項目',
          type: 'numeric',
          minValue: 1,
          maxValue: 10,
          weight: 1.0
        }]
      }]
    });
  });

  afterEach(async () => {
    await Session.deleteMany({});
    await Video.deleteMany({});
    await Template.deleteMany({});
    await User.deleteMany({});
  });

  describe('POST /api/sessions', () => {
    it('有効なデータでセッションを作成できる', async () => {
      const sessionData = {
        name: 'テストセッション',
        description: 'テスト用のセッションです',
        videoId: testVideo._id.toString(),
        templateId: testTemplate._id.toString(),
        settings: {
          allowAnonymous: false,
          requireComments: true,
          showRealTimeResults: true,
          maxEvaluationsPerUser: 1
        }
      };

      const response = await request(app)
        .post('/api/sessions')
        .set('Authorization', `Bearer ${authToken}`)
        .send(sessionData)
        .expect(201);

      expect(response.body.status).toBe('success');
      expect(response.body.data.name).toBe(sessionData.name);
      expect(response.body.data.description).toBe(sessionData.description);
      expect(response.body.data.status).toBe(SessionStatus.DRAFT);
    });

    it('必須フィールドが不足している場合はエラーを返す', async () => {
      const sessionData = {
        description: 'テスト用のセッションです'
        // name, videoId, templateId が不足
      };

      const response = await request(app)
        .post('/api/sessions')
        .set('Authorization', `Bearer ${authToken}`)
        .send(sessionData)
        .expect(400);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('必須');
    });

    it('存在しない動画IDの場合はエラーを返す', async () => {
      const sessionData = {
        name: 'テストセッション',
        videoId: '507f1f77bcf86cd799439011', // 存在しないID
        templateId: testTemplate._id.toString()
      };

      const response = await request(app)
        .post('/api/sessions')
        .set('Authorization', `Bearer ${authToken}`)
        .send(sessionData)
        .expect(404);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('動画が見つかりません');
    });

    it('認証なしではアクセスできない', async () => {
      const sessionData = {
        name: 'テストセッション',
        videoId: testVideo._id.toString(),
        templateId: testTemplate._id.toString()
      };

      await request(app)
        .post('/api/sessions')
        .send(sessionData)
        .expect(401);
    });
  });

  describe('GET /api/sessions', () => {
    beforeEach(async () => {
      // テスト用セッションを作成
      await Session.create({
        name: 'テストセッション1',
        description: 'テスト用セッション1',
        videoId: testVideo._id,
        templateId: testTemplate._id,
        creatorId: testUser._id,
        status: SessionStatus.DRAFT
      });

      await Session.create({
        name: 'テストセッション2',
        description: 'テスト用セッション2',
        videoId: testVideo._id,
        templateId: testTemplate._id,
        creatorId: testUser._id,
        status: SessionStatus.ACTIVE,
        startDate: new Date(Date.now() + 1000), // 1秒後に設定
        evaluators: [testUser._id]
      });
    });

    it('セッション一覧を取得できる', async () => {
      const response = await request(app)
        .get('/api/sessions')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.sessions).toHaveLength(2);
      expect(response.body.data.pagination).toBeDefined();
    });

    it('ステータスでフィルタリングできる', async () => {
      const response = await request(app)
        .get('/api/sessions?status=active')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.sessions).toHaveLength(1);
      expect(response.body.data.sessions[0].status).toBe(SessionStatus.ACTIVE);
    });

    it('ページネーションが機能する', async () => {
      const response = await request(app)
        .get('/api/sessions?page=1&limit=1')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.sessions).toHaveLength(1);
      expect(response.body.data.pagination.page).toBe(1);
      expect(response.body.data.pagination.limit).toBe(1);
    });
  });

  describe('GET /api/sessions/:id', () => {
    let testSession: any;

    beforeEach(async () => {
      testSession = await Session.create({
        name: 'テストセッション',
        description: 'テスト用セッション',
        videoId: testVideo._id,
        templateId: testTemplate._id,
        creatorId: testUser._id,
        status: SessionStatus.DRAFT
      });
    });

    it('セッション詳細を取得できる', async () => {
      const response = await request(app)
        .get(`/api/sessions/${testSession._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.name).toBe(testSession.name);
      expect(response.body.data.videoId).toBeDefined();
      expect(response.body.data.templateId).toBeDefined();
    });

    it('存在しないセッションIDの場合はエラーを返す', async () => {
      const response = await request(app)
        .get('/api/sessions/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('セッションが見つかりません');
    });

    it('無効なセッションIDの場合はエラーを返す', async () => {
      const response = await request(app)
        .get('/api/sessions/invalid-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('無効なセッションID');
    });
  });

  describe('PUT /api/sessions/:id', () => {
    let testSession: any;

    beforeEach(async () => {
      testSession = await Session.create({
        name: 'テストセッション',
        description: 'テスト用セッション',
        videoId: testVideo._id,
        templateId: testTemplate._id,
        creatorId: testUser._id,
        status: SessionStatus.DRAFT
      });
    });

    it('セッションを更新できる', async () => {
      const updates = {
        name: '更新されたセッション',
        description: '更新された説明'
      };

      const response = await request(app)
        .put(`/api/sessions/${testSession._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updates)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.name).toBe(updates.name);
      expect(response.body.data.description).toBe(updates.description);
    });

    it('作成者以外は更新できない', async () => {
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

      const updates = {
        name: '更新されたセッション'
      };

      const response = await request(app)
        .put(`/api/sessions/${testSession._id}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send(updates)
        .expect(403);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('権限がありません');
    });
  });

  describe('DELETE /api/sessions/:id', () => {
    let testSession: any;

    beforeEach(async () => {
      testSession = await Session.create({
        name: 'テストセッション',
        description: 'テスト用セッション',
        videoId: testVideo._id,
        templateId: testTemplate._id,
        creatorId: testUser._id,
        status: SessionStatus.DRAFT
      });
    });

    it('セッションを削除できる', async () => {
      const response = await request(app)
        .delete(`/api/sessions/${testSession._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.message).toContain('削除されました');

      // セッションが削除されたことを確認
      const deletedSession = await Session.findById(testSession._id);
      expect(deletedSession).toBeNull();
    });

    it('アクティブなセッションは削除できない', async () => {
      // セッションをアクティブにする
      testSession.status = SessionStatus.ACTIVE;
      testSession.startDate = new Date(Date.now() + 1000); // 1秒後に設定
      testSession.evaluators = [testUser._id];
      await testSession.save();

      const response = await request(app)
        .delete(`/api/sessions/${testSession._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('アクティブなセッションは削除できません');
    });

    it('作成者以外は削除できない', async () => {
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
        .delete(`/api/sessions/${testSession._id}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(403);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('権限がありません');
    });
  });

  describe('POST /api/sessions/:id/invite', () => {
    let testSession: any;

    beforeEach(async () => {
      testSession = await Session.create({
        name: 'テストセッション',
        description: 'テスト用セッション',
        videoId: testVideo._id,
        templateId: testTemplate._id,
        creatorId: testUser._id,
        status: SessionStatus.DRAFT
      });
    });

    it('評価者を招待できる', async () => {
      const inviteData = {
        emails: ['evaluator1@example.com', 'evaluator2@example.com'],
        message: 'セッションへの参加をお願いします'
      };

      const response = await request(app)
        .post(`/api/sessions/${testSession._id}/invite`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(inviteData)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.invitations).toHaveLength(2);
      expect(response.body.data.invitations[0].email).toBe('evaluator1@example.com');
      expect(response.body.data.invitations[0].inviteLink).toContain('/sessions/');
    });

    it('メールアドレスが空の場合はエラーを返す', async () => {
      const inviteData = {
        emails: []
      };

      const response = await request(app)
        .post(`/api/sessions/${testSession._id}/invite`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(inviteData)
        .expect(400);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('メールアドレス');
    });

    it('作成者以外は招待できない', async () => {
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

      const inviteData = {
        emails: ['evaluator@example.com']
      };

      const response = await request(app)
        .post(`/api/sessions/${testSession._id}/invite`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send(inviteData)
        .expect(403);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('権限がありません');
    });
  });

  describe('POST /api/sessions/:id/join', () => {
    let testSession: any;
    let inviteToken: string;

    beforeEach(async () => {
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

      // 招待トークンを生成
      inviteToken = jwt.sign(
        { sessionId: testSession._id.toString(), type: 'session-invite' },
        process.env.JWT_SECRET || 'test-secret-key-for-testing',
        { expiresIn: '7d' }
      );
    });

    it('有効な招待トークンでセッションに参加できる', async () => {
      const joinData = {
        token: inviteToken,
        userInfo: { userId: testUser._id.toString() }
      };

      const response = await request(app)
        .post(`/api/sessions/${testSession._id}/join`)
        .send(joinData)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.session.name).toBe(testSession.name);
      expect(response.body.data.message).toContain('参加しました');
    });

    it('無効なトークンの場合はエラーを返す', async () => {
      const joinData = {
        token: 'invalid-token'
      };

      const response = await request(app)
        .post(`/api/sessions/${testSession._id}/join`)
        .send(joinData)
        .expect(400);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('無効');
    });

    it('トークンが不足している場合はエラーを返す', async () => {
      const joinData = {};

      const response = await request(app)
        .post(`/api/sessions/${testSession._id}/join`)
        .send(joinData)
        .expect(400);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('招待トークンが必要');
    });
  });

  describe('PATCH /api/sessions/:id/status', () => {
    let testSession: any;

    beforeEach(async () => {
      testSession = await Session.create({
        name: 'テストセッション',
        description: 'テスト用セッション',
        videoId: testVideo._id,
        templateId: testTemplate._id,
        creatorId: testUser._id,
        status: SessionStatus.DRAFT,
        evaluators: [testUser._id]
      });
    });

    it('セッションステータスを更新できる', async () => {
      const response = await request(app)
        .patch(`/api/sessions/${testSession._id}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: SessionStatus.ACTIVE })
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.status).toBe(SessionStatus.ACTIVE);
      expect(response.body.data.startDate).toBeDefined();
    });

    it('無効なステータスの場合はエラーを返す', async () => {
      const response = await request(app)
        .patch(`/api/sessions/${testSession._id}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'invalid-status' })
        .expect(400);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('無効なステータス');
    });

    it('作成者以外はステータス変更できない', async () => {
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
        .patch(`/api/sessions/${testSession._id}/status`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ status: SessionStatus.ACTIVE })
        .expect(403);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('権限がありません');
    });
  });

  describe('GET /api/sessions/:id/progress', () => {
    let testSession: any;

    beforeEach(async () => {
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

    it('セッション進捗を取得できる', async () => {
      const response = await request(app)
        .get(`/api/sessions/${testSession._id}/progress`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.totalEvaluators).toBeDefined();
      expect(response.body.data.completedEvaluations).toBeDefined();
      expect(response.body.data.completionRate).toBeDefined();
      expect(response.body.data.evaluators).toBeInstanceOf(Array);
    });

    it('アクセス権限がない場合はエラーを返す', async () => {
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
        .get(`/api/sessions/${testSession._id}/progress`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(403);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('権限がありません');
    });
  });

  describe('GET /api/sessions/notifications/overdue', () => {
    beforeEach(async () => {
      // 期限切れのセッションを作成（DRAFTで作成してからACTIVEに変更）
      const overdueSession = await Session.create({
        name: '期限切れセッション',
        description: '期限切れのテストセッション',
        videoId: testVideo._id,
        templateId: testTemplate._id,
        creatorId: testUser._id,
        status: SessionStatus.DRAFT,
        evaluators: [testUser._id]
      });
      
      // 手動でステータスと日時を設定（バリデーションを回避）
      await Session.findByIdAndUpdate(overdueSession._id, {
        status: SessionStatus.ACTIVE,
        startDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2日前
        endDate: new Date(Date.now() - 24 * 60 * 60 * 1000) // 1日前（期限切れ）
      });

      // 期限が近いセッションを作成
      await Session.create({
        name: '期限間近セッション',
        description: '期限が近いテストセッション',
        videoId: testVideo._id,
        templateId: testTemplate._id,
        creatorId: testUser._id,
        status: SessionStatus.ACTIVE,
        startDate: new Date(Date.now() + 1000), // 1秒後
        endDate: new Date(Date.now() + 12 * 60 * 60 * 1000), // 12時間後
        evaluators: [testUser._id]
      });
    });

    it('期限切れ通知を取得できる', async () => {
      const response = await request(app)
        .get('/api/sessions/notifications/overdue')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.overdue).toBeInstanceOf(Array);
      expect(response.body.data.upcoming).toBeInstanceOf(Array);
      expect(response.body.data.overdue.length).toBeGreaterThan(0);
      expect(response.body.data.upcoming.length).toBeGreaterThan(0);
    });
  });
});