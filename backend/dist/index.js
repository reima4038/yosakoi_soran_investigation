"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const dotenv_1 = __importDefault(require("dotenv"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const mongoose_1 = __importDefault(require("mongoose"));
const config_1 = require("./config");
const routes_1 = __importDefault(require("./routes"));
// Load environment variables
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = config_1.config.port;
// Database connection (skip in test environment)
if (process.env.NODE_ENV !== 'test') {
    mongoose_1.default.connect(config_1.config.mongoUri)
        .then(() => {
        console.log('Connected to MongoDB');
    })
        .catch((error) => {
        console.error('MongoDB connection error:', error);
        process.exit(1);
    });
}
// Security middleware
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: config_1.config.frontendUrl,
    credentials: true,
}));
// Rate limiting
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
});
app.use(limiter);
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
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});
// 404 handler
app.use('*', (_req, res) => {
    res.status(404).json({
        status: 'error',
        message: 'Route not found'
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