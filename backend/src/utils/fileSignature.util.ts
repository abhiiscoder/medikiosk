/**
 * MEDiKIOSK Backend — Phase 06: File Signature (Magic Bytes) Utility
 * Validates binary signatures of files to prevent MIME and extension spoofing.
 */

import path from 'path';
import { AppError } from '../middleware/errorHandler.js';

export interface FileSignatureMatch {
  mimeType: string;
  extension: string;
}

/**
 * Inspects initial bytes (magic numbers) of a buffer to determine the real binary file type.
 */
export function detectFileTypeFromBuffer(buffer: Buffer): FileSignatureMatch | null {
  if (!buffer || buffer.length < 4) {
    return null;
  }

  // 1. PDF signature: %PDF- (0x25 0x50 0x44 0x46)
  if (
    buffer[0] === 0x25 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x44 &&
    buffer[3] === 0x46
  ) {
    return { mimeType: 'application/pdf', extension: '.pdf' };
  }

  // 2. JPEG signature: 0xFF 0xD8 0xFF
  if (
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return { mimeType: 'image/jpeg', extension: '.jpg' };
  }

  // 3. PNG signature: 0x89 0x50 0x4E 0x47 0x0D 0x0A 0x1A 0x0A
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { mimeType: 'image/png', extension: '.png' };
  }

  // 4. WebP signature: RIFF....WEBP (0x52 0x49 0x46 0x46 at 0..3, and 0x57 0x45 0x42 0x50 at 8..11)
  if (
    buffer.length >= 12 &&
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return { mimeType: 'image/webp', extension: '.webp' };
  }

  return null;
}

/**
 * Validates that the buffer's magic bytes match the declared MIME type and extension.
 */
export function isValidFileSignature(
  buffer: Buffer,
  declaredMimeType: string,
  filename?: string
): boolean {
  if (!buffer || buffer.length < 4) {
    return false;
  }

  const detected = detectFileTypeFromBuffer(buffer);
  if (!detected) {
    return false;
  }

  const mime = declaredMimeType.toLowerCase().trim();
  let mimeMatches = false;

  if (detected.mimeType === 'application/pdf') {
    mimeMatches = mime === 'application/pdf';
  } else if (detected.mimeType === 'image/jpeg') {
    mimeMatches = mime === 'image/jpeg' || mime === 'image/jpg';
  } else if (detected.mimeType === 'image/png') {
    mimeMatches = mime === 'image/png';
  } else if (detected.mimeType === 'image/webp') {
    mimeMatches = mime === 'image/webp';
  }

  if (!mimeMatches) {
    return false;
  }

  if (filename) {
    const ext = path.extname(filename).toLowerCase();
    if (detected.mimeType === 'application/pdf' && ext !== '.pdf') {
      return false;
    }
    if (detected.mimeType === 'image/jpeg' && !['.jpg', '.jpeg'].includes(ext)) {
      return false;
    }
    if (detected.mimeType === 'image/png' && ext !== '.png') {
      return false;
    }
    if (detected.mimeType === 'image/webp' && ext !== '.webp') {
      return false;
    }
  }

  return true;
}

/**
 * Throws AppError if buffer signature is invalid or mismatched.
 */
export function validateBufferSignature(
  buffer: Buffer,
  declaredMimeType: string,
  filename?: string
): void {
  if (!buffer || buffer.length === 0) {
    throw new AppError('File is empty (0 bytes). Cannot process empty files.', 400, 'EMPTY_FILE');
  }

  if (!isValidFileSignature(buffer, declaredMimeType, filename)) {
    throw new AppError(
      `File signature does not match declared type '${declaredMimeType}'. File may be corrupted, truncated, or spoofed.`,
      400,
      'INVALID_FILE_SIGNATURE'
    );
  }
}
