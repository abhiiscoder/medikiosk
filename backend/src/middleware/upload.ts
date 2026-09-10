/**
 * MEDiKIOSK Backend — Phase 05 & 06: Document Upload Middleware
 * Configures Multer for disk storage, filename sanitization, MIME validation,
 * file signature (magic bytes) verification, and size bounds.
 */

import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Request, Response, NextFunction } from 'express';
import { config } from '../config/index.js';
import { AppError } from './errorHandler.js';
import { generateDocumentId } from '../utils/idGenerator.js';
import { isValidFileSignature } from '../utils/fileSignature.util.js';

// Approved Medical Document MIME Types
export const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp'
]);

export const ALLOWED_EXTENSIONS = new Set([
  '.pdf',
  '.jpg',
  '.jpeg',
  '.png',
  '.webp'
]);

/**
 * Gets configurable storage root directory.
 */
export function getStorageRoot(): string {
  return process.env.MEDICAL_DOCUMENT_STORAGE_PATH || config.UPLOAD_DIR;
}

/**
 * Sanitizes original filename to prevent path traversal, command injection, or filesystem issues.
 */
export function sanitizeFilename(rawName: string): string {
  const base = path.basename(rawName);
  // Strip control chars, directory navigation, quotes, null bytes
  const sanitized = base
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/\.{2,}/g, '.')
    .trim();

  return sanitized || 'medical_record';
}

/**
 * Multer Disk Storage configured per Case
 */
const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const caseId = req.params.caseId || 'unassigned';
    const uploadRoot = path.resolve(process.cwd(), getStorageRoot(), 'cases', sanitizeFilename(caseId));

    try {
      if (!fs.existsSync(uploadRoot)) {
        fs.mkdirSync(uploadRoot, { recursive: true });
      }
      cb(null, uploadRoot);
    } catch (err) {
      cb(err instanceof Error ? err : new Error(String(err)), uploadRoot);
    }
  },
  filename: (req, file, cb) => {
    const docId = generateDocumentId();
    // Attach generated documentId to request so downstream controller has access
    (req as any).generatedDocumentId = docId;

    const safeName = sanitizeFilename(file.originalname);
    const storedName = `${docId}_${Date.now()}_${safeName}`;
    cb(null, storedName);
  }
});

/**
 * Validates file MIME type and extension
 */
function fileFilter(
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
): void {
  const ext = path.extname(file.originalname).toLowerCase();
  const mime = file.mimetype.toLowerCase();

  if (!ALLOWED_MIME_TYPES.has(mime) || !ALLOWED_EXTENSIONS.has(ext)) {
    return cb(
      new AppError(
        `Invalid file type '${file.mimetype}'. Supported medical record formats: PDF, JPEG, PNG, and WebP.`,
        400,
        'UNSUPPORTED_FILE_TYPE'
      )
    );
  }

  cb(null, true);
}

const uploadInstance = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: config.MAX_FILE_SIZE_BYTES,
    files: 1
  }
});

/**
 * Middleware handling single file upload on field 'file' or 'document'
 * Intercepts Multer-specific errors and standardizes into AppError.
 * Enforces magic bytes file signature validation after writing to disk.
 */
export function uploadDocumentMiddleware(req: Request, res: Response, next: NextFunction): void {
  const uploadSingle = uploadInstance.single('file');

  uploadSingle(req, res, (err: unknown) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          const maxMb = Math.round(config.MAX_FILE_SIZE_BYTES / (1024 * 1024));
          return next(
            new AppError(
              `File exceeds the maximum allowable size of ${maxMb}MB.`,
              413,
              'FILE_TOO_LARGE'
            )
          );
        }
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
          return next(
            new AppError(
              `Unexpected field name '${err.field}'. Please upload the document using the form field 'file'.`,
              400,
              'UNEXPECTED_FIELD'
            )
          );
        }
        return next(new AppError(`File upload error: ${err.message}`, 400, 'UPLOAD_ERROR'));
      }

      if (err instanceof AppError) {
        return next(err);
      }

      return next(
        new AppError(
          err instanceof Error ? err.message : 'Unknown upload error occurred.',
          400,
          'UPLOAD_FAILED'
        )
      );
    }

    if (!req.file) {
      return next(
        new AppError(
          'No file was uploaded. Please attach a document using form-data with the field name "file".',
          400,
          'FILE_REQUIRED'
        )
      );
    }

    // Binary file signature / magic bytes validation
    try {
      const filePath = req.file.path;
      const stats = fs.statSync(filePath);

      if (stats.size === 0) {
        try {
          fs.unlinkSync(filePath);
        } catch {
          // ignore cleanup error
        }
        return next(new AppError('Uploaded file is empty (0 bytes).', 400, 'EMPTY_FILE'));
      }

      const fd = fs.openSync(filePath, 'r');
      const headerBuffer = Buffer.alloc(Math.min(64, stats.size));
      fs.readSync(fd, headerBuffer, 0, headerBuffer.length, 0);
      fs.closeSync(fd);

      if (!isValidFileSignature(headerBuffer, req.file.mimetype, req.file.originalname)) {
        try {
          fs.unlinkSync(filePath);
        } catch {
          // ignore cleanup error
        }
        return next(
          new AppError(
            `File signature does not match declared type '${req.file.mimetype}'. File may be corrupted, truncated, or spoofed.`,
            400,
            'INVALID_FILE_SIGNATURE'
          )
        );
      }
    } catch (sigErr) {
      if (sigErr instanceof AppError) {
        return next(sigErr);
      }
      return next(new AppError('Failed to validate file signature.', 400, 'FILE_VALIDATION_FAILED'));
    }

    next();
  });
}
