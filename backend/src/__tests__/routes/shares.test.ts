import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../index';
import { User } from '../../models/User';
import { Session } from '../../models/Session';
import { Video } from '../../models/Video';
import { Template } from '../../models/Template';
import { Share, ShareType, ShareVisibility } from '../../models/Share';
import { AuthService } from '../../services/authService';
import { it } from 'node:test';
import { it } from 'node:test';
import { afterEach } from 'node:test';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { describe } from 'node:test';

describe('Shares API', () => {
  let authToken: string;
  let userId: string;
  let sessionId: string;

  beforeAll(async () => {
    // テスト用ユーザー作成
    const user = new User({
      username: 'testuser',
      email: 'test@example.com',
      passwordHash: 'hashedpassword',
      role: 'evaluator',
    });
    await user.save();
    userId = (user._id as mongoose.Types.ObjectId).toString();

    // 認証トークン生成
    authToken = AuthService.generateToken({
      userId: userId,
      username: user.username,
      email: user.email,
      role: user.role,
    });

    // テスト用動画作成
    const video = new Video({
      youtubeId: 'test-video-id',
      title: 'テスト動画',
      channelName: 'テストチャンネル',
      uploadDate: new Date(),
      description: 'テスト用の動画です',
      thumbnailUrl: 'https://example.com/thumbnail.jpg',
      createdBy: new mongoose.Types.ObjectId(userId),
    });
    await video.save();

    // テスト用テンプレート作成
    const template = new Template({
      name: 'テストテンプレート',
      description: 'テスト用のテンプレートです',
      categories: [
        {
          id: 'category1',
          name: 'カテゴリ1',
          description: 'テストカテゴリ',
          weight: 1.0,
          criteria: [
            {
              id: 'criterion1',
              name: '評価項目1',
              description: 'テスト評価項目',
              type: 'numeric',
              minValue: 0,
              maxValue: 10,
              weight: 1.0,
            },
          ],
        },
      ],
      createdBy: new mongoose.Types.ObjectId(userId),
    });
    await template.save();

    // テスト用セッション作成
    const session = new Session({
      name: 'テストセッション',
      description: 'テスト用のセッションです',
      videoId: video._id,
      templateId: template._id,
      creatorId: new mongoose.Types.ObjectId(userId),
      evaluators: [new mongoose.Types.ObjectId(userId)],
    });
    await session.save();
    sessionId = (session._id as mongoose.Types.ObjectId).toString();
  });

  afterAll(async () => {
    await User.deleteMany({});
    await Video.deleteMany({});
    await Template.deleteMany({});
    await Session.deleteMany({});
    await Share.deleteMany({});
  });

  describe('POST /api/shares', () => {
    it('should create a new share', async () => {
      const shareData = {
        resourceType: ShareType.SESSION_RESULTS,
        resourceId: sessionId,
        visibility: ShareVisibility.PUBLIC,
        permissions: ['view', 'comment'],
        settings: {
          allowComments: true,
          allowDownload: false,
          showEvaluatorNames: false,
          showIndividualScores: true,
        },
      };

      const response = await request(app)
        .post('/api/shares')
        .set('Authorization', `Bearer ${authToken}`)
        .send(shareData)
        .expect(201);

      expect(response.body.status).toBe('success');
      expect(response.body.data.share).toBeDefined();
      expect(response.body.data.shareUrl).toBeDefined();
    });

    it('should return 401 without authentication', async () => {
      const shareData = {
        resourceType: ShareType.SESSION_RESULTS,
        resourceId: sessionId,
        visibility: ShareVisibility.PUBLIC,
      };

      await request(app).post('/api/shares').send(shareData).expect(401);
    });
  });

  describe('GET /api/shares', () => {
    beforeEach(async () => {
      const share = new Share({
        resourceType: ShareType.SESSION_RESULTS,
        resourceId: new mongoose.Types.ObjectId(sessionId),
        creatorId: new mongoose.Types.ObjectId(userId),
        shareToken: Share.generateShareToken(),
        visibility: ShareVisibility.PUBLIC,
        permissions: ['view'],
      });
      await share.save();
    });

    afterEach(async () => {
      await Share.deleteMany({});
    });

    it('should get user shares', async () => {
      const response = await request(app)
        .get('/api/shares')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.shares).toBeDefined();
    });

    it('should return 401 without authentication', async () => {
      await request(app).get('/api/shares').expect(401);
    });
  });
});
