/**
 * MEDiKIOSK Backend — Phase 06: OCR Service
 * Manages OCR execution and provider lifecycle.
 */

import { IOCRProvider, OCRResult } from './ocr.interface.js';
import { TesseractOCRProvider } from './tesseract.provider.js';

export class OCRService {
  private provider: IOCRProvider;

  constructor(defaultProvider?: IOCRProvider) {
    this.provider = defaultProvider || new TesseractOCRProvider();
  }

  public getProviderName(): string {
    return this.provider.name;
  }

  public setProvider(provider: IOCRProvider): void {
    this.provider = provider;
  }

  public resetToDefaultProvider(): void {
    this.provider = new TesseractOCRProvider();
  }

  public async extractTextFromImage(imageBuffer: Buffer, mimeType: string): Promise<OCRResult> {
    return this.provider.extractTextFromImage(imageBuffer, mimeType);
  }
}

export const ocrService = new OCRService();
