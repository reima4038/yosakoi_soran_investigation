import { Router } from 'express';
import authRoutes from './auth';
import videoRoutes from './videos';

const router = Router();

// API routes
router.get('/', (_req, res) => {
  res.json({ 
    message: 'YOSAKOI Evaluation System API v1.0',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      videos: '/api/videos',
      health: '/health'
    }
  });
});

// Authentication routes
router.use('/auth', authRoutes);

// Video routes
router.use('/videos', videoRoutes);

export default router;