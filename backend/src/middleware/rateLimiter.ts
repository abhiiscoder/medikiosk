/**
 * MEDiKIOSK Backend — Phase 11: Rate Limiter Middleware
 * Lightweight, in-memory sliding-window rate limiter protecting expensive endpoints.
 */

import { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/response.js';
import { logger } from '../utils/logger.js';

export interface RateLimiterOptions {
  windowMs: number;
  maxRequests: number;
  endpointName?: string;
}

interface RequestRecord {
  timestamps: number[];
}

/**
 * Creates an Express middleware that limits request rates per IP or authenticated user
 */
export function createRateLimiter(options: RateLimiterOptions) {
  const { windowMs, maxRequests, endpointName = 'resource' } = options;
  const store = new Map<string, RequestRecord>();

  // Cleanup interval every 5 minutes to prevent memory leaks
  const cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, record] of store.entries()) {
      record.timestamps = record.timestamps.filter((ts) => now - ts < windowMs);
      if (record.timestamps.length === 0) {
        store.delete(key);
      }
    }
  }, 5 * 60 * 1000);

  // Unref timer so it doesn't prevent graceful Node.js exit
  if (cleanupTimer.unref) {
    cleanupTimer.unref();
  }

  return (req: Request, res: Response, next: NextFunction): void => {
    // In test environment, bypass unless x-test-rate-limit header is explicitly provided
    if (process.env.NODE_ENV === 'test' && req.headers['x-test-rate-limit'] !== 'true') {
      next();
      return;
    }

    const key = (req.user?.userId || req.ip || 'unknown').trim();
    const now = Date.now();

    let record = store.get(key);
    if (!record) {
      record = { timestamps: [] };
      store.set(key, record);
    }

    // Filter timestamps within the current sliding window
    record.timestamps = record.timestamps.filter((ts) => now - ts < windowMs);

    if (record.timestamps.length >= maxRequests) {
      const oldest = record.timestamps[0];
      const retryAfterSeconds = Math.ceil((oldest + windowMs - now) / 1000);

      logger.warn(`Rate limit exceeded on ${endpointName}`, {
        clientKey: key,
        endpoint: endpointName,
        currentCount: record.timestamps.length,
        maxAllowed: maxRequests,
        retryAfterSeconds
      });

      res.setHeader('Retry-After', String(Math.max(1, retryAfterSeconds)));
      res.setHeader('X-RateLimit-Limit', String(maxRequests));
      res.setHeader('X-RateLimit-Remaining', '0');

      sendError(
        res,
        'TOO_MANY_REQUESTS',
        `Rate limit exceeded for ${endpointName}. Maximum of ${maxRequests} requests per ${Math.round(windowMs / 1000)}s allowed. Please retry after ${retryAfterSeconds}s.`,
        429,
        { retryAfterSeconds }
      );
      return;
    }

    record.timestamps.push(now);
    res.setHeader('X-RateLimit-Limit', String(maxRequests));
    res.setHeader('X-RateLimit-Remaining', String(Math.max(0, maxRequests - record.timestamps.length)));

    next();
  };
}

// Pre-configured rate limiters for specific critical areas
export const standardApiLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 120,
  endpointName: 'API'
});

export const expensiveAiLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 30,
  endpointName: 'AI & Clinical Intelligence'
});

export const documentProcessingLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 20,
  endpointName: 'Document OCR & Processing'
});
