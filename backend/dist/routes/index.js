"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = __importDefault(require("./auth"));
const router = (0, express_1.Router)();
// API routes
router.get('/', (_req, res) => {
    res.json({
        message: 'YOSAKOI Evaluation System API v1.0',
        version: '1.0.0',
        endpoints: {
            auth: '/api/auth',
            health: '/health'
        }
    });
});
// Authentication routes
router.use('/auth', auth_1.default);
exports.default = router;
//# sourceMappingURL=index.js.map