// セキュリティ設定
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');

// レート制限設定
const createRateLimit = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      error: message,
      retryAfter: Math.ceil(windowMs / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
};

// セキュリティミドルウェア設定
const securityMiddleware = (app) => {
  // Helmet - セキュリティヘッダーの設定
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https:", "http:"],
        scriptSrc: ["'self'", "https://www.youtube.com", "https://www.gstatic.com"],
        frameSrc: ["'self'", "https://www.youtube.com"],
        connectSrc: ["'self'", "https://www.googleapis.com"],
      },
    },
    crossOriginEmbedderPolicy: false,
  }));

  // CORS設定
  app.use((req, res, next) => {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];
    const origin = req.headers.origin;
    
    if (allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    }
    
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
    } else {
      next();
    }
  });

  // データサニタイゼーション
  app.use(mongoSanitize()); // NoSQL インジェクション対策
  app.use(xss()); // XSS 対策
  app.use(hpp()); // HTTP Parameter Pollution 対策

  // レート制限
  app.use('/api/auth/login', createRateLimit(15 * 60 * 1000, 5, 'ログイン試行回数が上限に達しました'));
  app.use('/api/auth/register', createRateLimit(60 * 60 * 1000, 3, '登録試行回数が上限に達しました'));
  app.use('/api/', createRateLimit(15 * 60 * 1000, 100, 'API呼び出し回数が上限に達しました'));

  // セッション設定
  app.use(require('express-session')({
    secret: process.env.SESSION_SECRET || 'fallback-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24時間
      sameSite: 'strict'
    }
  }));
};

// セキュリティログ
const securityLogger = {
  logSecurityEvent: (event, details, req) => {
    const logEntry = {
      timestamp: new Date().toISOString(),
      event,
      details,
      ip: req?.ip || 'unknown',
      userAgent: req?.get('User-Agent') || 'unknown',
      userId: req?.user?.id || 'anonymous'
    };
    
    console.log('SECURITY_EVENT:', JSON.stringify(logEntry));
    
    // 重要なセキュリティイベントの場合、アラートを送信
    if (['FAILED_LOGIN_ATTEMPT', 'SUSPICIOUS_ACTIVITY', 'UNAUTHORIZED_ACCESS'].includes(event)) {
      // アラート送信ロジック（Slack、メールなど）
      sendSecurityAlert(logEntry);
    }
  }
};

const sendSecurityAlert = async (logEntry) => {
  // Slack通知の実装例
  if (process.env.SLACK_SECURITY_WEBHOOK) {
    try {
      const response = await fetch(process.env.SLACK_SECURITY_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `🚨 セキュリティアラート: ${logEntry.event}`,
          attachments: [{
            color: 'danger',
            fields: [
              { title: 'イベント', value: logEntry.event, short: true },
              { title: 'IP アドレス', value: logEntry.ip, short: true },
              { title: '詳細', value: JSON.stringify(logEntry.details), short: false },
              { title: '時刻', value: logEntry.timestamp, short: true }
            ]
          }]
        })
      });
    } catch (error) {
      console.error('Failed to send security alert:', error);
    }
  }
};

// 入力バリデーション
const validateInput = {
  email: (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 254;
  },
  
  password: (password) => {
    // 最低8文字、大文字・小文字・数字・特殊文字を含む
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return passwordRegex.test(password);
  },
  
  youtubeUrl: (url) => {
    const youtubeRegex = /^https:\/\/(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[\w-]+$/;
    return youtubeRegex.test(url);
  },
  
  sanitizeString: (str) => {
    return str.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
              .replace(/[<>]/g, '');
  }
};

// CSRF トークン生成
const generateCSRFToken = () => {
  return require('crypto').randomBytes(32).toString('hex');
};

module.exports = {
  securityMiddleware,
  securityLogger,
  validateInput,
  generateCSRFToken,
  createRateLimit
};