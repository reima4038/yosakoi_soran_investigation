"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.config = {
    port: process.env.PORT || 3001,
    nodeEnv: process.env.NODE_ENV || 'development',
    mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/yosakoi-evaluation',
    jwtSecret: process.env.JWT_SECRET || 'your-secret-key-for-development-only',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
    redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
    youtubeApiKey: process.env.YOUTUBE_API_KEY || '',
    emailConfig: {
        host: process.env.EMAIL_HOST || '',
        port: parseInt(process.env.EMAIL_PORT || '587'),
        user: process.env.EMAIL_USER || '',
        password: process.env.EMAIL_PASSWORD || '',
    },
};
//# sourceMappingURL=index.js.map