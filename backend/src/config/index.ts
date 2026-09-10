/**
 * MEDiKIOSK Backend — Phase 01: Configuration
 * Validates and exposes strongly-typed application configuration via Zod.
 */

import dotenv from 'dotenv';
import { z } from 'zod';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables from backend .env file explicitly
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config(); // fallback to cwd if applicable


const envSchema = z.object({
  PORT: z.coerce.number().positive().default(5000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  MONGODB_URI: z.string().min(1).default('mongodb://127.0.0.1:27017/medikiosk'),
  CORS_ORIGIN: z.string().min(1).default('http://localhost:5173'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  GEMINI_API_KEY: z.string().default(''),
  GEMINI_MODEL: z.string().min(1).default('gemini-3.5-flash-lite'),
  OPENROUTER_API_KEY: z.string().default(''),
  OPENROUTER_MODEL: z.string().min(1).default('openrouter/free'),
  UPLOAD_DIR: z.string().min(1).default('uploads'),
  MAX_FILE_SIZE_BYTES: z.coerce.number().positive().default(15 * 1024 * 1024)
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  // Output clear validation failure message without exposing secrets
  console.error('Invalid backend environment configuration:');
  parsedEnv.error.issues.forEach((issue) => {
    console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
  });
  process.exit(1);
}

export const config = Object.freeze(parsedEnv.data);
export type Config = typeof config;

/**
 * Returns true if a real, non-placeholder Gemini API key is configured.
 */
export function isGeminiConfigured(): boolean {
  const key = config.GEMINI_API_KEY;
  return Boolean(key && key.trim().length > 0 && key !== 'YOUR_REAL_GEMINI_API_KEY');
}

/**
 * Validates that Gemini is configured. Throws an error with NO exposed secrets if missing.
 */
export function validateGeminiConfig(): void {
  if (!isGeminiConfigured()) {
    throw new Error('Gemini API key is not configured.');
  }
}

/**
 * Returns true if a real, non-placeholder OpenRouter API key is configured.
 */
export function isOpenRouterConfigured(): boolean {
  const key = config.OPENROUTER_API_KEY;
  return Boolean(key && key.trim().length > 0 && key !== 'YOUR_REAL_OPENROUTER_API_KEY');
}

/**
 * Validates that OpenRouter is configured. Throws an error with NO exposed secrets if missing.
 */
export function validateOpenRouterConfig(): void {
  if (!isOpenRouterConfigured()) {
    throw new Error('OpenRouter API key is not configured.');
  }
}

