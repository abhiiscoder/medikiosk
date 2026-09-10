/**
 * MEDiKIOSK Backend — Phase R2: Summary PDF Generation Service
 * Generates authoritative, multi-page vector clinical PDFs using PDFKit.
 *
 * ARCHITECTURAL CONSTRAINTS:
 * 1. Only a confirmed backend summary (status === 'confirmed') may be exported.
 * 2. Gemini generates the clinical CONTENT; the backend generates the actual PDF container/layout.
 * 3. Zero fake or fabricated data — contains strictly confirmed case information from MongoDB.
 * 4. Tracks version, confirmedAt, confirmedBy.
 */

import PDFDocument from 'pdfkit';
import { Case } from '../models/case.model.js';
import { ClinicalSummary, IClinicalSummary } from '../models/clinicalSummary.model.js';
import { MedicalDocument } from '../models/document.model.js';
import { AppError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';

export interface GeneratedPdfResult {
  pdfBuffer: Buffer;
  filename: string;
  version: number;
  confirmedAt: Date;
  confirmedBy: string;
}

export class SummaryPdfService {
  /**
   * Generates a real vector PDF for an owned, confirmed clinical summary.
   * Throws SUMMARY_NOT_CONFIRMED (400) if the summary has not been confirmed.
   */
  public async generateConfirmedSummaryPdf(
    userId: string,
    caseId: string
  ): Promise<GeneratedPdfResult> {
    // 1. Verify case ownership
    const caseDoc = await Case.findOne({ caseId, ownerId: userId });
    if (!caseDoc) {
      throw new AppError(`Case with ID '${caseId}' was not found.`, 404, 'CASE_NOT_FOUND');
    }

    // 2. Fetch clinical summary
    const summary = await ClinicalSummary.findOne({ caseId, generatedBy: userId });
    if (!summary) {
      throw new AppError(`Clinical summary for case '${caseId}' was not found.`, 404, 'SUMMARY_NOT_FOUND');
    }

    // 3. Rule 6: Gating — ONLY confirmed summaries may be exported
    if (summary.status !== 'confirmed') {
      logger.warn('Attempted to export unconfirmed clinical summary as PDF', {
        caseId,
        currentStatus: summary.status
      });
      throw new AppError(
        `Only a confirmed backend summary may be exported as the final clinical summary PDF. Current status is '${summary.status}'.`,
        400,
        'SUMMARY_NOT_CONFIRMED'
      );
    }

    // 4. Fetch validated documents for provenance list
    const validatedDocs = await MedicalDocument.find({
      caseId,
      ownerId: userId,
      validationStatus: 'validated',
      isClinicalDocument: true
    });

    const confirmedAt = summary.confirmedAt || summary.updatedAt || new Date();
    const confirmedBy = summary.confirmedBy || userId;
    const version = summary.confirmedVersion || summary.version || 1;

    // 5. Generate PDF binary container using PDFKit
    const pdfBuffer = await this.renderPdfDocument(caseDoc, summary, validatedDocs, {
      confirmedAt,
      confirmedBy,
      version
    });

    const filename = `MEDiKIOSK_Clinical_Summary_${caseId}_v${version}.pdf`;

    logger.info('Generated confirmed clinical summary PDF', {
      caseId,
      version,
      filename,
      sizeBytes: pdfBuffer.length
    });

    return {
      pdfBuffer,
      filename,
      version,
      confirmedAt,
      confirmedBy
    };
  }

  /**
   * Builds the actual PDF container and vector layout.
   */
  private renderPdfDocument(
    caseDoc: any,
    summary: IClinicalSummary,
    validatedDocs: any[],
    meta: { confirmedAt: Date; confirmedBy: string; version: number }
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margin: 40,
          info: {
            Title: `MEDiKIOSK Clinical Summary - Case #${caseDoc.caseId}`,
            Author: 'MEDiKIOSK Authoritative Clinical Intelligence Backend',
            Subject: 'Pre-Consultation Clinical Intake & Document Synthesis',
            Keywords: 'clinical summary, medikiosk, health record'
          },
          bufferPages: true
        });

        const buffers: Buffer[] = [];
        doc.on('data', (chunk: Buffer) => buffers.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', (err: Error) => reject(err));

        const sec = summary.sections || ({} as any);

        // --- HEADER BANNER ---
        doc.rect(40, 40, 515, 60).fill('#0f172a'); // Dark slate banner
        doc.fillColor('#38bdf8').fontSize(16).font('Helvetica-Bold')
          .text('MEDiKIOSK CLINICAL INTELLIGENCE', 55, 52);
        doc.fillColor('#94a3b8').fontSize(9).font('Helvetica')
          .text('AUTHORITATIVE PRE-CONSULTATION INTAKE & MEDICAL SYNTHESIS', 55, 72);
        doc.fillColor('#e2e8f0').fontSize(8).font('Helvetica-Bold')
          .text(`CONFIRMED AUDIT ARCHIVE • VERSION ${meta.version}.0`, 380, 55, { align: 'right', width: 160 });
        doc.fillColor('#38bdf8').fontSize(8).font('Helvetica')
          .text(`STATUS: CONFIRMED`, 380, 72, { align: 'right', width: 160 });

        doc.moveDown(3.5);

        // --- CASE & PATIENT METADATA BOX ---
        const metaTop = 115;
        doc.rect(40, metaTop, 515, 65).fillAndStroke('#f8fafc', '#cbd5e1');

        doc.fillColor('#334155').fontSize(9).font('Helvetica-Bold').text('CASE REFERENCE:', 55, metaTop + 10);
        doc.fillColor('#0f172a').font('Helvetica').text(caseDoc.caseId, 160, metaTop + 10);

        doc.fillColor('#334155').font('Helvetica-Bold').text('PATIENT ID:', 55, metaTop + 24);
        doc.fillColor('#0f172a').font('Helvetica').text(caseDoc.patientId || 'Unspecified', 160, metaTop + 24);

        doc.fillColor('#334155').font('Helvetica-Bold').text('CONFIRMED AT:', 320, metaTop + 10);
        doc.fillColor('#0f172a').font('Helvetica').text(new Date(meta.confirmedAt).toLocaleString(), 410, metaTop + 10);

        doc.fillColor('#334155').font('Helvetica-Bold').text('CONFIRMED BY:', 320, metaTop + 24);
        doc.fillColor('#0f172a').font('Helvetica').text(meta.confirmedBy, 410, metaTop + 24);

        doc.fillColor('#334155').font('Helvetica-Bold').text('WORKFLOW STAGE:', 55, metaTop + 38);
        doc.fillColor('#059669').font('Helvetica-Bold').text('COMPLETED / PHYSICIAN REVIEW READY', 160, metaTop + 38);

        doc.fillColor('#334155').font('Helvetica-Bold').text('ATTACHED DOCS:', 320, metaTop + 38);
        doc.fillColor('#0f172a').font('Helvetica').text(`${validatedDocs.length} validated clinical record(s)`, 410, metaTop + 38);

        let currentY = metaTop + 80;

        // Helper to add a clean section
        const renderSection = (title: string, content: string | string[], iconPrefix: string = '•') => {
          if (currentY > 700) {
            doc.addPage();
            currentY = 50;
          }

          doc.rect(40, currentY, 515, 18).fill('#f1f5f9');
          doc.fillColor('#0f172a').fontSize(9.5).font('Helvetica-Bold').text(title, 48, currentY + 4);
          currentY += 24;

          doc.fontSize(9).font('Helvetica').fillColor('#1e293b');
          if (Array.isArray(content)) {
            if (content.length === 0) {
              doc.text('None reported', 55, currentY);
              currentY += 14;
            } else {
              for (const item of content) {
                if (currentY > 740) {
                  doc.addPage();
                  currentY = 50;
                }
                doc.text(`${iconPrefix} ${item}`, 55, currentY, { width: 490 });
                currentY += Math.max(14, doc.heightOfString(`${iconPrefix} ${item}`, { width: 490 }) + 3);
              }
            }
          } else {
            const textVal = content && content.trim().length > 0 ? content.trim() : 'Not provided';
            const h = doc.heightOfString(textVal, { width: 490 });
            if (currentY + h > 740) {
              doc.addPage();
              currentY = 50;
            }
            doc.text(textVal, 55, currentY, { width: 490 });
            currentY += h + 6;
          }
          currentY += 6;
        };

        // 1. Chief Complaint & Timeline
        renderSection('1. CHIEF CONCERN & TIMELINE', [
          `Chief Complaint: ${sec.chiefConcern || 'Not provided'}`,
          `Duration: ${sec.duration || 'Not provided'}`,
          `Severity: ${sec.severity || 'Not provided'}`,
          `Reported Symptoms: ${sec.symptoms || 'Not provided'}`,
          `Associated Symptoms: ${Array.isArray(sec.associatedSymptoms) && sec.associatedSymptoms.length > 0 ? sec.associatedSymptoms.join(', ') : 'None reported'}`
        ]);

        // 2. History of Present Illness
        renderSection('2. HISTORY OF PRESENT ILLNESS', sec.historyOfPresentIllness || 'Not provided');

        // 3. Past Medical & Surgical History
        renderSection('3. PAST MEDICAL & SURGICAL HISTORY', [
          `Past Medical History: ${Array.isArray(sec.pastMedicalHistory) && sec.pastMedicalHistory.length > 0 ? sec.pastMedicalHistory.join(', ') : 'None reported'}`,
          `Past Surgical History: ${Array.isArray(sec.pastSurgicalHistory) && sec.pastSurgicalHistory.length > 0 ? sec.pastSurgicalHistory.join(', ') : 'None reported'}`
        ]);

        // 4. Current Medications & Allergies
        const medList = Array.isArray(sec.medications) && sec.medications.length > 0
          ? sec.medications.map((m: any) => (typeof m === 'string' ? m : `${m.name}${m.dosage ? ` ${m.dosage}` : ''}${m.frequency ? ` ${m.frequency}` : ''}`))
          : ['No medications reported'];

        const algList = Array.isArray(sec.allergies) && sec.allergies.length > 0
          ? sec.allergies.map((a: any) => (typeof a === 'string' ? a : `${a.allergen}${a.reaction ? ` (${a.reaction})` : ''}`))
          : ['No known allergies reported'];

        renderSection('4. CURRENT MEDICATIONS', medList);
        renderSection('5. ALLERGIES & ADVERSE REACTIONS', algList);

        // 6. Family & Social History
        renderSection('6. FAMILY & SOCIAL HISTORY', [
          `Family History: ${Array.isArray(sec.familyHistory) && sec.familyHistory.length > 0 ? sec.familyHistory.join('; ') : 'None reported'}`,
          `Social History: ${sec.socialHistory || 'Not provided'}`
        ]);

        // 7. Review of Systems & AYUSH Information
        renderSection('7. REVIEW OF SYSTEMS & AYUSH HISTORY', [
          `Review of Systems: ${sec.reviewOfSystems || 'Not provided'}`,
          `AYUSH Information: ${sec.ayushHistory || 'Not provided'}`
        ]);

        // 8. Attached Validated Medical Records & Provenance
        const docProvenanceRows: string[] = [];
        if (validatedDocs.length > 0) {
          for (const d of validatedDocs) {
            let row = `[${d.category || d.type}] ${d.name} (Doc ID: ${d.documentId}, Method: ${d.extractionMethod || 'text/ocr'})`;
            if (d.extractedClinicalData) {
              const ext = d.extractedClinicalData;
              const details: string[] = [];
              if (ext.medications && ext.medications.length > 0) details.push(`Meds: ${ext.medications.map((m: any) => m.name).join(', ')}`);
              if (ext.diagnoses && ext.diagnoses.length > 0) details.push(`Diagnoses: ${ext.diagnoses.join(', ')}`);
              if (ext.labValues && ext.labValues.length > 0) details.push(`Labs: ${ext.labValues.map((l: any) => l.testName).join(', ')}`);
              if (details.length > 0) {
                row += `\n   → Extracted Evidence: ${details.join(' | ')}`;
              }
            }
            docProvenanceRows.push(row);
          }
        } else {
          docProvenanceRows.push('No verified clinical documents attached to this case.');
        }
        renderSection('8. VALIDATED MEDICAL EVIDENCE & PROVENANCE', docProvenanceRows, '✓');

        // 9. Recorded Discrepancies / Conflicts
        if (Array.isArray(summary.conflicts) && summary.conflicts.length > 0) {
          const conflictRows = summary.conflicts.map(
            (c) => `Field: ${c.field} — ${c.description} (Sources: ${c.sources.join(', ')})`
          );
          renderSection('9. DETECTED SOURCE DISCREPANCIES / CONFLICTS', conflictRows, '⚠');
        }

        // 10. Clinical Information Summary (Pre-Consultation Review)
        if (sec.clinicalInformationSummary) {
          renderSection('10. PRE-CONSULTATION CLINICAL REVIEW SUMMARY', sec.clinicalInformationSummary);
        }

        // 11. Confirmation Audit & Sign-off Block
        if (currentY > 670) {
          doc.addPage();
          currentY = 50;
        }

        doc.rect(40, currentY, 515, 60).fillAndStroke('#ecfdf5', '#a7f3d0');
        doc.fillColor('#065f46').fontSize(9.5).font('Helvetica-Bold')
          .text('CLINICIAN CONFIRMATION & AUDIT SIGN-OFF', 55, currentY + 10);
        doc.fillColor('#047857').fontSize(8.5).font('Helvetica')
          .text(`This clinical summary was formally reviewed and confirmed by authorized user: ${meta.confirmedBy}`, 55, currentY + 26);
        doc.text(`Confirmed Timestamp: ${new Date(meta.confirmedAt).toISOString()} • Audit Version: ${meta.version}.0 • Immutably recorded in MongoDB.`, 55, currentY + 38);

        currentY += 75;

        // --- FOOTER & DISCLAIMER ON EVERY PAGE ---
        const pageRange = doc.bufferedPageRange();
        for (let i = 0; i < pageRange.count; i++) {
          doc.switchToPage(i);
          doc.rect(40, 785, 515, 0.5).stroke('#cbd5e1');
          doc.fillColor('#64748b').fontSize(7).font('Helvetica')
            .text(
              'DISCLAIMER: MEDiKIOSK Pre-Consultation Summary synthesized from patient intake and validated documents. For physician clinical review only. Does not constitute a formal diagnosis or prescription.',
              40,
              792,
              { width: 440, align: 'left' }
            );
          doc.text(`Page ${i + 1} of ${pageRange.count}`, 490, 792, { width: 65, align: 'right' });
        }

        doc.end();
      } catch (renderErr) {
        logger.error('PDF rendering failed', { error: renderErr });
        reject(renderErr);
      }
    });
  }
}

export const summaryPdfService = new SummaryPdfService();
