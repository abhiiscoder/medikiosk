/**
 * MEDiKIOSK Backend — Phase 06: Mock OCR Provider
 * Deterministic test provider for unit tests and simulated OCR scenarios.
 */

import { IOCRProvider, OCRResult } from './ocr.interface.js';

export interface MockOCROptions {
  mockText?: string;
  mockConfidence?: number;
  shouldFail?: boolean;
  failureError?: string;
  customExtractor?: (imageBuffer: Buffer, mimeType: string) => Promise<OCRResult>;
}

export class MockOCRProvider implements IOCRProvider {
  public readonly name = 'mock_ocr';
  private mockText = 'Rx: Amoxicillin 500mg PO TID x 7 days. Dr. Sharma, MD. Clinic Medical Record.';
  private mockConfidence = 0.94;
  private customExtractor?: (imageBuffer: Buffer, mimeType: string) => Promise<OCRResult>;
  private shouldFail = false;
  private failureError = 'Simulated OCR engine failure';

  constructor(
    optionsOrExtractor?:
      | MockOCROptions
      | ((imageBuffer: Buffer, mimeType: string) => Promise<OCRResult>)
  ) {
    if (typeof optionsOrExtractor === 'function') {
      this.customExtractor = optionsOrExtractor;
    } else if (optionsOrExtractor && typeof optionsOrExtractor === 'object') {
      if (optionsOrExtractor.mockText !== undefined) this.mockText = optionsOrExtractor.mockText;
      if (optionsOrExtractor.mockConfidence !== undefined)
        this.mockConfidence = optionsOrExtractor.mockConfidence;
      if (optionsOrExtractor.shouldFail !== undefined)
        this.shouldFail = optionsOrExtractor.shouldFail;
      if (optionsOrExtractor.failureError !== undefined)
        this.failureError = optionsOrExtractor.failureError;
      if (optionsOrExtractor.customExtractor !== undefined)
        this.customExtractor = optionsOrExtractor.customExtractor;
    }
  }

  public setMockText(text: string): void {
    this.mockText = text;
  }

  public setMockConfidence(confidence: number): void {
    this.mockConfidence = confidence;
  }

  public setShouldFail(fail: boolean, error?: string): void {
    this.shouldFail = fail;
    if (error) this.failureError = error;
  }

  public setCustomExtractor(
    extractor: (imageBuffer: Buffer, mimeType: string) => Promise<OCRResult>
  ): void {
    this.customExtractor = extractor;
  }

  public async isAvailable(): Promise<boolean> {
    return true;
  }

  public async extractTextFromImage(
    imageBuffer: Buffer,
    mimeType: string
  ): Promise<OCRResult> {
    if (this.shouldFail) {
      throw new Error(this.failureError);
    }

    if (this.customExtractor) {
      return this.customExtractor(imageBuffer, mimeType);
    }

    // Default mock response
    return {
      text: this.mockText,
      confidence: this.mockConfidence,
      provider: this.name
    };
  }
}
