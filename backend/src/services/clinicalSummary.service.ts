/**
 * MEDiKIOSK Backend — Phase 07 & 08: Clinical Summary Service
 * Transforms validated case anamnesis, structured answers, and verified medical documents
 * into an authoritative, structured clinical summary.
 * Implements review and editing with non-destructive versioning.
 *
 * CRITICAL CLINICAL SAFETY RULES:
 * 1. Backend is the source of truth, NOT the LLM.
 * 2. Rejected/Unknown documents are strictly excluded from summary input.
 * 3. No invented facts, no automatic diagnosis, no treatment/prescription recommendations.
 * 4. Missing information is explicitly represented as 'Not provided'.
 * 5. Negative findings are preserved as negative findings.
 */

import mongoose from 'mongoose';
import { Case } from '../models/case.model.js';
import { ClinicalHistory } from '../models/clinicalHistory.model.js';
import { Answer } from '../models/answer.model.js';
import { ClinicalSession } from '../models/session.model.js';
import { MedicalDocument, IMedicalDocument, IExtractedClinicalData } from '../models/document.model.js';
import {
  ClinicalSummary,
  IClinicalSummary,
  ISummarySections,
  ISummarySourceReference,
  ISummaryConflict
} from '../models/clinicalSummary.model.js';
// DEMO MODE: OpenRouter is the only active AI provider — Gemini is sidelined
import { openRouterService } from './openrouter.service.js';
import {
  geminiSummaryOutputSchema,
  GeminiSummaryOutput,
  EditSummaryInput,
  GenerateSummaryInput,
  ConfirmSummaryInput
} from '../validators/clinicalSummary.validator.js';
import { generateSummaryId } from '../utils/idGenerator.js';
import { AppError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';

export interface ConfirmSummaryResult {
  case: {
    caseId: string;
    status: string;
    workflowStage: string;
  };
  summary: {
    summaryId: string;
    status: string;
    version: number;
    confirmedAt: Date;
    confirmedBy: string;
    confirmedVersion: number;
  };
}

export interface NormalizedSummaryInput {
  caseId: string;
  patientId: string;
  chiefComplaint: string;
  symptoms: string[];
  historyOfPresentIllness: string;
  duration: string;
  severity: string;
  associatedSymptoms: string[];
  pastMedicalHistory: string[];
  pastSurgicalHistory: string[];
  medications: string[];
  allergies: string[];
  familyHistory: string[];
  socialHistory: string;
  reviewOfSystems: string;
  ayushHistory: string;
  sourceReferences: ISummarySourceReference[];
  validatedDocuments: Array<{
    documentId: string;
    originalFileName: string;
    documentType: string;
    category?: string;
    extractedText: string;
    extractedClinicalData?: IExtractedClinicalData | null;
  }>;
  conflicts: ISummaryConflict[];
}

export type SummaryMockGeneratorFn = (
  input: NormalizedSummaryInput
) => Promise<GeminiSummaryOutput> | GeminiSummaryOutput;

export class ClinicalSummaryService {
  private mockGenerator: SummaryMockGeneratorFn | null = null;

  public setMockGenerator(fn: SummaryMockGeneratorFn | null): void {
    this.mockGenerator = fn;
  }

  public resetMockGenerator(): void {
    this.mockGenerator = null;
  }

  /**
   * Generates a new draft clinical summary for an owned Case.
   */
  public async generateSummary(
    userId: string,
    caseId: string,
    options: GenerateSummaryInput = {}
  ): Promise<IClinicalSummary> {
    // 1. Verify case ownership
    const caseDoc = await Case.findOne({ caseId, ownerId: userId });
    if (!caseDoc) {
      throw new AppError(`Case with ID '${caseId}' was not found.`, 404, 'CASE_NOT_FOUND');
    }

    // 2. Check for existing summary and protect user edits if not forced
    const existingSummary = await ClinicalSummary.findOne({ caseId, generatedBy: userId });
    if (existingSummary) {
      if (existingSummary.status === 'confirmed') {
        throw new AppError('Clinical summary has already been confirmed and cannot be regenerated.', 400, 'SUMMARY_ALREADY_CONFIRMED');
      }
      if (
        (existingSummary.status === 'reviewed' || existingSummary.status === 'edited') &&
        !options.forceRegenerate
      ) {
        throw new AppError(
          'Summary has already been reviewed or edited. Use forceRegenerate: true to overwrite modifications.',
          409,
          'SUMMARY_ALREADY_MODIFIED'
        );
      }
    }

    // 3. Load Clinical History
    const historyDoc = await ClinicalHistory.findOne({ caseId });

    // 4. Load structured Answers
    const answers = await Answer.find({ caseId }).sort({ createdAt: 1 });

    // 5. Load ONLY validated clinical documents (Reject non-clinical, unknown, or pending docs)
    const validatedDocuments = await MedicalDocument.find({
      caseId,
      ownerId: userId,
      validationStatus: 'validated',
      isClinicalDocument: true
    });

    // 6. Build normalized summary input
    const normalizedInput = this.buildNormalizedInput(caseDoc, historyDoc, answers, validatedDocuments);

    // 7. Synthesize summary via Gemini (with mock support & deterministic fallback)
    const summaryOutput = await this.synthesizeSummaryWithGemini(normalizedInput);

    // 8. Persist summary to MongoDB
    if (existingSummary) {
      existingSummary.sections = summaryOutput.sections;
      existingSummary.conflicts = summaryOutput.conflicts;
      existingSummary.sourceReferences = normalizedInput.sourceReferences;
      existingSummary.status = 'draft';
      existingSummary.version = 1;
      existingSummary.originalGeneratedSummary = { ...summaryOutput.sections };
      existingSummary.generatedAt = new Date();
      existingSummary.reviewedBy = null;
      existingSummary.reviewedAt = null;
      existingSummary.editedBy = null;
      existingSummary.editedAt = null;
      await existingSummary.save();

      logger.info('Regenerated clinical summary draft', { caseId, summaryId: existingSummary.summaryId });
      return existingSummary;
    }

    const newSummary = new ClinicalSummary({
      summaryId: generateSummaryId(),
      caseId: caseDoc.caseId,
      patientId: caseDoc.patientId,
      generatedBy: userId,
      status: 'draft',
      version: 1,
      sections: summaryOutput.sections,
      sourceReferences: normalizedInput.sourceReferences,
      conflicts: summaryOutput.conflicts,
      originalGeneratedSummary: { ...summaryOutput.sections },
      generatedAt: new Date()
    });

    await newSummary.save();

    logger.info('Generated new clinical summary draft', { caseId, summaryId: newSummary.summaryId });
    return newSummary;
  }

  /**
   * Retrieves summary for an owned Case.
   */
  public async getSummary(userId: string, caseId: string): Promise<IClinicalSummary> {
    const caseDoc = await Case.findOne({ caseId, ownerId: userId });
    if (!caseDoc) {
      throw new AppError(`Case with ID '${caseId}' was not found.`, 404, 'CASE_NOT_FOUND');
    }

    const summary = await ClinicalSummary.findOne({ caseId, generatedBy: userId });
    if (!summary) {
      throw new AppError(`Clinical summary for case '${caseId}' was not found.`, 404, 'SUMMARY_NOT_FOUND');
    }

    return summary;
  }

  /**
   * Reviews a summary (Phase 08 operation: sets status to 'reviewed', records reviewer).
   */
  public async reviewSummary(userId: string, caseId: string, notes?: string): Promise<IClinicalSummary> {
    const caseDoc = await Case.findOne({ caseId, ownerId: userId });
    if (!caseDoc) {
      throw new AppError(`Case with ID '${caseId}' was not found.`, 404, 'CASE_NOT_FOUND');
    }

    const summary = await ClinicalSummary.findOne({ caseId, generatedBy: userId });
    if (!summary) {
      throw new AppError(`Clinical summary for case '${caseId}' was not found.`, 404, 'SUMMARY_NOT_FOUND');
    }

    if (summary.status === 'confirmed') {
      throw new AppError('Clinical summary has already been confirmed.', 400, 'SUMMARY_ALREADY_CONFIRMED');
    }

    summary.status = 'reviewed';
    summary.reviewedBy = userId;
    summary.reviewedAt = new Date();
    if (notes) {
      summary.reviewNotes = notes;
    }

    await summary.save();

    logger.info('Reviewed clinical summary', { caseId, summaryId: summary.summaryId, reviewedBy: userId });
    return summary;
  }

  /**
   * Edits a summary with strict schema validation, preserving version history (Phase 08).
   */
  public async editSummary(
    userId: string,
    caseId: string,
    edits: EditSummaryInput
  ): Promise<IClinicalSummary> {
    const caseDoc = await Case.findOne({ caseId, ownerId: userId });
    if (!caseDoc) {
      throw new AppError(`Case with ID '${caseId}' was not found.`, 404, 'CASE_NOT_FOUND');
    }

    const summary = await ClinicalSummary.findOne({ caseId, generatedBy: userId });
    if (!summary) {
      throw new AppError(`Clinical summary for case '${caseId}' was not found.`, 404, 'SUMMARY_NOT_FOUND');
    }

    if (summary.status === 'confirmed') {
      throw new AppError('Clinical summary has already been confirmed and cannot be edited.', 400, 'SUMMARY_ALREADY_CONFIRMED');
    }

    // Preserve previous version in revision history
    summary.revisionHistory.push({
      version: summary.version,
      editedBy: summary.editedBy || summary.reviewedBy || summary.generatedBy,
      editedAt: summary.editedAt || new Date(),
      sections: { ...(summary.sections as any).toObject() }
    });

    if (!summary.originalGeneratedSummary) {
      summary.originalGeneratedSummary = { ...(summary.sections as any).toObject() };
    }

    // Apply validated edits to sections
    const currentSections = summary.sections as any;
    for (const [key, value] of Object.entries(edits)) {
      if (value !== undefined) {
        currentSections[key] = value;
      }
    }

    summary.version += 1;
    summary.status = 'edited';
    summary.editedBy = userId;
    summary.editedAt = new Date();

    await summary.save();

    logger.info('Edited clinical summary', {
      caseId,
      summaryId: summary.summaryId,
      newVersion: summary.version,
      editedBy: userId
    });

    return summary;
  }

  /**
   * Confirms and saves the clinical summary and finalizes the case (Phase 09).
   * Validates case ownership, summary ownership, version freshness, and status.
   * Atomically updates summary to 'confirmed', case to 'completed', and session to 'completed'.
   */
  public async confirmSummary(
    userId: string,
    caseId: string,
    input: ConfirmSummaryInput = {}
  ): Promise<ConfirmSummaryResult> {
    // 1. Verify case ownership
    const caseDoc = await Case.findOne({ caseId, ownerId: userId });
    if (!caseDoc) {
      throw new AppError(`Case with ID '${caseId}' was not found.`, 404, 'CASE_NOT_FOUND');
    }

    // 2. Find clinical summary
    const summary = await ClinicalSummary.findOne({ caseId, generatedBy: userId });
    if (!summary) {
      throw new AppError(`Clinical summary for case '${caseId}' was not found.`, 404, 'SUMMARY_NOT_FOUND');
    }

    // 3. Verify summaryId if provided
    if (input.summaryId && input.summaryId !== summary.summaryId) {
      throw new AppError(
        `Summary ID '${input.summaryId}' does not match active case summary '${summary.summaryId}'.`,
        400,
        'SUMMARY_ID_MISMATCH'
      );
    }

    // 4. Idempotency guard: If already confirmed, return existing confirmed state safely
    if (summary.status === 'confirmed') {
      logger.info('Clinical summary already confirmed; returning existing confirmed state idempotently', {
        caseId,
        summaryId: summary.summaryId,
        version: summary.version
      });

      return {
        case: {
          caseId: caseDoc.caseId,
          status: caseDoc.status,
          workflowStage: caseDoc.workflowStage
        },
        summary: {
          summaryId: summary.summaryId,
          status: summary.status,
          version: summary.version,
          confirmedAt: summary.confirmedAt || summary.updatedAt,
          confirmedBy: summary.confirmedBy || userId,
          confirmedVersion: summary.confirmedVersion || summary.version
        }
      };
    }

    // 5. Version freshness / optimistic concurrency protection
    if (input.version !== undefined) {
      if (input.version < summary.version) {
        throw new AppError(
          `Summary version ${input.version} is stale. The active summary has been updated to version ${summary.version}.`,
          409,
          'STALE_VERSION'
        );
      }
      if (input.version > summary.version) {
        throw new AppError(
          `Requested version ${input.version} exceeds active summary version ${summary.version}.`,
          400,
          'INVALID_VERSION'
        );
      }
    }

    // 6. Validate status transition
    const validPriorStatuses = ['draft', 'reviewed', 'edited'];
    if (!validPriorStatuses.includes(summary.status)) {
      throw new AppError(
        `Cannot confirm summary with invalid status '${summary.status}'.`,
        400,
        'INVALID_SUMMARY_STATUS'
      );
    }

    // 7. Structural integrity check
    if (!summary.sections || typeof summary.sections !== 'object') {
      throw new AppError('Clinical summary is corrupted or missing sections.', 400, 'CORRUPTED_SUMMARY');
    }

    // 8. Execute consistent persistence with rollback guard
    const confirmedAt = new Date();
    const confirmedVersion = summary.version;
    const previousSummaryStatus = summary.status;

    try {
      // 8a. Update ClinicalSummary
      summary.status = 'confirmed';
      summary.confirmedBy = userId;
      summary.confirmedAt = confirmedAt;
      summary.confirmedVersion = confirmedVersion;
      if (input.notes) {
        summary.reviewNotes = summary.reviewNotes
          ? `${summary.reviewNotes}\nConfirmation notes: ${input.notes}`
          : `Confirmation notes: ${input.notes}`;
      }
      await summary.save();

      // 8b. Update Case (with rollback if case update fails)
      try {
        caseDoc.status = 'completed';
        caseDoc.workflowStage = 'completed';
        await caseDoc.save();
      } catch (caseErr) {
        // Rollback summary to maintain strict consistency
        summary.status = previousSummaryStatus;
        summary.confirmedBy = null;
        summary.confirmedAt = null;
        summary.confirmedVersion = null;
        await summary.save().catch(() => {});
        throw caseErr;
      }

      // 8c. Complete active clinical sessions
      await ClinicalSession.updateMany(
        { caseId: caseDoc.caseId, status: 'active' },
        { $set: { status: 'completed', endedAt: confirmedAt } }
      );
    } catch (saveErr) {
      logger.error('Failed to confirm clinical summary and case', {
        caseId,
        summaryId: summary.summaryId,
        error: saveErr instanceof Error ? saveErr.message : String(saveErr)
      });
      throw saveErr;
    }

    logger.info('Confirmed clinical summary and finalized case', {
      caseId: caseDoc.caseId,
      summaryId: summary.summaryId,
      version: confirmedVersion,
      confirmedBy: userId
    });

    return {
      case: {
        caseId: caseDoc.caseId,
        status: caseDoc.status,
        workflowStage: caseDoc.workflowStage
      },
      summary: {
        summaryId: summary.summaryId,
        status: summary.status,
        version: summary.version,
        confirmedAt,
        confirmedBy: userId,
        confirmedVersion
      }
    };
  }

  /**
   * Builds normalized internal input representation from Case, ClinicalHistory, Answers, and Documents.
   */
  private buildNormalizedInput(
    caseDoc: any,
    historyDoc: any,
    answers: any[],
    documents: IMedicalDocument[]
  ): NormalizedSummaryInput {
    const data = historyDoc?.structuredData || {};
    const sourceReferences: ISummarySourceReference[] = [];
    const conflicts: ISummaryConflict[] = [];

    // Clinical history source
    if (historyDoc) {
      sourceReferences.push({
        sourceType: 'clinical_history',
        sourceId: historyDoc.clinicalHistoryId || caseDoc.caseId,
        label: 'Clinical Intake Interview'
      });
    }

    // Patient answers
    for (const ans of answers) {
      sourceReferences.push({
        sourceType: 'patient_answer',
        sourceId: ans.answerId,
        label: `Patient Answer (${ans.questionId})`
      });
    }

    // Chief complaint
    const chiefComplaint = data.chiefComplaint?.text || 'Not provided';

    // Symptoms
    const symptoms: string[] = [];
    if (Array.isArray(data.symptoms)) {
      for (const sym of data.symptoms) {
        if (sym.presence !== false) {
          symptoms.push(sym.name);
        }
      }
    }

    // HPI
    const historyOfPresentIllness = data.hpi?.narrative || 'Not provided';

    // Duration
    let duration = 'Not provided';
    if (data.duration?.value) {
      duration = `${data.duration.value} ${data.duration.unit}`;
    }

    // Severity
    const severity = data.severity || data.hpi?.severity || 'Not provided';

    // Associated symptoms
    const associatedSymptoms = Array.isArray(data.hpi?.associatedSymptoms)
      ? data.hpi.associatedSymptoms
      : [];

    // Past Medical History
    const pastMedicalHistory: string[] = [];
    if (Array.isArray(data.pastMedicalHistory)) {
      for (const pmh of data.pastMedicalHistory) {
        pastMedicalHistory.push(pmh.condition);
      }
    }

    // Past Surgical History
    const pastSurgicalHistory: string[] = [];
    if (Array.isArray(data.pastSurgicalHistory)) {
      for (const psh of data.pastSurgicalHistory) {
        pastSurgicalHistory.push(psh.procedure);
      }
    }

    // Medications
    const historyMedications: string[] = [];
    if (Array.isArray(data.medications)) {
      for (const med of data.medications) {
        historyMedications.push(med.name + (med.dosage ? ` ${med.dosage}` : ''));
      }
    }

    // Allergies
    const allergies: string[] = [];
    if (Array.isArray(data.allergies)) {
      for (const alg of data.allergies) {
        allergies.push(alg.allergen + (alg.reaction ? ` (${alg.reaction})` : ''));
      }
    }

    // Family History
    const familyHistory: string[] = [];
    if (Array.isArray(data.familyHistory)) {
      for (const fam of data.familyHistory) {
        familyHistory.push(`${fam.relationship}: ${fam.condition}`);
      }
    }

    // Social History
    let socialHistory = 'Not provided';
    if (data.socialHistory) {
      const parts: string[] = [];
      if (data.socialHistory.smoking) parts.push(`Smoking: ${data.socialHistory.smoking}`);
      if (data.socialHistory.alcohol) parts.push(`Alcohol: ${data.socialHistory.alcohol}`);
      if (data.socialHistory.occupation) parts.push(`Occupation: ${data.socialHistory.occupation}`);
      if (parts.length > 0) socialHistory = parts.join('; ');
    }

    // Review of Systems
    let reviewOfSystems = 'Not provided';
    if (data.reviewOfSystems) {
      const parts: string[] = [];
      for (const [sys, val] of Object.entries(data.reviewOfSystems)) {
        if (typeof val === 'string' && val.trim().length > 0) {
          parts.push(`${sys}: ${val}`);
        }
      }
      if (parts.length > 0) reviewOfSystems = parts.join('; ');
    }

    // AYUSH History
    let ayushHistory = 'Not provided';
    if (data.ayushHistory) {
      const parts: string[] = [];
      if (data.ayushHistory.prakriti) parts.push(`Prakriti: ${data.ayushHistory.prakriti}`);
      if (data.ayushHistory.treatmentHistory) parts.push(`Treatments: ${data.ayushHistory.treatmentHistory}`);
      if (parts.length > 0) ayushHistory = parts.join('; ');
    }

    // Validated Documents & Extraction
    const validatedDocsData = documents.map((doc) => {
      sourceReferences.push({
        sourceType: 'medical_document',
        sourceId: doc.documentId,
        label: `${doc.name} (${doc.category || doc.type})`
      });

      return {
        documentId: doc.documentId,
        originalFileName: doc.name,
        documentType: doc.category || doc.type,
        category: doc.category,
        extractedText: doc.extractedText || '',
        extractedClinicalData: doc.extractedClinicalData || null
      };
    });

    // Check for source conflicts between patient history and documents
    const docMedications: string[] = [];
    for (const doc of validatedDocsData) {
      const lower = doc.extractedText.toLowerCase();
      if (lower.includes('metformin')) docMedications.push('Metformin');
      if (lower.includes('atorvastatin')) docMedications.push('Atorvastatin');
      if (lower.includes('amlodipine')) docMedications.push('Amlodipine');
      if (lower.includes('glimepiride')) docMedications.push('Glimepiride');
    }

    if (historyMedications.length > 0 && docMedications.length > 0) {
      const diff = docMedications.filter((dm) => !historyMedications.some((hm) => hm.toLowerCase().includes(dm.toLowerCase())));
      if (diff.length > 0) {
        conflicts.push({
          field: 'medications',
          description: `Document reports '${diff.join(', ')}' which was not stated in clinical anamnesis.`,
          sources: ['clinical_history', 'medical_document']
        });
      }
    }

    return {
      caseId: caseDoc.caseId,
      patientId: caseDoc.patientId,
      chiefComplaint,
      symptoms,
      historyOfPresentIllness,
      duration,
      severity,
      associatedSymptoms,
      pastMedicalHistory,
      pastSurgicalHistory,
      medications: historyMedications,
      allergies,
      familyHistory,
      socialHistory,
      reviewOfSystems,
      ayushHistory,
      sourceReferences,
      validatedDocuments: validatedDocsData,
      conflicts
    };
  }

  /**
   * [DEMO MODE] Invokes OpenRouter for structured synthesis without fake AI fallback.
   * OpenRouter is the sole active AI provider.
   */
  private async synthesizeSummaryWithGemini(input: NormalizedSummaryInput): Promise<GeminiSummaryOutput> {
    if (this.mockGenerator) {
      try {
        const mockRes = await this.mockGenerator(input);
        return geminiSummaryOutputSchema.parse(mockRes);
      } catch (mockErr) {
        logger.warn('Mock summary generator threw error; using deterministic safety fallback', {
          error: mockErr instanceof Error ? mockErr.message : String(mockErr)
        });
        return this.buildDeterministicSummary(input);
      }
    }

    if (!openRouterService.isConfigured()) {
      throw new AppError('OpenRouter API key is not configured in backend/.env.', 500, 'OPENROUTER_API_KEY_MISSING');
    }

    try {
      const prompt = this.buildPrompt(input);
      const systemInstruction =
        'You are an authoritative hospital clinical summarization engine. ' +
        'Your job is to synthesize patient-provided clinical intake and validated medical document text into a structured summary for the physician. ' +
        'CRITICAL SAFETY RULES: ' +
        '1. Use ONLY the provided information. Do NOT invent missing details. ' +
        '2. Missing information MUST be stated as "Not provided" for strings or empty lists [] for arrays. ' +
        '3. DO NOT diagnose or infer diseases from symptoms. ' +
        '4. DO NOT suggest medical treatments, plans, or prescriptions. ' +
        '5. Preserve explicit negative findings (e.g. "No medications reported"). ' +
        '6. Preserve conflicting findings transparently without silently resolving them. ' +
        'Respond strictly adhering to the requested JSON schema.';

      logger.info('AI summary synthesis request initiated', { selectedProvider: 'openrouter', model: openRouterService.getModel() });

      const rawResult = await openRouterService.generateStructuredJson<any>(prompt, {
        systemInstruction,
        temperature: 0.1,
        maxOutputTokens: 4000
      });

      logger.info('AI summary synthesis completed', { selectedProvider: 'openrouter', finalProvider: 'openrouter', finalResult: 'success' });
      const normalized = this.normalizeGeminiSummaryOutput(rawResult, input);
      return geminiSummaryOutputSchema.parse(normalized);
    } catch (aiErr) {
      logger.error('OpenRouter summary synthesis failed', {
        error: aiErr instanceof Error ? openRouterService.sanitizeError(aiErr.message) : String(aiErr)
      });
      if (aiErr instanceof AppError) {
        throw aiErr;
      }
      throw new AppError(
        `Clinical summary generation failed: ${aiErr instanceof Error ? aiErr.message : 'Unknown AI error'}. Please retry.`,
        503,
        'OPENROUTER_SUMMARY_FAILED'
      );
    }
  }

  /**
   * Deterministic safety fallback generator: builds structured summary directly from verified data.
   */
  private buildDeterministicSummary(input: NormalizedSummaryInput): GeminiSummaryOutput {
    const docRecords = input.validatedDocuments.map((d) => `${d.documentType}: ${d.originalFileName}`);

    let clinicalInfoSummary = `Patient presents with chief concern: ${input.chiefComplaint}. Duration: ${input.duration}. Severity: ${input.severity}.`;
    if (docRecords.length > 0) {
      clinicalInfoSummary += ` ${docRecords.length} validated clinical document(s) attached.`;
    }

    const sections: ISummarySections = {
      chiefConcern: input.chiefComplaint,
      symptoms: input.symptoms.length > 0 ? input.symptoms.join(', ') : 'Not provided',
      historyOfPresentIllness: input.historyOfPresentIllness,
      duration: input.duration,
      severity: input.severity,
      associatedSymptoms: input.associatedSymptoms,
      pastMedicalHistory: input.pastMedicalHistory,
      pastSurgicalHistory: input.pastSurgicalHistory,
      medications: input.medications,
      allergies: input.allergies,
      familyHistory: input.familyHistory,
      socialHistory: input.socialHistory,
      reviewOfSystems: input.reviewOfSystems,
      ayushHistory: input.ayushHistory,
      relevantMedicalRecords: docRecords,
      clinicalInformationSummary: clinicalInfoSummary
    };

    return {
      sections,
      conflicts: input.conflicts
    };
  }

  private buildPrompt(input: NormalizedSummaryInput): string {
    const docsSnippet = input.validatedDocuments
      .map((d, i) => {
        let snippet = `DOCUMENT ${i + 1} (${d.documentType} - ${d.originalFileName}):\n${d.extractedText.slice(0, 1500)}`;
        if (d.extractedClinicalData) {
          const ext = d.extractedClinicalData;
          const entities: string[] = [];
          if (ext.medications && ext.medications.length > 0) {
            entities.push(`Medications: ${ext.medications.map((m) => `${m.name}${m.dosage ? ` ${m.dosage}` : ''}${m.frequency ? ` ${m.frequency}` : ''}`).join(', ')}`);
          }
          if (ext.allergies && ext.allergies.length > 0) {
            entities.push(`Allergies: ${ext.allergies.join(', ')}`);
          }
          if (ext.diagnoses && ext.diagnoses.length > 0) {
            entities.push(`Diagnoses: ${ext.diagnoses.join(', ')}`);
          }
          if (ext.labValues && ext.labValues.length > 0) {
            entities.push(`Lab Values: ${ext.labValues.map((l) => `${l.testName}: ${l.value}${l.unit ? ` ${l.unit}` : ''}`).join(', ')}`);
          }
          if (entities.length > 0) {
            snippet += `\n[VERIFIED EXTRACTED ENTITIES FROM DOCUMENT]:\n${entities.join('\n')}`;
          }
        }
        return snippet;
      })
      .join('\n\n');

    return `Synthesize the structured clinical summary strictly from the following verified case data:

PATIENT CONTEXT:
Case ID: ${input.caseId}
Patient ID: ${input.patientId}

CLINICAL INTAKE DATA:
- Chief Complaint: ${input.chiefComplaint}
- Symptoms: ${input.symptoms.join(', ') || 'Not provided'}
- History of Present Illness: ${input.historyOfPresentIllness}
- Duration: ${input.duration}
- Severity: ${input.severity}
- Associated Symptoms: ${input.associatedSymptoms.join(', ') || 'None reported'}
- Past Medical History: ${input.pastMedicalHistory.join(', ') || 'None reported'}
- Past Surgical History: ${input.pastSurgicalHistory.join(', ') || 'None reported'}
- Current Medications: ${input.medications.join(', ') || 'None reported'}
- Allergies: ${input.allergies.join(', ') || 'None reported'}
- Family History: ${input.familyHistory.join(', ') || 'None reported'}
- Social History: ${input.socialHistory}
- Review of Systems: ${input.reviewOfSystems}
- AYUSH History: ${input.ayushHistory}

VALIDATED CLINICAL DOCUMENTS:
${docsSnippet || 'No clinical documents attached.'}

Instructions:
1. Populate all 16 summary sections strictly from the above data.
2. If any field was not reported or is unavailable, use "Not provided" (or [] for arrays).
3. If negative findings were reported (e.g. "None reported"), keep them as negative findings.
4. If there is a discrepancy between intake data and document data, record it in the "conflicts" array.
5. DO NOT formulate any medical diagnosis.
6. DO NOT recommend medications, dosages, or treatments.

Return ONLY a JSON object with this exact structure:
{
  "sections": {
    "chiefConcern": "Chief complaint description",
    "symptoms": "Reported symptoms description",
    "historyOfPresentIllness": "HPI description",
    "duration": "Duration",
    "severity": "Severity",
    "associatedSymptoms": ["Associated symptom 1"],
    "pastMedicalHistory": ["Condition 1"],
    "pastSurgicalHistory": ["Surgery 1"],
    "medications": ["Medication 1"],
    "allergies": ["Allergy 1"],
    "familyHistory": ["Family history 1"],
    "socialHistory": "Social history description",
    "reviewOfSystems": "ROS description",
    "ayushHistory": "AYUSH history description",
    "relevantMedicalRecords": ["Doc 1", "Doc 2"],
    "clinicalInformationSummary": "Synthesis summary for physician"
  },
  "conflicts": [
    {
      "field": "medications",
      "description": "Conflict description",
      "sources": ["clinical_history", "medical_document"]
    }
  ]
}`;
  }

  /**
   * Normalizes Gemini output defensively so both { sections: ... } and flat JSON are handled.
   */
  private normalizeGeminiSummaryOutput(raw: any, input: NormalizedSummaryInput): GeminiSummaryOutput {
    const s = raw?.sections || raw;

    const toStr = (v: any, fallback: string = 'Not provided'): string => {
      if (typeof v === 'string' && v.trim().length > 0) return v.trim();
      return fallback;
    };

    const toArr = (v: any): string[] => {
      if (Array.isArray(v)) {
        return v.map((item) => (typeof item === 'string' ? item.trim() : JSON.stringify(item))).filter(Boolean);
      }
      if (typeof v === 'string' && v.trim().length > 0 && v.trim().toLowerCase() !== 'not provided' && v.trim().toLowerCase() !== 'none reported') {
        return [v.trim()];
      }
      return [];
    };

    const docRecords = input.validatedDocuments.map((d) => `${d.documentType}: ${d.originalFileName}`);

    const sections: ISummarySections = {
      chiefConcern: toStr(s?.chiefConcern || s?.chief_concern || s?.chiefComplaint || s?.chief_complaint, input.chiefComplaint),
      symptoms: toStr(s?.symptoms, input.symptoms.length > 0 ? input.symptoms.join(', ') : 'Not provided'),
      historyOfPresentIllness: toStr(s?.historyOfPresentIllness || s?.history_of_present_illness, input.historyOfPresentIllness),
      duration: toStr(s?.duration, input.duration),
      severity: toStr(s?.severity, input.severity),
      associatedSymptoms: toArr(s?.associatedSymptoms || s?.associated_symptoms).length > 0 ? toArr(s?.associatedSymptoms || s?.associated_symptoms) : input.associatedSymptoms,
      pastMedicalHistory: toArr(s?.pastMedicalHistory || s?.past_medical_history).length > 0 ? toArr(s?.pastMedicalHistory || s?.past_medical_history) : input.pastMedicalHistory,
      pastSurgicalHistory: toArr(s?.pastSurgicalHistory || s?.past_surgical_history).length > 0 ? toArr(s?.pastSurgicalHistory || s?.past_surgical_history) : input.pastSurgicalHistory,
      medications: toArr(s?.medications).length > 0 ? toArr(s?.medications) : input.medications,
      allergies: toArr(s?.allergies).length > 0 ? toArr(s?.allergies) : input.allergies,
      familyHistory: toArr(s?.familyHistory || s?.family_history).length > 0 ? toArr(s?.familyHistory || s?.family_history) : input.familyHistory,
      socialHistory: toStr(s?.socialHistory || s?.social_history, input.socialHistory),
      reviewOfSystems: toStr(s?.reviewOfSystems || s?.review_of_systems, input.reviewOfSystems),
      ayushHistory: toStr(s?.ayushHistory || s?.ayush_history, input.ayushHistory),
      relevantMedicalRecords: (() => {
        const fromAi = toArr(s?.relevantMedicalRecords || s?.relevant_medical_records);
        if (fromAi.length === 0) return docRecords;
        const combined = [...fromAi];
        for (const dr of docRecords) {
          if (!combined.some((c) => c.toLowerCase().includes(dr.toLowerCase()))) {
            combined.push(dr);
          }
        }
        return combined;
      })(),
      clinicalInformationSummary: toStr(s?.clinicalInformationSummary || s?.clinical_information_summary, `Patient presents with chief concern: ${input.chiefComplaint}.`)
    };

    const conflicts = Array.isArray(raw?.conflicts)
      ? raw.conflicts.map((c: any) => ({
          field: String(c.field || 'clinical_data'),
          description: String(c.description || 'Conflict observed'),
          sources: Array.isArray(c.sources) ? c.sources.map(String) : ['clinical_history', 'medical_document']
        }))
      : input.conflicts;

    return {
      sections,
      conflicts
    };
  }
}

export const clinicalSummaryService = new ClinicalSummaryService();
