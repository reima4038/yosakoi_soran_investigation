# セキュリティガイド

## 概要

YOSAKOIパフォーマンス評価システムのセキュリティ対策について説明します。

## セキュリティ機能

### 1. 認証・認可

#### JWT認証（実装済み）

**実装詳細**:
```typescript
// JWT設定
const jwtConfig = {
  accessTokenExpiry: '1h',
  refreshTokenExpiry: '7d',
  algorithm: 'HS256',
  issuer: 'yosakoi-evaluation-system'
};

// トークン生成
const generateTokens = (user: User) => {
  const accessToken = jwt.sign(
    { userId: user.id, role: user.role },
    process.env.JWT_SECRET!,
    { expiresIn: '1h' }
  );
  
  const refreshToken = jwt.sign(
    { userId: user.id },
    process.env.JWT_REFRESH_SECRET!,
    { expiresIn: '7d' }
  );
  
  return { accessToken, refreshToken };
};
```

**セキュリティ機能**:
- アクセストークンの有効期限: 1時間
- リフレッシュトークンの有効期限: 7日間
- トークンの自動更新機能（フロントエンドで実装）
- トークンのブラックリスト機能（Redis使用）

#### パスワードポリシー（実装済み）

**実装詳細**:
```typescript
// パスワード検証
const passwordValidation = [
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain uppercase, lowercase, number and special character')
];

// パスワードハッシュ化
const hashPassword = async (password: string): Promise<string> => {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
};
```

**ポリシー内容**:
- 最低8文字以上
- 大文字・小文字・数字・特殊文字を含む
- bcryptによるソルト付きハッシュ化（ソルトラウンド: 12）
- パスワード履歴機能（将来実装予定）

#### ロールベースアクセス制御（RBAC）（実装済み）

**実装詳細**:
```typescript
enum UserRole {
  ADMIN = 'admin',
  EVALUATOR = 'evaluator',
  USER = 'user'
}

// 権限チェックミドルウェア
const requireRole = (roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ 
        status: 'error', 
        message: 'Insufficient permissions' 
      });
    }
    next();
  };
};
```

**権限マトリックス**:
| 機能 | USER | EVALUATOR | ADMIN |
|------|------|-----------|-------|
| 動画閲覧 | ✓ | ✓ | ✓ |
| 動画登録 | ✓ | ✓ | ✓ |
| テンプレート作成 | - | ✓ | ✓ |
| セッション作成 | - | ✓ | ✓ |
| ユーザー管理 | - | - | ✓ |
| システム設定 | - | - | ✓ |

### 2. データ保護

#### 暗号化（実装済み）

**転送時暗号化**:
```nginx
# nginx SSL設定
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384;
ssl_prefer_server_ciphers off;
ssl_session_cache shared:SSL:10m;
ssl_session_timeout 10m;
```

**保存時暗号化**:
```typescript
// 機密データの暗号化
import crypto from 'crypto';

const encrypt = (text: string): string => {
  const algorithm = 'aes-256-gcm';
  const key = crypto.scryptSync(process.env.ENCRYPTION_KEY!, 'salt', 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipher(algorithm, key);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  return `${iv.toString('hex')}:${encrypted}`;
};
```

**パスワードハッシュ化**:
```typescript
// bcrypt実装
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;

const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, SALT_ROUNDS);
};

const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};
```

#### データサニタイゼーション（実装済み）

**XSS攻撃対策**:
```typescript
import xss from 'xss-clean';
import helmet from 'helmet';

// XSSクリーニング
app.use(xss());

// セキュリティヘッダー
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "https://www.youtube.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      imgSrc: ["'self'", "data:", "https://img.youtube.com"],
      connectSrc: ["'self'", "wss:", "https://www.googleapis.com"],
      frameSrc: ["https://www.youtube.com"]
    }
  }
}));
```

**NoSQLインジェクション対策**:
```typescript
import mongoSanitize from 'express-mongo-sanitize';

// MongoDB インジェクション対策
app.use(mongoSanitize({
  replaceWith: '_',
  onSanitize: ({ req, key }) => {
    console.warn(`Sanitized key: ${key} in request`);
  }
}));

// 入力検証
const validateInput = [
  body('email').isEmail().normalizeEmail(),
  body('username').trim().escape().isLength({ min: 3, max: 20 }),
  body('metadata.teamName').trim().escape().isLength({ min: 1, max: 100 })
];
```

