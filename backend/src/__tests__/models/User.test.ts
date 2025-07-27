import { User, UserRole } from '../../models/User';
import { connectDB, disconnectDB } from '../setup';

describe('User Model', () => {
  beforeAll(async () => {
    await connectDB();
  });

  afterAll(async () => {
    await disconnectDB();
  });

  beforeEach(async () => {
    await User.deleteMany({});
  });

  describe('User Creation', () => {
    it('should create a user with valid data', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        passwordHash: 'password123',
        role: UserRole.USER,
        profile: {
          displayName: 'Test User',
          bio: 'Test bio'
        }
      };

      const user = new User(userData);
      const savedUser = await user.save();

      expect(savedUser.username).toBe(userData.username);
      expect(savedUser.email).toBe(userData.email);
      expect(savedUser.role).toBe(userData.role);
      expect(savedUser.profile.displayName).toBe(userData.profile.displayName);
      expect(savedUser.profile.bio).toBe(userData.profile.bio);
      expect(savedUser.createdAt).toBeDefined();
    });

    it('should hash password on save', async () => {
      const plainPassword = 'password123';
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        passwordHash: plainPassword,
        role: UserRole.USER
      };

      const user = new User(userData);
      const savedUser = await user.save();

      expect(savedUser.passwordHash).not.toBe(plainPassword);
      expect(savedUser.passwordHash.length).toBeGreaterThan(plainPassword.length);
    });

    it('should default role to USER', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        passwordHash: 'password123'
      };

      const user = new User(userData);
      const savedUser = await user.save();

      expect(savedUser.role).toBe(UserRole.USER);
    });
  });

  describe('Validation', () => {
    it('should require username', async () => {
      const userData = {
        email: 'test@example.com',
        passwordHash: 'password123'
      };

      const user = new User(userData);

      await expect(user.save()).rejects.toThrow('ユーザー名は必須です');
    });

    it('should require email', async () => {
      const userData = {
        username: 'testuser',
        passwordHash: 'password123'
      };

      const user = new User(userData);

      await expect(user.save()).rejects.toThrow('メールアドレスは必須です');
    });

    it('should require password', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com'
      };

      const user = new User(userData);

      await expect(user.save()).rejects.toThrow('パスワードは必須です');
    });

    it('should validate username length', async () => {
      const userData = {
        username: 'ab', // Too short
        email: 'test@example.com',
        passwordHash: 'password123'
      };

      const user = new User(userData);

      await expect(user.save()).rejects.toThrow('ユーザー名は3文字以上である必要があります');
    });

    it('should validate username format', async () => {
      const userData = {
        username: 'test user!', // Invalid characters
        email: 'test@example.com',
        passwordHash: 'password123'
      };

      const user = new User(userData);

      await expect(user.save()).rejects.toThrow('ユーザー名は英数字、アンダースコア、ハイフンのみ使用可能です');
    });

    it('should validate email format', async () => {
      const userData = {
        username: 'testuser',
        email: 'invalid-email',
        passwordHash: 'password123'
      };

      const user = new User(userData);

      await expect(user.save()).rejects.toThrow('有効なメールアドレスを入力してください');
    });

    it('should validate password length', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        passwordHash: '1234567' // Too short
      };

      const user = new User(userData);

      await expect(user.save()).rejects.toThrow('パスワードは8文字以上である必要があります');
    });

    it('should validate role enum', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        passwordHash: 'password123',
        role: 'invalid-role' as UserRole
      };

      const user = new User(userData);

      await expect(user.save()).rejects.toThrow();
    });

    it('should validate profile fields', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        passwordHash: 'password123',
        profile: {
          displayName: 'a'.repeat(51), // Too long
          avatar: 'invalid-url',
          bio: 'a'.repeat(501) // Too long
        }
      };

      const user = new User(userData);

      await expect(user.save()).rejects.toThrow();
    });
  });

  describe('Unique Constraints', () => {
    it('should enforce unique username', async () => {
      const userData1 = {
        username: 'testuser',
        email: 'test1@example.com',
        passwordHash: 'password123'
      };

      const userData2 = {
        username: 'testuser', // Same username
        email: 'test2@example.com',
        passwordHash: 'password123'
      };

      const user1 = new User(userData1);
      await user1.save();

      const user2 = new User(userData2);
      await expect(user2.save()).rejects.toThrow();
    });

    it('should enforce unique email', async () => {
      const userData1 = {
        username: 'testuser1',
        email: 'test@example.com',
        passwordHash: 'password123'
      };

      const userData2 = {
        username: 'testuser2',
        email: 'test@example.com', // Same email
        passwordHash: 'password123'
      };

      const user1 = new User(userData1);
      await user1.save();

      const user2 = new User(userData2);
      await expect(user2.save()).rejects.toThrow();
    });
  });

  describe('Methods', () => {
    it('should compare password correctly', async () => {
      const plainPassword = 'password123';
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        passwordHash: plainPassword
      };

      const user = new User(userData);
      const savedUser = await user.save();

      const isMatch = await savedUser.comparePassword(plainPassword);
      expect(isMatch).toBe(true);

      const isWrongMatch = await savedUser.comparePassword('wrongpassword');
      expect(isWrongMatch).toBe(false);
    });
  });

  describe('JSON Transformation', () => {
    it('should exclude passwordHash from JSON output', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        passwordHash: 'password123'
      };

      const user = new User(userData);
      const savedUser = await user.save();
      const userJson = savedUser.toJSON();

      expect(userJson.passwordHash).toBeUndefined();
      expect(userJson.username).toBe(userData.username);
      expect(userJson.email).toBe(userData.email);
    });
  });
});