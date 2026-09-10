/**
 * MEDiKIOSK Backend — Phase 06 & Phase R2: Clinical Document Classifier & Extractor Service
 * Evaluates extracted document text to determine clinical relevance, controlled category,
 * and extracts supported clinical entities (medications, allergies, diagnoses, labs, etc.)
 * strictly from document content with zero filename reliance.
 *
 * CRITICAL CLINICAL SAFETY RULES:
 * 1. A non-clinical or uncertain document must NEVER become clinical evidence.
 * 2. NO filename-based verification (content-only evaluation).
 * 3. Gemini may ONLY extract information actually present in the document.
 *    If not present, return empty arrays. Never invent facts.
 */

// DEMO MODE: OpenRouter is the only active AI provider — Gemini is sidelined
import { openRouterService } from './openrouter.service.js';
import { ControlledClinicalDocumentCategory, IExtractedClinicalData } from '../models/document.model.js';
import { logger } from '../utils/logger.js';
import { AppError } from '../middleware/errorHandler.js';

export type ClassificationType = 'CLINICAL' | 'NON_CLINICAL' | 'UNKNOWN';

export interface ClassificationResult {
  classification: ClassificationType;
  documentType: ControlledClinicalDocumentCategory;
  confidence: number;
  reason: string;
  extractedClinicalData?: IExtractedClinicalData | null;
}

export type ClassifierMockFn = (
  text: string,
  originalFilename?: string
) => Promise<ClassificationResult> | ClassificationResult;

export class ClinicalDocumentClassifierService {
  private mockClassifier: ClassifierMockFn | null = null;

  /**
   * Inject a mock classifier for deterministic unit/integration testing
   */
  public setMockClassifier(fn: ClassifierMockFn | null): void {
    this.mockClassifier = fn;
  }

  /**
   * Resets mock to use live Gemini classifier
   */
  public resetMockClassifier(): void {
    this.mockClassifier = null;
  }

  /**
   * Classifies extracted document text and extracts supported clinical information.
   * Driven strictly by document text content — NO filename-based verification.
   */
  public async classifyDocument(
    text: string,
    documentId: string = 'doc-unknown',
    originalFilename?: string
  ): Promise<ClassificationResult> {
    const trimmedText = (text || '').trim();

    // 1. If test mock is provided, execute mock safely and normalize output
    if (this.mockClassifier) {
      try {
        const mockRes = await this.mockClassifier(text, originalFilename);
        return this.validateAndNormalizeResult(mockRes, documentId);
      } catch (mockErr) {
        logger.warn('Mock classifier threw error; falling back to conservative safety classifier', {
          error: mockErr instanceof Error ? mockErr.message : String(mockErr)
        });
        return this.fallbackHeuristicClassification(trimmedText, documentId, 'Mock/AI error');
      }
    }

    if (!trimmedText || trimmedText.length < 10) {
      return {
        classification: 'UNKNOWN',
        documentType: 'UNKNOWN',
        confidence: 0,
        reason: 'Extracted text is empty or insufficient for clinical classification.',
        extractedClinicalData: null
      };
    }

    // 2. Pure Content-based Heuristic Pre-Check for Obvious Non-Clinical Documents (NO filename checking)
    const heuristicNonClinical = this.detectObviousNonClinicalText(trimmedText);
    if (heuristicNonClinical) {
      logger.info('Document classified as NON_CLINICAL via content-based safety pre-check', {
        reason: heuristicNonClinical.reason
      });
      return heuristicNonClinical;
    }

    // 3. [DEMO MODE] AI Classification & Extraction via OpenRouter only
    try {
      if (!openRouterService.isConfigured()) {
        return this.fallbackHeuristicClassification(trimmedText, documentId, 'AI service not configured');
      }

      const prompt = this.buildClassificationAndExtractionPrompt(trimmedText);
      const systemInstruction =
        'You are an authoritative hospital medical document analyzer. ' +
        'Your tasks are: ' +
        '1. Determine whether the provided document text represents a valid clinical document or a non-clinical document. ' +
        '2. If clinical, classify into controlled clinical categories. ' +
        '3. Extract ONLY supported clinical entities (medications, allergies, diagnoses, lab values, dates, doctors, procedures) that actually appear in the text. ' +
        'CRITICAL CLINICAL RULE: Do NOT invent, assume, infer, or fabricate any medications, diagnoses, lab values, or dates not explicitly written in the text. ' +
        'If a category is not present, return an empty array []. ' +
        'DO NOT provide any medical diagnosis or treatment prescriptions. ' +
        'Respond strictly in the requested JSON schema.';

      logger.info('AI document classification request initiated', { selectedProvider: 'openrouter', model: openRouterService.getModel(), documentId });

      const result = await openRouterService.generateStructuredJson<any>(prompt, {
        systemInstruction,
        temperature: 0.1,
        maxOutputTokens: 1200
      });

      logger.info('AI document classification completed', { selectedProvider: 'openrouter', finalProvider: 'openrouter', documentId });
      return this.validateAndNormalizeResult(result, documentId);
    } catch (aiError) {
      logger.error('Clinical document AI classification failed', {
        documentId,
        error: aiError instanceof Error ? openRouterService.sanitizeError(aiError.message) : String(aiError)
      });
      // Re-throw truthful error without generating fake clinical data
      throw aiError;
    }
  }

