/**
 * MEDiKIOSK Backend — Phase R3: Authentication Controller
 * Express HTTP handlers for user login, registration, ID recovery, and session checking.
 */

import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service.js';
import { sendSuccess } from '../utils/response.js';
import { AppError } from '../middleware/errorHandler.js';

/**
 * POST /api/v1/auth/login
 */
export async function loginHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { medikioskId, pin, password } = req.body;
    if (!medikioskId) {
      throw new AppError('MEDiKIOSK ID is required.', 400, 'ID_REQUIRED');
    }

    const session = await authService.login(medikioskId, pin || password);
    sendSuccess(res, session, 'Authentication successful.');
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/v1/auth/register
 */
export async function registerHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { name, mobileNumber, password, pin, role } = req.body;
    const result = await authService.register(name, mobileNumber, password || pin, role);
    sendSuccess(res, result, 'Account registered successfully.', 201);
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/v1/auth/find-by-mobile
 */
export async function findByMobileHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { mobileNumber } = req.body;
    if (!mobileNumber) {
      throw new AppError('Mobile number is required.', 400, 'MOBILE_REQUIRED');
    }

    const result = await authService.findByMobile(mobileNumber);
    sendSuccess(res, result, 'Account matched successfully.');
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/auth/session
 */
export async function getSessionHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user || !req.user.userId) {
      throw new AppError('No active session.', 401, 'UNAUTHORIZED');
    }

    const session = await authService.getSession(req.user.userId);
    if (!session) {
      throw new AppError('Session expired or user not found.', 401, 'SESSION_EXPIRED');
    }

    sendSuccess(res, session, 'Active session verified.');
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/v1/auth/logout
 */
export async function logoutHandler(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    sendSuccess(res, { loggedOut: true }, 'Logged out successfully.');
  } catch (error) {
    next(error);
  }
}
