/**
 * MEDiKIOSK Backend — Phase 06: OCR Provider Interface
 * Decoupled contract for OCR engines (Tesseract, cloud OCR, or test providers).
 */

export interface OCRResult {
  text: string;
  confidence?: number;
  provider: string;
}

export interface IOCRProvider {
  readonly name: string;
  isAvailable(): Promise<boolean>;
  extractTextFromImage(imageBuffer: Buffer, mimeType: string): Promise<OCRResult>;
}
