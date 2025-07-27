import jwt from 'jsonwebtoken';
import { User, IUser, UserRole } from '../models/User';
import { config } from '../config';

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  role?: UserRole;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface JWTPayload {
  userId: string;
  username: string;
  email: string;
  role: UserRole;
}

export class AuthService {
  /**
   * ユーザー登録
   */
  static async register(userData: RegisterData): Promise<{ user: IUser; token: string }> {
    const { username, email, password, role = UserRole.USER } = userData;

    // 既存ユーザーチェック
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      if (existingUser.email === email) {
        throw new Error('このメールアドレスは既に登録されています');
      }
      if (existingUser.username === username) {
        throw new Error('このユーザー名は既に使用されています');
      }
    }

    // 新規ユーザー作成
    const user = new User({
      username,
      email,
      passwordHash: password, // pre-saveフックでハッシュ化される
      role,
      profile: {
        displayName: username
      }
    });

    await user.save();

    // JWTトークン生成
    const token = this.generateToken({
      userId: (user._id as any).toString(),
      username: user.username,
      email: user.email,
      role: user.role
    });

    return { user, token };
  }

  /**
   * ユーザーログイン
   */
  static async login(loginData: LoginData): Promise<{ user: IUser; token: string }> {
    const { email, password } = loginData;

    // ユーザー検索
    const user = await User.findOne({ email }).select('+passwordHash');
    if (!user) {
      throw new Error('メールアドレスまたはパスワードが正しくありません');
    }

    // パスワード検証
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      throw new Error('メールアドレスまたはパスワードが正しくありません');
    }

    // JWTトークン生成
    const token = this.generateToken({
      userId: (user._id as any).toString(),
      username: user.username,
      email: user.email,
      role: user.role
    });

    return { user, token };
  }

  /**
   * JWTトークン生成
   */
  static generateToken(payload: JWTPayload): string {
    const secret = config.jwtSecret as string;
    const options: jwt.SignOptions = {
      expiresIn: config.jwtExpiresIn as any,
      issuer: 'yosakoi-evaluation-system',
      audience: 'yosakoi-users'
    };
    return jwt.sign(payload, secret, options);
  }

  /**
   * JWTトークン検証
   */
  static verifyToken(token: string): JWTPayload {
    try {
      const decoded = jwt.verify(token, config.jwtSecret as string, {
        issuer: 'yosakoi-evaluation-system',
        audience: 'yosakoi-users'
      }) as JWTPayload;
      
      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('トークンの有効期限が切れています');
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('無効なトークンです');
      } else {
        throw new Error('トークンの検証に失敗しました');
      }
    }
  }

  /**
   * ユーザーIDからユーザー情報取得
   */
  static async getUserById(userId: string): Promise<IUser | null> {
    return User.findById(userId);
  }

  /**
   * パスワードリセット用トークン生成
   */
  static generatePasswordResetToken(userId: string): string {
    const options: jwt.SignOptions = { expiresIn: '1h' };
    return jwt.sign(
      { userId, type: 'password-reset' },
      config.jwtSecret as string,
      options
    );
  }

  /**
   * パスワードリセット用トークン検証
   */
  static verifyPasswordResetToken(token: string): { userId: string } {
    try {
      const decoded = jwt.verify(token, config.jwtSecret as string) as any;
      
      if (decoded.type !== 'password-reset') {
        throw new Error('無効なトークンタイプです');
      }
      
      return { userId: decoded.userId };
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('パスワードリセットトークンの有効期限が切れています');
      } else if (error instanceof Error && error.message === '無効なトークンタイプです') {
        throw error;
      } else {
        throw new Error('無効なパスワードリセットトークンです');
      }
    }
  }
}