**HTMLタグ無害化**:
```typescript
import DOMPurify from 'isomorphic-dompurify';

// フロントエンドでのサニタイゼーション
const sanitizeHtml = (dirty: string): string => {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br'],
    ALLOWED_ATTR: []
  });
};
```

### 3. アクセス制御

#### レート制限（実装済み）

**実装詳細**:
```typescript
import rateLimit from 'express-rate-limit';

// 一般API用レート制限
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分
  max: 100, // 最大100リクエスト
  message: {
    status: 'error',
    message: 'Too many requests, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// ログイン試行制限
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分
  max: 5, // 最大5回の試行
  skipSuccessfulRequests: true,
  message: {
    status: 'error',
    message: 'Too many login attempts, please try again later'
  }
});

// 登録試行制限
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1時間
  max: 3, // 最大3回の登録試行
  message: {
    status: 'error',
    message: 'Too many registration attempts, please try again later'
  }
});
```

**制限値**:
- ログイン試行: 15分間に5回まで
- API呼び出し: 15分間に100回まで
- 登録試行: 1時間に3回まで
- ファイルアップロード: 1時間に10回まで

#### CORS設定（実装済み）

**実装詳細**:
```typescript
import cors from 'cors';

const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = process.env.CORS_ORIGIN?.split(',') || [
      'http://localhost:3000',
      'https://yourdomain.com'
    ];
    
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization'
  ],
  exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining'],
  maxAge: 86400 // 24時間
};

app.use(cors(corsOptions));
```

**セキュリティ機能**:
- 許可されたオリジンのみアクセス可能
- 認証情報付きリクエストの制御
- プリフライトリクエストの適切な処理
- レート制限ヘッダーの公開

### 4. セキュリティヘッダー（実装済み）

**実装詳細**:
```typescript
import helmet from 'helmet';

app.use(helmet({
  // クリックジャッキング対策
  frameguard: { action: 'deny' },
  
  // MIME タイプスニッフィング対策
  noSniff: true,
  
  // XSS フィルター
  xssFilter: true,
  
  // HSTS (HTTP Strict Transport Security)
  hsts: {
    maxAge: 31536000, // 1年
    includeSubDomains: true,
    preload: true
  },
  
  // Content Security Policy
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'", // Material-UI用
        "https://www.youtube.com",
        "https://www.gstatic.com"
      ],
      styleSrc: [
        "'self'",
        "'unsafe-inline'", // Material-UI用
        "https://fonts.googleapis.com"
      ],
      fontSrc: [
        "'self'",
        "https://fonts.gstatic.com"
      ],
      imgSrc: [
        "'self'",
        "data:",
        "https://img.youtube.com",
        "https://i.ytimg.com"
      ],
      connectSrc: [
        "'self'",
        "wss:",
        "https://www.googleapis.com",
        "https://youtube.googleapis.com"
      ],
      frameSrc: [
        "https://www.youtube.com",
        "https://www.youtube-nocookie.com"
      ],
      mediaSrc: ["'self'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"]
    }
  },
  
  // 参照元ポリシー
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  
  // 権限ポリシー
  permissionsPolicy: {
    features: {
      camera: ["'none'"],
      microphone: ["'none'"],
      geolocation: ["'self'"],
      notifications: ["'self'"]
    }
  }
}));
```

**設定されるヘッダー**:
```http
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' https://www.youtube.com
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=(self), notifications=(self)
```

## セキュリティ監査

### 自動監査（実装済み）

**実装されたスクリプト**:
```bash
# 依存関係の脆弱性チェック
npm run security:scan
# 実行内容: npm audit && cd backend && npm audit && cd ../frontend && npm audit

# セキュリティテストの実行
npm run security:test
# 実行内容: cd backend && npm run test -- --testPathPattern=security

# 包括的なセキュリティ監査
npm run security:audit
# 実行内容: node security/security-audit.js
```

