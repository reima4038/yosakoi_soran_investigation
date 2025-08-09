import request from 'supertest';
import app from '../../index';
import { Template } from '../../models/Template';
import { User } from '../../models/User';
import { connectDB, disconnectDB } from '../setup';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

describe('Template Routes', () => {
  let authToken: string;
  let userId: string;

  beforeAll(async () => {
    await connectDB();

    // Wait for connection to be ready
    if (mongoose.connection.readyState !== 1) {
      await new Promise((resolve) => {
        mongoose.connection.once('connected', resolve);
      });
    }

    // Clean up any existing data
    await User.deleteMany({});
    await Template.deleteMany({});

    // テスト用ユーザーを作成
    const user = new User({
      username: 'testuser',
      email: 'test@example.com',
      passwordHash: 'hashedpassword',
      role: 'user',
    });
    const savedUser = await user.save();
    userId = String(savedUser._id);

    // JWTトークンを生成
    authToken = jwt.sign(
      { userId: savedUser._id, username: savedUser.username, email: savedUser.email, role: savedUser.role },
      process.env.JWT_SECRET || 'test-secret-key-for-testing',
      { 
        expiresIn: '1h',
        issuer: 'yosakoi-evaluation-system',
        audience: 'yosakoi-users'
      }
    );
  });

  afterAll(async () => {
    // テストデータをクリーンアップ
    await Template.deleteMany({});
    await User.deleteMany({});
    await disconnectDB();
  });

  beforeEach(async () => {
    // 各テスト前にテンプレートデータをクリーンアップ
    await Template.deleteMany({});
  });

  afterEach(async () => {
    // 各テスト後にテンプレートデータをクリーンアップ
    await Template.deleteMany({});
  });

  describe('POST /api/templates', () => {
    const validTemplateData = {
      name: 'テストテンプレート',
      description: 'テスト用の評価テンプレートです',
      categories: [
        {
          id: 'cat1',
          name: 'カテゴリ1',
          description: 'カテゴリ1の説明',
          weight: 1.0,
          criteria: [
            {
              id: 'crit1',
              name: '評価基準1',
              description: '評価基準1の説明',
              type: 'scale',
              minValue: 1,
              maxValue: 5,
              weight: 1.0,
            },
          ],
        },
      ],
    };

    it('should create a new template successfully', async () => {
      const response = await request(app)
        .post('/api/templates')
        .set('Authorization', `Bearer ${authToken}`)
        .send(validTemplateData)
        .expect(201);

      expect(response.body.status).toBe('success');
      expect(response.body.data.name).toBe(validTemplateData.name);
      expect(response.body.data.description).toBe(
        validTemplateData.description
      );
      expect(response.body.data.categories).toHaveLength(1);
      expect(response.body.data.creatorId._id).toBe(userId);
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .post('/api/templates')
        .send(validTemplateData)
        .expect(401);

      expect(response.body.status).toBe('error');
    });

    it('should return 400 for missing required fields', async () => {
      const invalidData = {
        name: '',
        description: '',
        categories: [],
      };

      const response = await request(app)
        .post('/api/templates')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('必須');
    });

    it('should return 400 for invalid category weights', async () => {
      const invalidWeightData = {
        ...validTemplateData,
        categories: [
          {
            ...validTemplateData.categories[0],
            weight: 0.5, // 合計が1にならない
          },
        ],
      };

      const response = await request(app)
        .post('/api/templates')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidWeightData)
        .expect(400);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('重み');
    });
  });

  describe('GET /api/templates', () => {
    it('should get all templates successfully', async () => {
      // テスト用テンプレートを作成
      const template = new Template({
        name: 'テストテンプレート',
        description: 'テスト用の評価テンプレートです',
        creatorId: userId,
        categories: [
          {
            id: 'cat1',
            name: 'カテゴリ1',
            description: 'カテゴリ1の説明',
            weight: 1.0,
            criteria: [
              {
                id: 'crit1',
                name: '評価基準1',
                description: '評価基準1の説明',
                type: 'scale',
                minValue: 1,
                maxValue: 5,
                weight: 1.0,
              },
            ],
          },
        ],
      });
      await template.save();

      const response = await request(app)
        .get('/api/templates')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].name).toBe('テストテンプレート');
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app).get('/api/templates').expect(401);

      expect(response.body.status).toBe('error');
    });
  });

  describe('GET /api/templates/:id', () => {
    it('should get template by id successfully', async () => {
      // テスト用テンプレートを作成
      const template = new Template({
        name: 'テストテンプレート',
        description: 'テスト用の評価テンプレートです',
        creatorId: userId,
        categories: [
          {
            id: 'cat1',
            name: 'カテゴリ1',
            description: 'カテゴリ1の説明',
            weight: 1.0,
            criteria: [
              {
                id: 'crit1',
                name: '評価基準1',
                description: '評価基準1の説明',
                type: 'scale',
                minValue: 1,
                maxValue: 5,
                weight: 1.0,
              },
            ],
          },
        ],
      });
      const savedTemplate = await template.save();
      const templateId = String(savedTemplate._id);

      const response = await request(app)
        .get(`/api/templates/${templateId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data._id).toBe(templateId);
      expect(response.body.data.name).toBe('テストテンプレート');
    });

    it('should return 404 for non-existent template', async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toString();
      const response = await request(app)
        .get(`/api/templates/${nonExistentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('見つかりません');
    });

    it('should return 400 for invalid template id', async () => {
      const response = await request(app)
        .get('/api/templates/invalid-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('無効');
    });
  });
});
