import express from 'express';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { config } from './config';
import routes from './routes';

// Load environment variables
dotenv.config();

const app = express();
const PORT = config.port;

// Database connection (skip in test environment)
if (process.env.NODE_ENV !== 'test') {
  mongoose.connect(config.mongoUri)
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
    const { securityMiddleware, securityLogger } = require('../../security/security-config');
    securityMiddleware(app);

    // Security event logging
    app.use((req, res, next) => {
      res.on('finish', () => {
        if (res.statusCode >= 400) {
          securityLogger.logSecurityEvent('HTTP_ERROR', {
            statusCode: res.statusCode,
            method: req.method,
            url: req.url,
            userAgent: req.get('User-Agent')
          }, req);
        }
      });
      next();
    });
  } catch (error) {
    console.warn('Security configuration not loaded:', error instanceof Error ? error.message : String(error));
  }
}

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api', routes);

// Error handling middleware
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
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
    console.log(`Environment: ${config.nodeEnv}`);
    console.log(`Frontend URL: ${config.frontendUrl}`);
  });
}

export default app;