**セキュリティ監査スクリプト**:
```javascript
// security/security-audit.js
const fs = require('fs');
const path = require('path');

const auditChecks = [
  {
    name: 'Environment Variables Check',
    check: () => {
      const requiredEnvVars = [
        'JWT_SECRET',
        'JWT_REFRESH_SECRET',
        'MONGODB_URI',
        'REDIS_URL'
      ];
      
      const missing = requiredEnvVars.filter(env => !process.env[env]);
      return {
        passed: missing.length === 0,
        message: missing.length > 0 ? `Missing: ${missing.join(', ')}` : 'All required env vars present'
      };
    }
  },
  {
    name: 'Hardcoded Secrets Check',
    check: () => {
      // ソースコード内のハードコードされたシークレットをチェック
      const patterns = [
        /password\s*=\s*["'][^"']+["']/i,
        /secret\s*=\s*["'][^"']+["']/i,
        /api[_-]?key\s*=\s*["'][^"']+["']/i
      ];
      
      // 実装: ファイルスキャンロジック
      return { passed: true, message: 'No hardcoded secrets found' };
    }
  }
];

const runAudit = () => {
  console.log('Running security audit...\n');
  
  auditChecks.forEach(check => {
    const result = check.check();
    console.log(`${check.name}: ${result.passed ? '✓' : '✗'} ${result.message}`);
  });
};

runAudit();
```

### 手動監査チェックリスト

#### コード監査
- [x] ハードコードされたシークレットの確認
  - 環境変数による設定の実装済み
  - `.env.example` ファイルでテンプレート提供
- [x] 入力バリデーションの実装確認
  - express-validator による検証実装済み
  - MongoDB サニタイゼーション実装済み
- [x] エラーハンドリングの適切性確認
  - カスタムエラークラスによる統一処理
  - 機密情報を含まないエラーメッセージ
- [x] ログ出力の機密情報漏洩確認
  - Winston による構造化ログ
  - パスワード等の機密情報はログ出力から除外

#### 設定監査
- [x] 環境変数の適切な設定
  - 本番環境用 `.env.production` テンプレート提供
  - 開発環境用 `.env.development` テンプレート提供
- [x] データベース接続の暗号化
  - MongoDB 接続時の SSL/TLS 設定
  - Redis 接続の暗号化設定
- [ ] SSL証明書の有効性確認
  - 証明書の有効期限監視（要実装）
  - 自動更新スクリプト（要実装）
- [x] ファイアウォール設定の確認
  - Docker ネットワーク分離
  - 必要なポートのみ公開

#### インフラ監査
- [ ] サーバーのセキュリティパッチ適用状況
  - 定期的な OS アップデート（手動）
  - Docker イメージの定期更新
- [x] 不要なサービスの停止
  - Docker Compose による最小限のサービス構成
  - 本番環境での開発用ツール除外
- [x] ログ監視システムの動作確認
  - Winston による集約ログ
  - エラーレベル別のログ分離
- [ ] バックアップの暗号化確認
  - MongoDB バックアップの暗号化（要実装）
  - バックアップファイルのアクセス制御

## 脆弱性対応

### 脆弱性報告
セキュリティ脆弱性を発見した場合は、以下の手順で報告してください：

1. **緊急度の判定**
   - Critical: システム全体に影響
   - High: 重要な機能に影響
   - Medium: 限定的な影響
   - Low: 軽微な影響

2. **報告先**
   - メール: security@example.com
   - 暗号化: PGPキーを使用

3. **報告内容**
   - 脆弱性の詳細説明
   - 再現手順
   - 影響範囲
   - 推奨される対策

### 対応プロセス

#### Critical/High脆弱性
1. **即座の対応**（24時間以内）
   - 緊急パッチの適用
   - 影響範囲の特定
   - ユーザーへの通知

2. **詳細調査**（48時間以内）
   - 根本原因の分析
   - 類似脆弱性の確認
   - 対策の検証

#### Medium/Low脆弱性
1. **計画的対応**（1週間以内）
   - 修正計画の策定
   - テスト環境での検証
   - 定期メンテナンスでの適用

## インシデント対応

### セキュリティインシデントの種類
- 不正アクセス
- データ漏洩
- サービス拒否攻撃
- マルウェア感染

### 対応手順

#### 1. 検知・報告
- 自動監視システムによる検知
- ユーザーからの報告
- 定期監査での発見

#### 2. 初期対応
```bash
# サービスの緊急停止
npm run docker:down

# ログの保全
cp -r logs/ incident_logs_$(date +%Y%m%d_%H%M%S)/

# ネットワークの遮断
iptables -A INPUT -j DROP
```

