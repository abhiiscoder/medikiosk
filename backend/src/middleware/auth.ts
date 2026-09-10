/**
 * MEDiKIOSK Backend — Phase 02: User Ownership Context Middleware
 * Ownership abstraction layer isolating current dev context while preparing for real auth.
 */

import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler.js';
import { authService } from '../services/auth.service.js';

export interface UserContext {
  userId: string;
  role: 'clinician' | 'staff' | 'admin' | 'physician' | 'kiosk_patient' | 'triage_nurse' | 'system_admin';
  name?: string;
  medikioskId?: string;
}

// Extend Express Request declaration to include user context
declare global {
  namespace Express {
    interface Request {
      user?: UserContext;
    }
  }
}

export const DEFAULT_DEV_USER: UserContext = {
  userId: 'user-clinician-001',
  role: 'clinician',
  name: 'Dr. Abhishek Shinde'
};

/**
 * Middleware that extracts user context from Bearer token, x-user-id header, or development default
 */
export function attachUserContext(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    const payload = authService.verifyToken(token);
    if (payload) {
      req.user = {
        userId: payload.userId,
        role: (payload.role as any) || 'clinician',
        name: payload.name,
        medikioskId: payload.medikioskId
      };
      return next();
    } else {
      req.user = undefined;
      return next();
    }
  }

  const headerUserId = req.headers['x-user-id'];
  const headerRole = req.headers['x-user-role'];

  if (typeof headerUserId === 'string' && headerUserId.trim().length > 0) {
    req.user = {
      userId: headerUserId.trim(),
      role: (headerRole as any) || 'clinician',
      name: typeof req.headers['x-user-name'] === 'string' ? req.headers['x-user-name'] : undefined
    };
    return next();
  }

  // If path is auth session check and no credentials provided, don't inject dev user
  if (req.path.includes('/auth/session')) {
    req.user = undefined;
    return next();
  }

  // Development/test fallback user context for non-auth endpoints
  req.user = { ...DEFAULT_DEV_USER };
  next();
}

/**
 * Guard ensuring that an authoritative user context exists on the request
 */
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user || !req.user.userId) {
    next(new AppError('Unauthorized: Active user context is required to access this resource.', 401, 'UNAUTHORIZED'));
    return;
  }
  next();
}
