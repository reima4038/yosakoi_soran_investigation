import { Router } from 'express';

const router = Router();

// API routes will be implemented in subsequent tasks
router.get('/', (_req, res) => {
  res.json({ message: 'YOSAKOI Evaluation System API v1.0' });
});

export default router;