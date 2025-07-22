import { Router } from 'express';
import authRoutes from './auth';

const router = Router();

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
router.use('/auth', authRoutes);

export default router;