/**
 * MEDiKIOSK Backend — Phase 01: Centralized Error Handling Middleware
 * Catch-all error formatting, 404 handler, and AppError classes.
 */

import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { sendError } from '../utils/response.js';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly errorCode: string;
  public readonly details?: unknown;

  constructor(message: string, statusCode: number = 500, errorCode: string = 'INTERNAL_ERROR', details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 404 Handler for undefined routes
 */
export function notFoundHandler(req: Request, res: Response): void {
  sendError(
    res,
    'NOT_FOUND',
    `Route ${req.method} ${req.originalUrl} was not found.`,
    404
  );
}

/**
 * Global Express Error Handling Middleware
 */
export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void {
  // 1. Handled AppError
  if (err instanceof AppError) {
    logger.warn(`AppError: ${err.message}`, {
      code: err.errorCode,
      path: req.path,
      statusCode: err.statusCode
    });
    sendError(res, err.errorCode, err.message, err.statusCode, err.details);
    return;
  }

  // 2. Zod Validation Error
  if (err instanceof ZodError) {
    logger.warn('Request validation failed', {
      path: req.path,
      errors: err.errors
    });
    const issues = err.errors.map((e) => ({
      path: e.path.join('.'),
      message: e.message
    }));
    sendError(res, 'VALIDATION_ERROR', 'Request validation failed.', 400, issues);
    return;
  }

  // 3. Malformed JSON Body (SyntaxError from express.json())
  if (err instanceof SyntaxError && 'body' in err) {
    logger.warn('Malformed JSON body received', { path: req.path });
    sendError(res, 'MALFORMED_JSON', 'Malformed JSON payload provided in request body.', 400);
    return;
  }

  // 4. CORS Origin Not Permitted
  if (err instanceof Error && err.message.includes('CORS origin')) {
    logger.warn('CORS request blocked', { path: req.path, message: err.message });
    sendError(res, 'CORS_NOT_ALLOWED', err.message, 403);
    return;
  }

  // 5. Uncaught / Internal Server Error
  const errorMessage = err instanceof Error ? err.message : 'An unexpected server error occurred';
  const stack = err instanceof Error ? err.stack : undefined;

  logger.error('Unhandled server error', {
    error: errorMessage,
    stack,
    path: req.path,
    method: req.method
  });

  const publicMessage =
    config.NODE_ENV === 'production'
      ? 'An unexpected error occurred. Please try again later.'
      : errorMessage;

  sendError(res, 'INTERNAL_SERVER_ERROR', publicMessage, 500);
}
