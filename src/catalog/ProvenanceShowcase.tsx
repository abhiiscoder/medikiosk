/**
 * MEDiKIOSK — PHASE 00
 * Clinical Information Hierarchy & Provenance Demonstration
 */

import React from 'react';
import { User, Bot, FileText, UserCheck, Settings, AlertTriangle } from 'lucide-react';
import { Section, Stack, Grid } from '../components/layout/Primitives';
import { Card } from '../components/core/Card/Card';
import { Badge } from '../components/core/Badge/Badge';
import { ClinicalCard } from '../components/clinical/ClinicalCard/ClinicalCard';

export const ProvenanceShowcase: React.FC = () => {
  return (
    <Stack gap={6}>
      <Section
        title="Clinical Information Hierarchy & Provenance System"
        subtitle="MEDiKIOSK enforces strict visual provenance: unverified AI extractions, patient-reported symptoms, and physician-reviewed facts are clearly differentiated."
      >
        <Card padding="md" highlight>
          <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'flex-start' }}>
            <AlertTriangle size={20} color="var(--color-brand-primary)" style={{ marginTop: '2px' }} />
            <div>
              <h4 className="text-heading-subsection">Core Patient Safety Rule</h4>
              <p className="text-body" style={{ marginTop: '4px' }}>
                AI-extracted findings must <strong>never</strong> be visually presented as verified clinical ground truth.
                In MEDiKIOSK, all AI observations carry the clinical purple intelligence badge and an explicit confidence score
                until an authorized physician signs off, transitioning the entity to emerald verified status.
              </p>
            </div>
          </div>
        </Card>

        <Grid cols={2} gap={4}>
          {/* User-Provided Tier */}
          <ClinicalCard
            title="1. Patient-Reported Statement"
            category="User Input • Subjective"
            source="user"
            verificationLevel="unverified"
          >
            "I feel pain under my breastbone when walking uphill that goes away after sitting."
            <div className="text-metadata text-muted" style={{ marginTop: '8px' }}>
              • Untranslated patient voice / text input
              • Subject to clinical interview clarification
            </div>
          </ClinicalCard>

          {/* AI-Extracted Tier */}
          <ClinicalCard
            title="2. AI-Extracted Entity"
            category="AI Inference • Proposed"
            source="ai"
            verificationLevel="ai_proposed"
            confidenceScore={0.92}
            sourceCitation="Spoken Intake Sentence 1"
          >
            Symptom triad matched: Retrosternal exertional discomfort with rest resolution (CCS Class II Angina candidate).
            <div className="text-metadata text-muted" style={{ marginTop: '8px' }}>
              • Requires clinician sign-off before entering legal EHR
              • Clear confidence percentage displayed
            </div>
          </ClinicalCard>

          {/* Document-Derived Tier */}
          <ClinicalCard
            title="3. Document-Derived Entity"
            category="OCR Extraction • Laboratory"
            source="document"
            verificationLevel="ai_proposed"
            confidenceScore={0.98}
            sourceCitation="Metabolic_Lipid_Panel.pdf (Page 1)"
          >
            Serum Total Cholesterol: 242 mg/dL (High Reference Range: &lt; 200 mg/dL).
            <div className="text-metadata text-muted" style={{ marginTop: '8px' }}>
              • Linked directly to underlying uploaded PDF/image scan
              • Highlighted bounding box verification
            </div>
          </ClinicalCard>

          {/* Clinician-Reviewed Tier */}
          <ClinicalCard
            title="4. Physician-Reviewed & Signed"
            category="Clinical Confirmation • Ground Truth"
            source="clinician"
            verificationLevel="verified"
            sourceCitation="Attending Review: Dr. A. Verma (MCI-DL-2015-88392)"
          >
            Diagnosis Confirmed: Angina Pectoris (ICD-10 I20.9). Scheduled urgent cardiac enzymes and cardiology referral.
            <div className="text-metadata text-muted" style={{ marginTop: '8px' }}>
              • Signed with cryptographic tamper-evident audit trail
              • Authorized for ABDM & hospital EHR export
            </div>
          </ClinicalCard>
        </Grid>
      </Section>
    </Stack>
  );
};
