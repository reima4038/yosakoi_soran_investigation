import { Router } from 'express';
import authRoutes from './auth';
import videoRoutes from './videos';
import templateRoutes from './templates';
import sessionRoutes from './sessions';
import evaluationRoutes from './evaluations';
import shareRoutes from './shares';
import discussionRoutes from './discussions';
import notificationRoutes from './notifications';
import timestampRoutes from './timestamps';

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
      shares: '/api/shares',
      discussions: '/api/discussions',
      notifications: '/api/notifications',
      timestamps: '/api/timestamps',
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

// Share routes
router.use('/shares', shareRoutes);

// Discussion routes
router.use('/discussions', discussionRoutes);

// Notification routes
router.use('/notifications', notificationRoutes);

// Timestamp routes
router.use('/timestamps', timestampRoutes);

export default router;