import request from 'supertest';
import app from '../../index';
import { connectDB, disconnectDB } from '../setup';
import { User } from '../../models/User';

/**
 * Test data constants for authentication tests
 */
const TEST_USERS = {
  valid: {
    username: 'testuser',
    email: 'test@example.com',
    password: 'Password123',
  },
  duplicate: {
    username: 'testuser2',
    email: 'test@example.com', // Same email as valid user
    password: 'Password456',
  },
  invalidEmail: {
    username: 'testuser',
    email: 'invalid-email',
    password: 'Password123',
  },
  weakPassword: {
    username: 'testuser',
    email: 'test@example.com',
    password: '123', // Too short
  },
  flowTest: {
    username: 'flowtest',
    email: 'flow@example.com',
    password: 'FlowTest123',
  },
} as const;

/**
 * Helper function to register a user
 */
const registerUser = (userData: { username: string; email: string; password: string }) =>
  request(app).post('/api/auth/register').send(userData);

/**
 * Helper function to login a user
 */
const loginUser = (email: string, password: string) =>
  request(app).post('/api/auth/login').send({ email, password });

/**
 * Helper function to get current user info
 */
const getCurrentUser = (token: string) =>
  request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);

/**
 * Helper function to assert successful API responses
 */
const expectSuccessResponse = (response: any, expectedData?: any) => {
  expect(response.body.status).toBe('success');
  if (expectedData) {
    expect(response.body.data).toMatchObject(expectedData);
  }
};

/**
 * Helper function to assert error API responses
 */
const expectErrorResponse = (response: any, expectedStatus: number) => {
  expect(response.status).toBe(expectedStatus);
  expect(response.body.status).toBe('error');
};

describe('Authentication Integration Tests', () => {
  beforeAll(async () => {
    await connectDB();
  });

  afterAll(async () => {
    await disconnectDB();
  });

  beforeEach(async () => {
    await User.deleteMany({});
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const response = await registerUser(TEST_USERS.valid);

      expect(response.status).toBe(201);
      expectSuccessResponse(response, {
        user: {
          username: TEST_USERS.valid.username,
          email: TEST_USERS.valid.email,
        },
        token: expect.any(String),
      });
      expect(response.body.data.user.passwordHash).toBeUndefined();
    });

    it('should return 400 for missing required fields', async () => {
      const response = await request(app).post('/api/auth/register').send({
        username: 'testuser',
        // Missing email and password
      });

      expectErrorResponse(response, 400);
    });

    it('should return 400 for duplicate email', async () => {
      // Register first user
      await registerUser(TEST_USERS.valid);

      // Try to register with same email
      const response = await registerUser(TEST_USERS.duplicate);

      expectErrorResponse(response, 400);
      expect(response.body.message).toContain('メールアドレス');
    });

    it('should return 400 for invalid email format', async () => {
      const response = await registerUser(TEST_USERS.invalidEmail);

      expectErrorResponse(response, 400);
    });

    it('should return 400 for weak password', async () => {
      const response = await registerUser(TEST_USERS.weakPassword);

      expectErrorResponse(response, 400);
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // Create a test user
      await registerUser(TEST_USERS.valid);
    });

    it('should login successfully with correct credentials', async () => {
      const response = await loginUser(
        TEST_USERS.valid.email,
        TEST_USERS.valid.password
      );

      expect(response.status).toBe(200);
      expectSuccessResponse(response, {
        user: {
          email: TEST_USERS.valid.email,
        },
        token: expect.any(String),
      });
      expect(response.body.data.user.passwordHash).toBeUndefined();
    });

    it('should return 401 for incorrect email', async () => {
      const response = await loginUser('wrong@example.com', TEST_USERS.valid.password);

      expectErrorResponse(response, 401);
    });

    it('should return 401 for incorrect password', async () => {
      const response = await loginUser(TEST_USERS.valid.email, 'WrongPassword');

      expectErrorResponse(response, 401);
    });

    it('should return 400 for missing credentials', async () => {
      const response = await request(app).post('/api/auth/login').send({
        email: TEST_USERS.valid.email,
        // Missing password
      });

      expectErrorResponse(response, 400);
    });
  });

  describe('GET /api/auth/me', () => {
    let authToken: string;

    beforeEach(async () => {
      // Register and get token
      const registerResponse = await registerUser(TEST_USERS.valid);
      authToken = registerResponse.body.data.token;
    });

    it('should return current user info with valid token', async () => {
      const response = await getCurrentUser(authToken);

      expect(response.status).toBe(200);
      expectSuccessResponse(response, {
        user: {
          username: TEST_USERS.valid.username,
          email: TEST_USERS.valid.email,
        },
      });
      expect(response.body.data.user.passwordHash).toBeUndefined();
    });

    it('should return 401 without token', async () => {
      const response = await request(app).get('/api/auth/me');

      expectErrorResponse(response, 401);
    });

    it('should return 401 with invalid token', async () => {
      const response = await getCurrentUser('invalid-token');

      expectErrorResponse(response, 401);
    });

    it('should return 401 with malformed token', async () => {
      const response = await getCurrentUser('expired.token.here');

      expectErrorResponse(response, 401);
    });
  });

  describe('Authentication Flow Integration', () => {
    it('should complete full registration and login flow', async () => {
      // Step 1: Register user
      const registerResponse = await registerUser(TEST_USERS.flowTest);
      expect(registerResponse.status).toBe(201);
      
      const registrationToken = registerResponse.body.data.token;

      // Step 2: Use registration token to access protected route
      const meResponse1 = await getCurrentUser(registrationToken);
      expect(meResponse1.status).toBe(200);
      expect(meResponse1.body.data.user.username).toBe(TEST_USERS.flowTest.username);

      // Step 3: Login with same credentials
      const loginResponse = await loginUser(
        TEST_USERS.flowTest.email,
        TEST_USERS.flowTest.password
      );
      expect(loginResponse.status).toBe(200);
      
      const loginToken = loginResponse.body.data.token;

      // Step 4: Use login token to access protected route
      const meResponse2 = await getCurrentUser(loginToken);
      expect(meResponse2.status).toBe(200);
      expect(meResponse2.body.data.user.username).toBe(TEST_USERS.flowTest.username);

      // Both tokens should work for the same user
      expect(meResponse1.body.data.user.id).toBe(meResponse2.body.data.user.id);
    });
  });
});