  /**
   * Detects obvious non-clinical documents strictly from TEXT content (source code, standard resume, math assignments).
   * Note: NEVER checks filename!
   */
  private detectObviousNonClinicalText(text: string): ClassificationResult | null {
    const lowerText = text.toLowerCase();

    // Check if text is strictly programming code
    const isCode =
      (lowerText.includes('import react') || lowerText.includes('const express = require') || lowerText.includes('export default class')) &&
      !lowerText.includes('patient') &&
      !lowerText.includes('doctor') &&
      !lowerText.includes('prescription');

    if (isCode) {
      return {
        classification: 'NON_CLINICAL',
        documentType: 'NON_CLINICAL',
        confidence: 0.95,
        reason: 'Document text contains software source code rather than clinical health records.',
        extractedClinicalData: null
      };
    }

    // Check if text is a job resume with zero medical patient context
    const isPureResume =
      (lowerText.includes('curriculum vitae') || lowerText.includes('career objective') || lowerText.includes('work experience')) &&
      (lowerText.includes('education:') || lowerText.includes('skills:')) &&
      !lowerText.includes('patient name') &&
      !lowerText.includes('diagnosis:') &&
      !lowerText.includes('prescribed by') &&
      !lowerText.includes('laboratory report');

    if (isPureResume) {
      return {
        classification: 'NON_CLINICAL',
        documentType: 'NON_CLINICAL',
        confidence: 0.95,
        reason: 'Document text indicates a curriculum vitae / job resume without medical record context.',
        extractedClinicalData: null
      };
    }

    return null;
  }

