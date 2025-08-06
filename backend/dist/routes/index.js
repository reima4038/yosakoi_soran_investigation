"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = __importDefault(require("./auth"));
const videos_1 = __importDefault(require("./videos"));
const templates_1 = __importDefault(require("./templates"));
const sessions_1 = __importDefault(require("./sessions"));
const evaluations_1 = __importDefault(require("./evaluations"));
const shares_1 = __importDefault(require("./shares"));
const discussions_1 = __importDefault(require("./discussions"));
const notifications_1 = __importDefault(require("./notifications"));
const timestamps_1 = __importDefault(require("./timestamps"));
const router = (0, express_1.Router)();
// API routes
router.get('/', (_req, res) => {
    res.json({
        message: 'YOSAKOI Evaluation System API v1.0',
        version: '1.0.0',
        endpoints: {
            auth: '/api/auth',
            videos: '/api/videos',
            templates: '/api/templates',
            sessions: '/api/sessions',
            evaluations: '/api/evaluations',
            shares: '/api/shares',
            discussions: '/api/discussions',
            notifications: '/api/notifications',
            timestamps: '/api/timestamps',
            health: '/health'
        }
    });
});
// Authentication routes
router.use('/auth', auth_1.default);
// Video routes
router.use('/videos', videos_1.default);
// Template routes
router.use('/templates', templates_1.default);
// Session routes
router.use('/sessions', sessions_1.default);
// Evaluation routes
router.use('/evaluations', evaluations_1.default);
// Share routes
router.use('/shares', shares_1.default);
// Discussion routes
router.use('/discussions', discussions_1.default);
// Notification routes
router.use('/notifications', notifications_1.default);
// Timestamp routes
router.use('/timestamps', timestamps_1.default);
exports.default = router;
//# sourceMappingURL=index.js.map