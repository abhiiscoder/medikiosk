/**
 * MEDiKIOSK Backend — Phase 01: Structured Logger
 * Safe, structured logging utility with log levels and sensitive data sanitization.
 */

import { config } from '../config/index.js';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};

const SENSITIVE_KEYS = new Set([
  'password',
  'token',
  'secret',
  'authorization',
  'apikey',
  'api_key',
  'gemini_api_key',
  'bhashini_key',
  'bhashini_api_key',
  'private_key',
  'cookie',
  'ssn',
  'medicalrecord',
  'medical_record',
  'extracted_text',
  'extractedtext',
  'full_text'
]);

/**
 * Recursively sanitizes data objects to prevent logging of sensitive fields
 */
function sanitizeData(data: unknown): unknown {
  if (data === null || data === undefined) return data;
  if (typeof data !== 'object') return data;

  if (Array.isArray(data)) {
    return data.map(sanitizeData);
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeData(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

function formatLog(level: LogLevel, message: string, meta?: unknown): string {
  const timestamp = new Date().toISOString();
  const entry = {
    timestamp,
    level: level.toUpperCase(),
    service: 'medikiosk-backend',
    message,
    ...(meta !== undefined ? { data: sanitizeData(meta) } : {})
  };
  return JSON.stringify(entry);
}

function shouldLog(level: LogLevel): boolean {
  const currentPriority = LEVEL_PRIORITY[config.LOG_LEVEL as LogLevel] ?? 1;
  const targetPriority = LEVEL_PRIORITY[level];
  return targetPriority >= currentPriority;
}

export const logger = {
  debug(message: string, meta?: unknown): void {
    if (shouldLog('debug')) {
      console.debug(formatLog('debug', message, meta));
    }
  },
  info(message: string, meta?: unknown): void {
    if (shouldLog('info')) {
      console.info(formatLog('info', message, meta));
    }
  },
  warn(message: string, meta?: unknown): void {
    if (shouldLog('warn')) {
      console.warn(formatLog('warn', message, meta));
    }
  },
  error(message: string, meta?: unknown): void {
    if (shouldLog('error')) {
      console.error(formatLog('error', message, meta));
    }
  }
};
