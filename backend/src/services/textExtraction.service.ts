/**
 * MEDiKIOSK Backend — Phase 06: Text Extraction Service
 * Decoupled text extraction pipeline supporting text-based PDFs,
 * scanned/image-only PDFs (with OCR fallback), and medical images (JPG, PNG, WebP).
 */

import { PDFParse } from 'pdf-parse';
import { ocrService } from './ocr/ocr.service.js';
import { AppError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';

export interface TextExtractionResult {
  text: string;
  method: 'pdf_text' | 'ocr' | 'pdf_ocr';
  confidence?: number;
}

export class TextExtractionService {
  /**
   * Normalizes raw extracted text:
   * - standardizes line breaks (\r\n -> \n)
   * - collapses redundant horizontal spaces and tabs
   * - collapses 3+ consecutive line breaks into 2
   * - preserves medical terms, numbers, dates, units, medication names, and lab values
   * - NO clinical interpretation or summarization
   */
  public normalizeExtractedText(rawText: string): string {
    if (!rawText || typeof rawText !== 'string') {
      return '';
    }

    return rawText
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/[ \t]+/g, ' ')
      .replace(/[^\S\n]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .split('\n')
      .map((line) => line.trim())
      .join('\n')
      .trim();
  }

  /**
   * Extracts text from text-based PDF or falls back to OCR for scanned PDFs.
   */
  public async extractTextFromPdf(pdfBuffer: Buffer): Promise<TextExtractionResult> {
    if (!pdfBuffer || pdfBuffer.length === 0) {
      throw new AppError('PDF buffer is empty or corrupted.', 400, 'CORRUPTED_FILE');
    }

    let extractedPdfText = '';

    // 1. Attempt standard PDF text extraction
    try {
      const parser = new PDFParse({ data: pdfBuffer });
      const textResult = await parser.getText();
      extractedPdfText = typeof textResult === 'string'
        ? textResult
        : (textResult && typeof textResult.text === 'string' ? textResult.text : '');
      await parser.destroy();
    } catch (parseError) {
      logger.warn('PDFParse primary engine failed; attempting stream text inspection', {
        error: parseError instanceof Error ? parseError.message : String(parseError)
      });
      // Stream fallback: extract text chunks between BT ... ET markers in raw PDF
      extractedPdfText = this.extractRawPdfStreams(pdfBuffer);
    }

    const normalizedText = this.normalizeExtractedText(extractedPdfText);

    // 2. Evaluate if text is sufficient (threshold: >= 30 characters)
    if (normalizedText.length >= 30) {
      logger.info('Extracted text from text-based PDF via pdf_text', {
        length: normalizedText.length
      });
      return {
        text: normalizedText,
        method: 'pdf_text'
      };
    }

    // 3. Insufficient / No text -> Scanned image-only PDF detected! Fallback to OCR.
    logger.info('PDF has insufficient text stream (< 30 chars); initiating OCR fallback for scanned PDF...');
    const embeddedImage = this.extractEmbeddedImageFromPdf(pdfBuffer);

    if (embeddedImage) {
      try {
        const ocrResult = await ocrService.extractTextFromImage(embeddedImage, 'image/jpeg');
        const ocrNormalized = this.normalizeExtractedText(ocrResult.text);

        if (ocrNormalized.length > 0) {
          logger.info('Extracted text from scanned PDF via pdf_ocr', {
            length: ocrNormalized.length,
            confidence: ocrResult.confidence
          });
          return {
            text: ocrNormalized,
            method: 'pdf_ocr',
            confidence: ocrResult.confidence
          };
        }
      } catch (ocrErr) {
        logger.warn('OCR fallback on embedded PDF image failed', {
          error: ocrErr instanceof Error ? ocrErr.message : String(ocrErr)
        });
      }
    }

    // If text was short but non-empty (e.g. 5-29 characters), keep it as pdf_text rather than hard failing
    if (normalizedText.length > 0) {
      return {
        text: normalizedText,
        method: 'pdf_text'
      };
    }

    throw new AppError('PDF document contains no readable text or extractable medical images.', 422, 'EMPTY_TEXT_EXTRACTION');
  }

  /**
   * Extracts text from an image document (JPEG, PNG, WebP) using OCR.
   */
  public async extractTextFromImage(imageBuffer: Buffer, mimeType: string): Promise<TextExtractionResult> {
    if (!imageBuffer || imageBuffer.length === 0) {
      throw new AppError('Image file is empty or corrupted.', 400, 'CORRUPTED_FILE');
    }

    try {
      const ocrResult = await ocrService.extractTextFromImage(imageBuffer, mimeType);
      const normalized = this.normalizeExtractedText(ocrResult.text);

      if (!normalized || normalized.length === 0) {
        throw new AppError('No readable text could be recognized in the medical image.', 422, 'EMPTY_TEXT_EXTRACTION');
      }

      logger.info('Extracted text from image via OCR', {
        mimeType,
        length: normalized.length,
        confidence: ocrResult.confidence
      });

      return {
        text: normalized,
        method: 'ocr',
        confidence: ocrResult.confidence
      };
    } catch (err) {
      if (err instanceof AppError) {
        throw err;
      }
      logger.error('Image OCR extraction failed', {
        error: err instanceof Error ? err.message : String(err)
      });
      throw new AppError('OCR processing failed on the provided medical image.', 500, 'OCR_PROCESSING_FAILED');
    }
  }

  /**
   * Primary entrypoint: determines strategy based on MIME type.
   */
  public async extractTextFromDocument(fileBuffer: Buffer, mimeType: string): Promise<TextExtractionResult> {
    const mime = mimeType.toLowerCase();

    if (mime === 'application/pdf') {
      return this.extractTextFromPdf(fileBuffer);
    }

    if (['image/jpeg', 'image/png', 'image/webp'].includes(mime)) {
      return this.extractTextFromImage(fileBuffer, mime);
    }

    throw new AppError(`Unsupported document MIME type '${mimeType}' for text extraction.`, 400, 'UNSUPPORTED_FILE_TYPE');
  }

  /**
   * Helper to scan raw PDF streams for text when PDFParse fails
   */
  private extractRawPdfStreams(pdfBuffer: Buffer): string {
    const str = pdfBuffer.toString('binary');
    const textPieces: string[] = [];

    // Extract text inside parentheses before Tj/TJ operators
    const tjRegex = /\(([^)]+)\)\s*(?:Tj|'|")/g;
    let match: RegExpExecArray | null;
    while ((match = tjRegex.exec(str)) !== null) {
      if (match[1] && match[1].length > 0) {
        textPieces.push(match[1]);
      }
    }

    // Extract text in bracketed arrays before TJ operator
    const arrayTjRegex = /\[([^\]]+)\]\s*TJ/g;
    while ((match = arrayTjRegex.exec(str)) !== null) {
      const inner = match[1];
      const subMatches = inner.match(/\(([^)]+)\)/g);
      if (subMatches) {
        for (const sub of subMatches) {
          textPieces.push(sub.slice(1, -1));
        }
      }
    }

    return textPieces.join(' ');
  }

  /**
   * Helper to detect and extract embedded JPEG images from a scanned PDF buffer
   */
  private extractEmbeddedImageFromPdf(pdfBuffer: Buffer): Buffer | null {
    // Search for JPEG SOI (Start of Image) marker 0xFF 0xD8 0xFF
    const soiIndex = pdfBuffer.indexOf(Buffer.from([0xff, 0xd8, 0xff]));
    if (soiIndex === -1) {
      return null;
    }

    // Search for JPEG EOI (End of Image) marker 0xFF 0xD9 after SOI
    const eoiIndex = pdfBuffer.indexOf(Buffer.from([0xff, 0xd9]), soiIndex + 2);
    if (eoiIndex === -1) {
      return null;
    }

    // Extract slice including EOI marker
    return pdfBuffer.subarray(soiIndex, eoiIndex + 2);
  }
}

export const textExtractionService = new TextExtractionService();
