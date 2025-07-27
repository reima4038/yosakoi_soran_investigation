import { AuthService, RegisterData, LoginData } from '../../services/authService';
import { User, UserRole } from '../../models/User';
import jwt from 'jsonwebtoken';
import { connectDB, disconnectDB } from '../setup';

describe('AuthService', () => {
  beforeAll(async () => {
    await connectDB();
  });

  afterAll(async () => {
    await disconnectDB();
  });

  beforeEach(async () => {
    await User.deleteMany({});
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const userData: RegisterData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        role: UserRole.USER
      };

      const result = await AuthService.register(userData);

      expect(result.user).toBeDefined();
      expect(result.user.username).toBe(userData.username);
      expect(result.user.email).toBe(userData.email);
      expect(result.user.role).toBe(userData.role);
      expect(result.token).toBeDefined();
      expect(typeof result.token).toBe('string');
    });

    it('should throw error for duplicate email', async () => {
      const userData: RegisterData = {
        username: 'testuser1',
        email: 'test@example.com',
        password: 'password123'
      };

      await AuthService.register(userData);

      const duplicateData: RegisterData = {
        username: 'testuser2',
        email: 'test@example.com',
        password: 'password456'
      };

      await expect(AuthService.register(duplicateData))
        .rejects.toThrow('このメールアドレスは既に登録されています');
    });

    it('should throw error for duplicate username', async () => {
      const userData: RegisterData = {
        username: 'testuser',
        email: 'test1@example.com',
        password: 'password123'
      };

      await AuthService.register(userData);

      const duplicateData: RegisterData = {
        username: 'testuser',
        email: 'test2@example.com',
        password: 'password456'
      };

      await expect(AuthService.register(duplicateData))
        .rejects.toThrow('このユーザー名は既に使用されています');
    });

    it('should default to USER role when not specified', async () => {
      const userData: RegisterData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      };

      const result = await AuthService.register(userData);
      expect(result.user.role).toBe(UserRole.USER);
    });
  });

  describe('login', () => {
    beforeEach(async () => {
      const userData: RegisterData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        role: UserRole.USER
      };
      await AuthService.register(userData);
    });

    it('should login successfully with correct credentials', async () => {
      const loginData: LoginData = {
        email: 'test@example.com',
        password: 'password123'
      };

      const result = await AuthService.login(loginData);

      expect(result.user).toBeDefined();
      expect(result.user.email).toBe(loginData.email);
      expect(result.token).toBeDefined();
      expect(typeof result.token).toBe('string');
    });

    it('should throw error for non-existent user', async () => {
      const loginData: LoginData = {
        email: 'nonexistent@example.com',
        password: 'password123'
      };

      await expect(AuthService.login(loginData))
        .rejects.toThrow('メールアドレスまたはパスワードが正しくありません');
    });

    it('should throw error for incorrect password', async () => {
      const loginData: LoginData = {
        email: 'test@example.com',
        password: 'wrongpassword'
      };

      await expect(AuthService.login(loginData))
        .rejects.toThrow('メールアドレスまたはパスワードが正しくありません');
    });
  });

  describe('generateToken', () => {
    it('should generate a valid JWT token', () => {
      const payload = {
        userId: '507f1f77bcf86cd799439011',
        username: 'testuser',
        email: 'test@example.com',
        role: UserRole.USER
      };

      const token = AuthService.generateToken(payload);

      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });
  });

  describe('verifyToken', () => {
    it('should verify a valid token', () => {
      const payload = {
        userId: '507f1f77bcf86cd799439011',
        username: 'testuser',
        email: 'test@example.com',
        role: UserRole.USER
      };

      const token = AuthService.generateToken(payload);
      const decoded = AuthService.verifyToken(token);

      expect(decoded.userId).toBe(payload.userId);
      expect(decoded.username).toBe(payload.username);
      expect(decoded.email).toBe(payload.email);
      expect(decoded.role).toBe(payload.role);
    });

    it('should throw error for invalid token', () => {
      const invalidToken = 'invalid.token.here';

      expect(() => AuthService.verifyToken(invalidToken))
        .toThrow('無効なトークンです');
    });

    it('should throw error for expired token', () => {
      const payload = {
        userId: '507f1f77bcf86cd799439011',
        username: 'testuser',
        email: 'test@example.com',
        role: UserRole.USER
      };

      // Create an expired token
      const expiredToken = jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: '-1h' });

      expect(() => AuthService.verifyToken(expiredToken))
        .toThrow('トークンの有効期限が切れています');
    });
  });

  describe('getUserById', () => {
    it('should return user for valid ID', async () => {
      const userData: RegisterData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      };

      const { user } = await AuthService.register(userData);
      const foundUser = await AuthService.getUserById((user._id as any).toString());

      expect(foundUser).toBeDefined();
      expect(foundUser!.username).toBe(userData.username);
      expect(foundUser!.email).toBe(userData.email);
    });

    it('should return null for invalid ID', async () => {
      const invalidId = '507f1f77bcf86cd799439011';
      const foundUser = await AuthService.getUserById(invalidId);

      expect(foundUser).toBeNull();
    });
  });

  describe('generatePasswordResetToken', () => {
    it('should generate a password reset token', () => {
      const userId = '507f1f77bcf86cd799439011';
      const token = AuthService.generatePasswordResetToken(userId);

      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });
  });

  describe('verifyPasswordResetToken', () => {
    it('should verify a valid password reset token', () => {
      const userId = '507f1f77bcf86cd799439011';
      const token = AuthService.generatePasswordResetToken(userId);
      const decoded = AuthService.verifyPasswordResetToken(token);

      expect(decoded.userId).toBe(userId);
    });

    it('should throw error for invalid token type', () => {
      const payload = {
        userId: '507f1f77bcf86cd799439011',
        type: 'invalid-type'
      };

      const invalidToken = jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: '1h' });

      expect(() => AuthService.verifyPasswordResetToken(invalidToken))
        .toThrow('無効なトークンタイプです');
    });

    it('should throw error for expired reset token', () => {
      const payload = {
        userId: '507f1f77bcf86cd799439011',
        type: 'password-reset'
      };

      const expiredToken = jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: '-1h' });

      expect(() => AuthService.verifyPasswordResetToken(expiredToken))
        .toThrow('パスワードリセットトークンの有効期限が切れています');
    });
  });
});