"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const mongoose_1 = __importDefault(require("mongoose"));
const config_1 = require("./config");
const routes_1 = __importDefault(require("./routes"));
// Load environment variables
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = config_1.config.port;
// Database connection (skip in test environment)
if (process.env.NODE_ENV !== 'test') {
    mongoose_1.default
        .connect(config_1.config.mongoUri)
        .then(() => {
        console.log('Connected to MongoDB');
    })
        .catch((error) => {
        console.error('MongoDB connection error:', error);
        process.exit(1);
    });
}
// Enhanced security middleware (disabled in test environment)
if (process.env.NODE_ENV !== 'test') {
    try {
        // const { securityMiddleware, securityLogger } = require('../../security/security-config');
        // securityMiddleware(app);
        console.log('Security configuration temporarily disabled');
        // Security event logging temporarily disabled
        // app.use((req, res, next) => {
        //   res.on('finish', () => {
        //     if (res.statusCode >= 400) {
        //       securityLogger.logSecurityEvent('HTTP_ERROR', {
        //         statusCode: res.statusCode,
        //         method: req.method,
        //         url: req.url,
        //         userAgent: req.get('User-Agent')
        //       }, req);
        //     }
        //   });
        //   next();
        // });
    }
    catch (error) {
        console.warn('Security configuration not loaded:', error instanceof Error ? error.message : String(error));
    }
}
// CORS configuration
app.use((0, cors_1.default)({
    origin: process.env.NODE_ENV === 'development' ? true : config_1.config.frontendUrl,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
// Request logging middleware
app.use((req, _res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`, {
        body: req.body,
        headers: {
            authorization: req.headers.authorization ? 'Bearer [token]' : 'none',
            'content-type': req.headers['content-type'],
        },
    });
    next();
});
// Body parsing middleware
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
// Health check endpoint
app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});
// API routes
app.use('/api', routes_1.default);
// Error handling middleware
app.use((err, _req, res, _next) => {
    console.error(err.stack);
    res.status(500).json({
        status: 'error',
        message: 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
});
// 404 handler
app.use('*', (_req, res) => {
    res.status(404).json({
        status: 'error',
        message: 'Route not found',
    });
});
// Only start server if not in test environment
if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
        console.log(`Environment: ${config_1.config.nodeEnv}`);
        console.log(`Frontend URL: ${config_1.config.frontendUrl}`);
    });
}
exports.default = app;
//# sourceMappingURL=index.js.map