"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const router = (0, express_1.Router)();
// API routes will be implemented in subsequent tasks
router.get('/', (_req, res) => {
    res.json({ message: 'YOSAKOI Evaluation System API v1.0' });
});
exports.default = router;
//# sourceMappingURL=index.js.map