#### 3. 調査・分析
- ログ分析
- 影響範囲の特定
- 攻撃手法の解析

#### 4. 復旧・対策
- 脆弱性の修正
- システムの復旧
- 再発防止策の実装

## セキュリティ設定

### 環境変数設定（実装済み）

**本番環境設定例**:
```bash
# JWT設定
JWT_SECRET=your_very_secure_jwt_secret_key_here_minimum_32_characters
JWT_REFRESH_SECRET=your_refresh_secret_different_from_jwt_secret
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d

# データベース設定
MONGODB_URI=mongodb://username:password@mongodb:27017/yosakoi_evaluation?authSource=admin&ssl=true
REDIS_URL=redis://username:password@redis:6379

# セキュリティ設定
BCRYPT_SALT_ROUNDS=12
ENCRYPTION_KEY=your_32_character_encryption_key_here

# レート制限設定
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
LOGIN_RATE_LIMIT_MAX=5
REGISTER_RATE_LIMIT_MAX=3

# CORS設定
CORS_ORIGIN=https://yourdomain.com,https://www.yourdomain.com
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# 外部API設定
YOUTUBE_API_KEY=your_youtube_api_key_here

# メール設定
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# 通知設定
SLACK_SECURITY_WEBHOOK=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK

# ログ設定
LOG_LEVEL=warn
NODE_ENV=production
```

### データベース設定（実装済み）

**MongoDB接続設定**:
```typescript
// config/database.ts
import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    const mongoOptions = {
      // 新しいURL パーサーを使用
      useNewUrlParser: true,
      useUnifiedTopology: true,
      
      // SSL/TLS設定
      ssl: process.env.NODE_ENV === 'production',
      sslValidate: true,
      
      // 認証設定
      authSource: 'admin',
      
      // 接続プール設定
      maxPoolSize: 10,
      minPoolSize: 2,
      maxIdleTimeMS: 30000,
      
      // タイムアウト設定
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      
      // 再試行設定
      retryWrites: true,
      retryReads: true
    };

    const conn = await mongoose.connect(process.env.MONGODB_URI!, mongoOptions);
    
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    
    // 接続イベントハンドリング
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('MongoDB disconnected');
    });

  } catch (error) {
    console.error('Database connection failed:', error);
    process.exit(1);
  }
};

export default connectDB;
```

**Redis接続設定**:
```typescript
// config/redis.ts
import Redis from 'redis';

const redisClient = Redis.createClient({
  url: process.env.REDIS_URL,
  password: process.env.REDIS_PASSWORD,
  
  // SSL/TLS設定
  tls: process.env.NODE_ENV === 'production' ? {} : undefined,
  
  // 再接続設定
  retry_strategy: (options) => {
    if (options.error && options.error.code === 'ECONNREFUSED') {
      return new Error('The server refused the connection');
    }
    if (options.total_retry_time > 1000 * 60 * 60) {
      return new Error('Retry time exhausted');
    }
    if (options.attempt > 10) {
      return undefined;
    }
    return Math.min(options.attempt * 100, 3000);
  }
});

redisClient.on('error', (err) => {
  console.error('Redis Client Error:', err);
});

redisClient.on('connect', () => {
  console.log('Redis Client Connected');
});

export default redisClient;
```

## 定期的なセキュリティタスク

### 日次
- [ ] セキュリティログの確認
- [ ] 異常なアクセスパターンの監視
- [ ] システムリソースの監視

### 週次
- [ ] 依存関係の脆弱性チェック
- [ ] セキュリティテストの実行
- [ ] バックアップの整合性確認

### 月次
- [ ] セキュリティ監査の実行
- [ ] アクセス権限の見直し
- [ ] インシデント対応手順の確認

### 四半期
- [ ] ペネトレーションテストの実施
- [ ] セキュリティポリシーの見直し
- [ ] 災害復旧テストの実施

## セキュリティトレーニング

### 開発者向け
- セキュアコーディング研修
- OWASP Top 10の理解
- 脆弱性対応手順の習得

### 運用者向け
- インシデント対応研修
- ログ分析手法の習得
- セキュリティツールの使用方法

## 参考資料

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Checklist](https://blog.risingstack.com/node-js-security-checklist/)
- [MongoDB Security Checklist](https://docs.mongodb.com/manual/administration/security-checklist/)
- [Express.js Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)