  /**
   * Conservative heuristic classification when AI is unavailable or during basic tests
   */
  private fallbackHeuristicClassification(
    text: string,
    documentId: string,
    reasonContext: string
  ): ClassificationResult {
    const lowerText = text.toLowerCase();

    const hasRx =
      lowerText.includes('rx') ||
      lowerText.includes('prescription') ||
      lowerText.includes('tablet') ||
      lowerText.includes('capsule') ||
      lowerText.includes('mg ') ||
      lowerText.includes('od ') ||
      lowerText.includes('bd ') ||
      lowerText.includes('tds ');

    const hasLab =
      lowerText.includes('lab') ||
      lowerText.includes('hemoglobin') ||
      lowerText.includes('platelet') ||
      lowerText.includes('reference range') ||
      lowerText.includes('specimen') ||
      lowerText.includes('biochemistry') ||
      lowerText.includes('hematology');

    const hasHospital =
      lowerText.includes('hospital') ||
      lowerText.includes('clinic') ||
      lowerText.includes('patient:') ||
      lowerText.includes('doctor:') ||
      lowerText.includes('dr.');

    if (hasRx) {
      return {
        classification: 'CLINICAL',
        documentType: 'Prescription',
        confidence: 0.85,
        reason: `Prescription indicators identified in document content (${reasonContext}).`,
        extractedClinicalData: {
          medications: [],
          allergies: [],
          diagnoses: [],
          labValues: [],
          dates: [],
          doctors: [],
          procedures: [],
          source: 'medical_document',
          documentId
        }
      };
    }

    if (hasLab) {
      return {
        classification: 'CLINICAL',
        documentType: 'Lab Report',
        confidence: 0.85,
        reason: `Laboratory test indicators identified in document content (${reasonContext}).`,
        extractedClinicalData: {
          medications: [],
          allergies: [],
          diagnoses: [],
          labValues: [],
          dates: [],
          doctors: [],
          procedures: [],
          source: 'medical_document',
          documentId
        }
      };
    }

    if (hasHospital) {
      return {
        classification: 'CLINICAL',
        documentType: 'Clinical Record',
        confidence: 0.75,
        reason: `Clinical indicators identified in document content (${reasonContext}).`,
        extractedClinicalData: {
          medications: [],
          allergies: [],
          diagnoses: [],
          labValues: [],
          dates: [],
          doctors: [],
          procedures: [],
          source: 'medical_document',
          documentId
        }
      };
    }

    // Default safety rejection when uncertain
    return {
      classification: 'UNKNOWN',
      documentType: 'UNKNOWN',
      confidence: 0.3,
      reason: `Document text contains insufficient clinical indicators (${reasonContext}).`,
      extractedClinicalData: null
    };
  }

  /**
   * Normalizes and validates Gemini output to ensure controlled enums and non-fabricated clinical data.
   */
  private validateAndNormalizeResult(raw: any, documentId: string): ClassificationResult {
    const validClassifications: ClassificationType[] = ['CLINICAL', 'NON_CLINICAL', 'UNKNOWN'];
    const validCategories: ControlledClinicalDocumentCategory[] = [
      'Prescription',
      'Lab Report',
      'Imaging / Scan',
      'Discharge Summary',
      'Doctor Note',
      'Clinical Record',
      'Other Clinical Document',
      'NON_CLINICAL',
      'UNKNOWN'
    ];

    let classification: ClassificationType = 'UNKNOWN';
    if (raw && typeof raw.classification === 'string') {
      const upper = raw.classification.toUpperCase();
      if (validClassifications.includes(upper as ClassificationType)) {
        classification = upper as ClassificationType;
      }
    }

    let documentType: ControlledClinicalDocumentCategory = 'UNKNOWN';
    if (raw && typeof raw.documentType === 'string') {
      const match = validCategories.find(
        (c) => c.toLowerCase() === raw.documentType.trim().toLowerCase()
      );
      if (match) {
        documentType = match;
      }
    }

    if (classification === 'NON_CLINICAL') {
      documentType = 'NON_CLINICAL';
    } else if (classification === 'UNKNOWN') {
      documentType = 'UNKNOWN';
    }

    const confidence =
      typeof raw?.confidence === 'number' && !isNaN(raw.confidence)
        ? Math.min(1, Math.max(0, raw.confidence))
        : 0.5;

    const reason =
      typeof raw?.reason === 'string' && raw.reason.trim().length > 0
        ? raw.reason.trim()
        : 'Classified based on document content characteristics.';

    let extractedClinicalData: IExtractedClinicalData | null = null;

    if (classification === 'CLINICAL') {
      const rawExt = raw?.extractedClinicalData || raw?.extractedInfo || {};
      extractedClinicalData = {
        medications: Array.isArray(rawExt.medications)
          ? rawExt.medications.map((m: any) => ({
              name: String(m.name || m),
              dosage: m.dosage ? String(m.dosage) : undefined,
              frequency: m.frequency ? String(m.frequency) : undefined,
              route: m.route ? String(m.route) : undefined
            }))
          : [],
        allergies: Array.isArray(rawExt.allergies) ? rawExt.allergies.map(String) : [],
        diagnoses: Array.isArray(rawExt.diagnoses) ? rawExt.diagnoses.map(String) : [],
        labValues: Array.isArray(rawExt.labValues)
          ? rawExt.labValues.map((lv: any) => ({
              testName: String(lv.testName || lv.name || 'Test'),
              value: String(lv.value || ''),
              unit: lv.unit ? String(lv.unit) : undefined,
              referenceRange: lv.referenceRange ? String(lv.referenceRange) : undefined,
              interpretation: lv.interpretation ? String(lv.interpretation) : undefined
            }))
          : [],
        dates: Array.isArray(rawExt.dates) ? rawExt.dates.map(String) : [],
        doctors: Array.isArray(rawExt.doctors) ? rawExt.doctors.map(String) : [],
        procedures: Array.isArray(rawExt.procedures) ? rawExt.procedures.map(String) : [],
        summary: rawExt.summary ? String(rawExt.summary) : undefined,
        source: 'medical_document',
        documentId
      };
    }

    return {
      classification,
      documentType,
      confidence,
      reason,
      extractedClinicalData
    };
  }

