import { Router } from 'express';
import authRoutes from './auth';
import videoRoutes from './videos';
import templateRoutes from './templates';
import sessionRoutes from './sessions';
import evaluationRoutes from './evaluations';

const router = Router();

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
      health: '/health'
    }
  });
});

// Authentication routes
router.use('/auth', authRoutes);

// Video routes
router.use('/videos', videoRoutes);

// Template routes
router.use('/templates', templateRoutes);

// Session routes
router.use('/sessions', sessionRoutes);

// Evaluation routes
router.use('/evaluations', evaluationRoutes);

export default router;