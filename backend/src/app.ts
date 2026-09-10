/**
 * MEDiKIOSK Backend — Phase 01: Express Application Assembly
 * Configures middleware, security headers, CORS, routers, and global error handling.
 */

import express, { Express, Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { config } from './config/index.js';
import { logger } from './utils/logger.js';
import healthRoutes from './routes/health.routes.js';
import apiV1Router from './routes/index.js';
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js';
import { attachUserContext } from './middleware/auth.js';
import { standardApiLimiter } from './middleware/rateLimiter.js';
import { sendSuccess } from './utils/response.js';

export function createApp(): Express {
  const app = express();

  // 1. Security Headers
  app.use(helmet());

  // 2. CORS Configuration
  const allowedOrigins = config.CORS_ORIGIN.split(',').map((o) => o.trim());
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl, server-to-server)
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
          return callback(null, true);
        }
        return callback(new Error(`CORS origin '${origin}' not permitted.`));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'x-user-id', 'X-User-Id', 'x-user-role', 'x-user-name']
    })
  );

  // 3. Request Parsing Middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // 4. Request Logging Middleware
  app.use((req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      logger.info(`${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`, {
        method: req.method,
        path: req.originalUrl,
        statusCode: res.statusCode,
        durationMs: duration,
        ip: req.ip
      });
    });
    next();
  });

  // 5. User Ownership Context Middleware (dev fallback or x-user-id header)
  app.use(attachUserContext);

  // 6. Root Welcome Route
  app.get('/', (req, res) => {
    sendSuccess(res, {
      service: 'MEDiKIOSK Authoritative Backend API',
      status: 'online',
      health: '/health',
      apiV1: '/api/v1'
    }, 'Welcome to MEDiKIOSK Clinical Intelligence Backend');
  });

  // 6. Direct Root Health Route (GET /health)
  app.use('/health', healthRoutes);

  // 7. Versioned API Routes (GET /api/v1/...) with Rate Limiting Protection
  app.use('/api', standardApiLimiter);
  app.use('/api/v1', apiV1Router);

  // 8. 404 Route Not Found Handler
  app.use(notFoundHandler);

  // 9. Central Global Error Handler
  app.use(errorHandler);

  return app;
}

export const app = createApp();