  private buildClassificationAndExtractionPrompt(text: string): string {
    const snippet = text.length > 3000 ? `${text.slice(0, 3000)}\n[TRUNCATED]` : text;

    return `Examine the document text below, classify it, and extract supported clinical information.

DOCUMENT TEXT:
"""
${snippet}
"""

Instructions:
1. Determine if this document is 'CLINICAL', 'NON_CLINICAL', or 'UNKNOWN'.
2. If CLINICAL, select exactly one documentType from:
   - 'Prescription'
   - 'Lab Report'
   - 'Imaging / Scan'
   - 'Discharge Summary'
   - 'Doctor Note'
   - 'Clinical Record'
   - 'Other Clinical Document'
3. If NON_CLINICAL, set classification='NON_CLINICAL' and documentType='NON_CLINICAL'.
4. If ambiguous or unclear, set classification='UNKNOWN' and documentType='UNKNOWN'.
5. Set confidence between 0.0 and 1.0.
6. Provide a brief reason (1 sentence).
7. If CLINICAL, extract only information ACTUALLY PRESENT in the text into extractedClinicalData:
   - medications: list of { "name": string, "dosage": string, "frequency": string, "route": string }
   - allergies: list of string
   - diagnoses: list of string
   - labValues: list of { "testName": string, "value": string, "unit": string, "referenceRange": string, "interpretation": string }
   - dates: list of string
   - doctors: list of string
   - procedures: list of string
   - summary: brief factual summary of findings in this document
   CRITICAL RULE: If any category is NOT mentioned in the text, return [] for that category. DO NOT invent or assume any entities.

Return ONLY a JSON object matching this structure:
{
  "classification": "CLINICAL" | "NON_CLINICAL" | "UNKNOWN",
  "documentType": "Prescription" | "Lab Report" | "Imaging / Scan" | "Discharge Summary" | "Doctor Note" | "Clinical Record" | "Other Clinical Document" | "NON_CLINICAL" | "UNKNOWN",
  "confidence": 0.95,
  "reason": "Document contains a physician prescription for...",
  "extractedClinicalData": {
    "medications": [],
    "allergies": [],
    "diagnoses": [],
    "labValues": [],
    "dates": [],
    "doctors": [],
    "procedures": [],
    "summary": "..."
  }
}`;
  }
}

export const clinicalDocumentClassifierService = new ClinicalDocumentClassifierService();
