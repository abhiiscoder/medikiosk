/**
 * MEDiKIOSK Backend — Phase 06: Tesseract OCR Provider
 * Local OCR implementation using WebAssembly-based Tesseract.js.
 * Operates strictly locally without sending patient documents to external servers.
 */

import { createWorker, Worker } from 'tesseract.js';
import { IOCRProvider, OCRResult } from './ocr.interface.js';
import { logger } from '../../utils/logger.js';

export class TesseractOCRProvider implements IOCRProvider {
  public readonly name = 'tesseract';
  private worker: Worker | null = null;
  private initializingPromise: Promise<Worker> | null = null;

  private async getWorker(): Promise<Worker> {
    if (this.worker) {
      return this.worker;
    }

    if (this.initializingPromise) {
      return this.initializingPromise;
    }

    this.initializingPromise = (async () => {
      logger.info('Initializing Tesseract OCR worker...');
      const worker = await createWorker('eng', 1, {
        logger: () => {
          // Suppress verbose per-percent OCR progress from clogging server logs
        }
      });
      this.worker = worker;
      this.initializingPromise = null;
      logger.info('Tesseract OCR worker initialized successfully');
      return worker;
    })();

    return this.initializingPromise;
  }

  public async isAvailable(): Promise<boolean> {
    try {
      await this.getWorker();
      return true;
    } catch {
      return false;
    }
  }

  public async extractTextFromImage(imageBuffer: Buffer, _mimeType: string): Promise<OCRResult> {
    try {
      const worker = await this.getWorker();

      logger.info('Executing Tesseract OCR on image buffer', {
        bufferLength: imageBuffer.length
      });

      const result = await worker.recognize(imageBuffer);

      const text = result.data.text || '';
      const confidence = typeof result.data.confidence === 'number'
        ? Math.round(result.data.confidence) / 100
        : undefined;

      logger.info('Tesseract OCR extraction finished', {
        extractedLength: text.length,
        confidence
      });

      return {
        text,
        confidence,
        provider: this.name
      };
    } catch (err) {
      logger.error('Tesseract OCR recognition failed', {
        error: err instanceof Error ? err.message : String(err)
      });
      throw err;
    }
  }

  public async terminate(): Promise<void> {
    if (this.worker) {
      try {
        await this.worker.terminate();
      } catch {
        // Safe termination
      }
      this.worker = null;
    }
  }
}
