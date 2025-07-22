import { Router, Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import rateLimit from 'express-rate-limit';
import { AuthService, RegisterData, LoginData } from '../services/authService';
import { UserRole } from '../models/User';
import { authenticateToken } from '../middleware';

const router = Router();

// 認証関連のレート制限（テスト環境では無効化）
const authLimiter =
  process.env.NODE_ENV === 'test'
    ? (_req: Request, _res: Response, next: NextFunction) => next()
    : rateLimit({
        windowMs: 15 * 60 * 1000, // 15分
        max: 5, // 15分間に5回まで
        message: {
          status: 'error',
          code: 'RATE_LIMIT_EXCEEDED',
          message:
            '試行回数が上限に達しました。しばらく待ってから再試行してください。',
        },
        standardHeaders: true,
        legacyHeaders: false,
      });

// バリデーションルール
const registerValidation = [
  body('username')
    .isLength({ min: 3, max: 30 })
    .withMessage('ユーザー名は3文字以上30文字以下である必要があります')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage(
      'ユーザー名は英数字、アンダースコア、ハイフンのみ使用可能です'
    ),

  body('email')
    .isEmail()
    .withMessage('有効なメールアドレスを入力してください')
    .normalizeEmail(),

  body('password')
    .isLength({ min: 8 })
    .withMessage('パスワードは8文字以上である必要があります')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('パスワードは小文字、大文字、数字を含む必要があります'),

  body('role')
    .optional()
    .isIn(Object.values(UserRole))
    .withMessage('無効なロールです'),
];

const loginValidation = [
  body('email')
    .isEmail()
    .withMessage('有効なメールアドレスを入力してください')
    .normalizeEmail(),

  body('password').notEmpty().withMessage('パスワードは必須です'),
];

/**
 * ユーザー登録
 * POST /api/auth/register
 */
router.post(
  '/register',
  authLimiter,
  registerValidation,
  async (req: Request, res: Response) => {
    try {
      // バリデーションエラーチェック
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          status: 'error',
          code: 'VALIDATION_ERROR',
          message: 'バリデーションエラーが発生しました',
          errors: errors.array(),
        });
        return;
      }

      const registerData: RegisterData = {
        username: req.body.username,
        email: req.body.email,
        password: req.body.password,
        role: req.body.role || UserRole.USER,
      };

      const { user, token } = await AuthService.register(registerData);

      res.status(201).json({
        status: 'success',
        message: 'ユーザー登録が完了しました',
        data: {
          user: {
            id: user._id,
            username: user.username,
            email: user.email,
            role: user.role,
            profile: user.profile,
            createdAt: user.createdAt,
          },
          token,
        },
      });
    } catch (error) {
      console.error('Registration error:', error);

      res.status(400).json({
        status: 'error',
        code: 'REGISTRATION_FAILED',
        message:
          error instanceof Error ? error.message : 'ユーザー登録に失敗しました',
      });
    }
  }
);

/**
 * ユーザーログイン
 * POST /api/auth/login
 */
router.post(
  '/login',
  authLimiter,
  loginValidation,
  async (req: Request, res: Response) => {
    try {
      // バリデーションエラーチェック
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          status: 'error',
          code: 'VALIDATION_ERROR',
          message: 'バリデーションエラーが発生しました',
          errors: errors.array(),
        });
        return;
      }

      const loginData: LoginData = {
        email: req.body.email,
        password: req.body.password,
      };

      const { user, token } = await AuthService.login(loginData);

      res.json({
        status: 'success',
        message: 'ログインしました',
        data: {
          user: {
            id: user._id,
            username: user.username,
            email: user.email,
            role: user.role,
            profile: user.profile,
            createdAt: user.createdAt,
          },
          token,
        },
      });
    } catch (error) {
      console.error('Login error:', error);

      res.status(401).json({
        status: 'error',
        code: 'LOGIN_FAILED',
        message:
          error instanceof Error ? error.message : 'ログインに失敗しました',
      });
    }
  }
);

/**
 * 現在のユーザー情報取得
 * GET /api/auth/me
 */
router.get('/me', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        code: 'UNAUTHORIZED',
        message: '認証が必要です',
      });
      return;
    }

    const user = await AuthService.getUserById(req.user.userId);
    if (!user) {
      res.status(404).json({
        status: 'error',
        code: 'USER_NOT_FOUND',
        message: 'ユーザーが見つかりません',
      });
      return;
    }

    res.json({
      status: 'success',
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          role: user.role,
          profile: user.profile,
          createdAt: user.createdAt,
        },
      },
    });
  } catch (error) {
    console.error('Get user error:', error);

    res.status(500).json({
      status: 'error',
      code: 'INTERNAL_ERROR',
      message: 'ユーザー情報の取得に失敗しました',
    });
  }
});

/**
 * ユーザー情報更新
 * PUT /api/auth/me
 */
router.put(
  '/me',
  authenticateToken,
  [
    body('profile.displayName')
      .optional()
      .isLength({ max: 50 })
      .withMessage('表示名は50文字以下である必要があります'),

    body('profile.bio')
      .optional()
      .isLength({ max: 500 })
      .withMessage('自己紹介は500文字以下である必要があります'),

    body('profile.expertise')
      .optional()
      .isArray()
      .withMessage('専門分野は配列である必要があります'),

    body('profile.expertise.*')
      .optional()
      .isLength({ max: 50 })
      .withMessage('専門分野は50文字以下である必要があります'),
  ],
  async (req: Request, res: Response) => {
    try {
      // バリデーションエラーチェック
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          status: 'error',
          code: 'VALIDATION_ERROR',
          message: 'バリデーションエラーが発生しました',
          errors: errors.array(),
        });
        return;
      }

      if (!req.user) {
        res.status(401).json({
          status: 'error',
          code: 'UNAUTHORIZED',
          message: '認証が必要です',
        });
        return;
      }

      const user = await AuthService.getUserById(req.user.userId);
      if (!user) {
        res.status(404).json({
          status: 'error',
          code: 'USER_NOT_FOUND',
          message: 'ユーザーが見つかりません',
        });
        return;
      }

      // プロフィール情報の更新
      if (req.body.profile) {
        user.profile = {
          ...user.profile,
          ...req.body.profile,
        };
        await user.save();
      }

      res.json({
        status: 'success',
        message: 'ユーザー情報を更新しました',
        data: {
          user: {
            id: user._id,
            username: user.username,
            email: user.email,
            role: user.role,
            profile: user.profile,
            createdAt: user.createdAt,
          },
        },
      });
    } catch (error) {
      console.error('Update user error:', error);

      res.status(500).json({
        status: 'error',
        code: 'INTERNAL_ERROR',
        message: 'ユーザー情報の更新に失敗しました',
      });
    }
  }
);

/**
 * ログアウト（クライアント側でトークンを削除するため、サーバー側では特に処理なし）
 * POST /api/auth/logout
 */
router.post('/logout', authenticateToken, (_req: Request, res: Response) => {
  res.json({
    status: 'success',
    message: 'ログアウトしました',
  });
});

/**
 * トークン検証
 * POST /api/auth/verify
 */
router.post('/verify', authenticateToken, (req: Request, res: Response) => {
  res.json({
    status: 'success',
    message: 'トークンは有効です',
    data: {
      user: req.user,
    },
  });
});

export default router;
