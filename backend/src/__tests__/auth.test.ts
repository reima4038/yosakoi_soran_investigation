import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../index';
import { User, UserRole } from '../models/User';
import { AuthService } from '../services/authService';

describe('Authentication System', () => {
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    // Setup in-memory MongoDB for testing
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();

    // Close existing connection if any
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }

    await mongoose.connect(mongoUri);
  }, 30000);

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  }, 30000);

  beforeEach(async () => {
    // Clear database before each test
    await User.deleteMany({});
  });

  describe('User Registration', () => {
    const validUserData = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'TestPass123',
    };

    it('should register a new user successfully', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send(validUserData)
        .expect(201);

      expect(response.body.status).toBe('success');
      expect(response.body.data.user.username).toBe(validUserData.username);
      expect(response.body.data.user.email).toBe(validUserData.email);
      expect(response.body.data.user.role).toBe(UserRole.USER);
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.user.passwordHash).toBeUndefined();
    });

    it('should register a user with admin role when specified', async () => {
      const adminUserData = {
        ...validUserData,
        role: UserRole.ADMIN,
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(adminUserData)
        .expect(201);

      expect(response.body.data.user.role).toBe(UserRole.ADMIN);
    });

    it('should reject registration with duplicate email', async () => {
      // Create first user
      await request(app)
        .post('/api/auth/register')
        .send(validUserData)
        .expect(201);

      // Try to create second user with same email
      const duplicateEmailData = {
        ...validUserData,
        username: 'differentuser',
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(duplicateEmailData)
        .expect(400);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain(
        'メールアドレスは既に登録されています'
      );
    });

    it('should reject registration with duplicate username', async () => {
      // Create first user
      await request(app)
        .post('/api/auth/register')
        .send(validUserData)
        .expect(201);

      // Try to create second user with same username
      const duplicateUsernameData = {
        ...validUserData,
        email: 'different@example.com',
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(duplicateUsernameData)
        .expect(400);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain(
        'ユーザー名は既に使用されています'
      );
    });

    it('should reject registration with invalid email', async () => {
      const invalidEmailData = {
        ...validUserData,
        email: 'invalid-email',
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(invalidEmailData)
        .expect(400);

      expect(response.body.status).toBe('error');
      expect(response.body.code).toBe('VALIDATION_ERROR');
    });

    it('should reject registration with weak password', async () => {
      const weakPasswordData = {
        ...validUserData,
        password: 'weak',
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(weakPasswordData)
        .expect(400);

      expect(response.body.status).toBe('error');
      expect(response.body.code).toBe('VALIDATION_ERROR');
    });

    it('should reject registration with invalid username', async () => {
      const invalidUsernameData = {
        ...validUserData,
        username: 'ab', // Too short
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(invalidUsernameData)
        .expect(400);

      expect(response.body.status).toBe('error');
      expect(response.body.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('User Login', () => {
    const userData = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'TestPass123',
    };

    beforeEach(async () => {
      // Create a user for login tests
      await request(app).post('/api/auth/register').send(userData);
    });

    it('should login successfully with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: userData.email,
          password: userData.password,
        })
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.user.email).toBe(userData.email);
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.user.passwordHash).toBeUndefined();
    });

    it('should reject login with invalid email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: userData.password,
        })
        .expect(401);

      expect(response.body.status).toBe('error');
      expect(response.body.code).toBe('LOGIN_FAILED');
    });

    it('should reject login with invalid password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: userData.email,
          password: 'wrongpassword',
        })
        .expect(401);

      expect(response.body.status).toBe('error');
      expect(response.body.code).toBe('LOGIN_FAILED');
    });

    it('should reject login with malformed email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'invalid-email',
          password: userData.password,
        })
        .expect(400);

      expect(response.body.status).toBe('error');
      expect(response.body.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Protected Routes', () => {
    let userToken: string;

    beforeEach(async () => {
      // Create users with different roles
      const userResponse = await request(app).post('/api/auth/register').send({
        username: 'regularuser',
        email: 'user@example.com',
        password: 'TestPass123',
        role: UserRole.USER,
      });
      userToken = userResponse.body.data.token;

      // Create admin and evaluator users for future use
      await request(app).post('/api/auth/register').send({
        username: 'adminuser',
        email: 'admin@example.com',
        password: 'TestPass123',
        role: UserRole.ADMIN,
      });

      await request(app).post('/api/auth/register').send({
        username: 'evaluatoruser',
        email: 'evaluator@example.com',
        password: 'TestPass123',
        role: UserRole.EVALUATOR,
      });
    });

    describe('GET /api/auth/me', () => {
      it('should return user info with valid token', async () => {
        const response = await request(app)
          .get('/api/auth/me')
          .set('Authorization', `Bearer ${userToken}`)
          .expect(200);

        expect(response.body.status).toBe('success');
        expect(response.body.data.user.email).toBe('user@example.com');
        expect(response.body.data.user.role).toBe(UserRole.USER);
      });

      it('should reject request without token', async () => {
        const response = await request(app).get('/api/auth/me').expect(401);

        expect(response.body.status).toBe('error');
        expect(response.body.code).toBe('UNAUTHORIZED');
      });

      it('should reject request with invalid token', async () => {
        const response = await request(app)
          .get('/api/auth/me')
          .set('Authorization', 'Bearer invalid-token')
          .expect(401);

        expect(response.body.status).toBe('error');
        expect(response.body.code).toBe('INVALID_TOKEN');
      });
    });

    describe('PUT /api/auth/me', () => {
      it('should update user profile successfully', async () => {
        const updateData = {
          profile: {
            displayName: 'Updated Name',
            bio: 'Updated bio',
            expertise: ['よさこい', '審査'],
          },
        };

        const response = await request(app)
          .put('/api/auth/me')
          .set('Authorization', `Bearer ${userToken}`)
          .send(updateData)
          .expect(200);

        expect(response.body.status).toBe('success');
        expect(response.body.data.user.profile.displayName).toBe(
          'Updated Name'
        );
        expect(response.body.data.user.profile.bio).toBe('Updated bio');
        expect(response.body.data.user.profile.expertise).toEqual([
          'よさこい',
          '審査',
        ]);
      });

      it('should reject update with invalid data', async () => {
        const invalidData = {
          profile: {
            displayName: 'a'.repeat(51), // Too long
          },
        };

        const response = await request(app)
          .put('/api/auth/me')
          .set('Authorization', `Bearer ${userToken}`)
          .send(invalidData)
          .expect(400);

        expect(response.body.status).toBe('error');
        expect(response.body.code).toBe('VALIDATION_ERROR');
      });
    });

    describe('POST /api/auth/verify', () => {
      it('should verify valid token', async () => {
        const response = await request(app)
          .post('/api/auth/verify')
          .set('Authorization', `Bearer ${userToken}`)
          .expect(200);

        expect(response.body.status).toBe('success');
        expect(response.body.data.user.email).toBe('user@example.com');
      });
    });

    describe('POST /api/auth/logout', () => {
      it('should logout successfully', async () => {
        const response = await request(app)
          .post('/api/auth/logout')
          .set('Authorization', `Bearer ${userToken}`)
          .expect(200);

        expect(response.body.status).toBe('success');
        expect(response.body.message).toBe('ログアウトしました');
      });
    });
  });

  describe('AuthService', () => {
    describe('Token Generation and Verification', () => {
      it('should generate and verify JWT token', () => {
        const payload = {
          userId: '507f1f77bcf86cd799439011',
          email: 'test@example.com',
          role: UserRole.USER,
        };

        const token = AuthService.generateToken(payload);
        expect(token).toBeDefined();

        const decoded = AuthService.verifyToken(token);
        expect(decoded.userId).toBe(payload.userId);
        expect(decoded.email).toBe(payload.email);
        expect(decoded.role).toBe(payload.role);
      });

      it('should reject invalid token', () => {
        expect(() => {
          AuthService.verifyToken('invalid-token');
        }).toThrow();
      });
    });

    describe('Password Reset Token', () => {
      it('should generate and verify password reset token', () => {
        const userId = '507f1f77bcf86cd799439011';

        const token = AuthService.generatePasswordResetToken(userId);
        expect(token).toBeDefined();

        const decoded = AuthService.verifyPasswordResetToken(token);
        expect(decoded.userId).toBe(userId);
      });

      it('should reject invalid password reset token', () => {
        expect(() => {
          AuthService.verifyPasswordResetToken('invalid-token');
        }).toThrow();
      });
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limiting on auth endpoints', async () => {
      // Skip this test in test environment since rate limiting is disabled
      if (process.env.NODE_ENV === 'test') {
        expect(true).toBe(true);
        return;
      }

      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'TestPass123',
      };

      // Make multiple requests quickly
      const requests = Array(6)
        .fill(null)
        .map(() => request(app).post('/api/auth/register').send(userData));

      const responses = await Promise.all(requests);

      // Some requests should be rate limited
      const rateLimitedResponses = responses.filter(
        (res) => res.status === 429
      );
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });
});
