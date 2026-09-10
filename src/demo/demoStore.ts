/**
 * MEDiKIOSK — Local State Store
 * Self-contained client-side state store for clinical demo workflows.
 * No backend/MongoDB dependency required.
 */
import {
  DEMO_MODE,
  DEMO_PATIENTS,
  DEMO_CASES,
  DEMO_CONVERSATIONS,
  DEMO_ACTIVITIES,
  DEMO_EXTRACTION_RESULTS,
  CLINICAL_INTAKE_QUESTIONS,
  CLINICAL_SUGGESTIONS_BY_TURN,
  getAdaptiveClinicalQuestion,
  getNextDemoExtraction,
  type DemoPatient,
  type DemoCase,
  type DemoMsg,
  type DemoActivity
} from './demoData';
import type { StructuredClinicalSummary } from '../types/clinical.types';
import type { ConversationMessage } from '../types/conversation.types';

export {
  DEMO_MODE,
  DEMO_PATIENTS,
  DEMO_CASES,
  DEMO_CONVERSATIONS,
  DEMO_ACTIVITIES,
  DEMO_EXTRACTION_RESULTS,
  CLINICAL_INTAKE_QUESTIONS,
  CLINICAL_SUGGESTIONS_BY_TURN,
  getAdaptiveClinicalQuestion,
  getNextDemoExtraction
};
export type { DemoPatient, DemoCase, DemoMsg, DemoActivity };

const LS_KEY = 'medikiosk_demo_state';

interface DemoState {
  cases: DemoCase[];
  conversations: Record<string, DemoMsg[]>;
  summaries: Record<string, StructuredClinicalSummary>;
  confirmedCases: string[];
  activities: DemoActivity[];
  nextCaseIndex: number;
}

function loadState(): DemoState {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.cases)) {
        const existingIds = new Set(parsed.cases.map((c: any) => c.caseId));
        for (const c of DEMO_CASES) {
          if (!existingIds.has(c.caseId)) parsed.cases.push(c);
        }
        if (!Array.isArray(parsed.activities) || parsed.activities.length < DEMO_ACTIVITIES.length) {
          parsed.activities = [...DEMO_ACTIVITIES];
        }
        return parsed;
      }
    }
  } catch { /**/ }
  return {
    cases: [...DEMO_CASES],
    conversations: JSON.parse(JSON.stringify(DEMO_CONVERSATIONS)),
    summaries: {},
    confirmedCases: [],
    activities: [...DEMO_ACTIVITIES],
    nextCaseIndex: 100
  };
}

function saveState(s: DemoState): void {
  try { localStorage.setItem(LS_KEY, JSON.stringify(s)); } catch { /**/ }
}

// ============================================================
// DYNAMIC CLINICAL SUMMARY GENERATOR (FROM ACTIVE CONVERSATION)
// ============================================================
function buildDynamicSummary(caseId: string, msgs: DemoMsg[]): StructuredClinicalSummary {
  const userTurns = msgs.filter(m => m.role === 'user').map(m => m.content.trim());

  // Extract from sequential turns
  const chiefComplaint = userTurns[0] || 'Patient presenting for clinical evaluation';
  const onset = userTurns[1] || 'Reported during clinical intake';
  const duration = userTurns[2] || 'Present for several days';
  const location = userTurns[3] || 'Described during intake';
  const severity = userTurns[4] || 'Moderate discomfort (rated by patient)';
  const character = userTurns[5] || 'Aching discomfort';
  const timing = userTurns[6] || 'Fluctuates during the day';
  const aggravating = userTurns[7] || 'Physical activity and fatigue';
  const relieving = userTurns[8] || 'Rest and hydration';
  const associated = userTurns[9] || 'None acute';
  const fever = userTurns[10] || 'Afebrile on presentation';
  const homeRemedies = userTurns[11] || 'Symptomatic measures';
  const pastHistory = userTurns[12] || 'No prior chronic conditions reported';
  const prevEpisodes = userTurns[13] || 'First presentation of current symptoms';
  const currentMeds = userTurns[14] || 'No regular prescription medications';
  const allergies = userTurns[15] || 'No known drug allergies (NKDA)';
  const familyHistory = userTurns[16] || 'Non-contributory family medical history';
  const socialHistory = userTurns[17] || 'Non-smoker, lifestyle history documented';
  const riskFactors = userTurns[18] || 'No recent surgery, travel, or acute risk factors';

  // Build symptoms list from conversation
  const symptoms: string[] = [];
  if (chiefComplaint) symptoms.push(chiefComplaint);
  if (associated && !associated.toLowerCase().includes('none') && !associated.toLowerCase().includes('no')) {
    symptoms.push(associated);
  }
  if (fever && !fever.toLowerCase().includes('no fever') && !fever.toLowerCase().includes('afebrile')) {
    symptoms.push(fever);
  }
  if (symptoms.length === 0) symptoms.push('Clinical symptoms documented during intake');

  // Build medications list
  const medsList: string[] = [];
  if (currentMeds && !currentMeds.toLowerCase().includes('none') && !currentMeds.toLowerCase().includes('no regular')) {
    medsList.push(currentMeds);
  }

  // Build allergies list
  const allergiesList: string[] = [];
  if (allergies && !allergies.toLowerCase().includes('none') && !allergies.toLowerCase().includes('nkda') && !allergies.toLowerCase().includes('no known')) {
    allergiesList.push(allergies);
  } else {
    allergiesList.push('No known allergies (NKDA)');
  }

  const hpi = `Patient presents with ${chiefComplaint}. Onset was ${onset.toLowerCase().startsWith('started') ? onset : 'noted ' + onset}. Duration is ${duration}. Discomfort is localized to ${location}, described as ${character}. Severity rated as ${severity}. Symptoms are aggravated by ${aggravating} and relieved by ${relieving}. Associated symptoms: ${associated}. Past treatment: ${homeRemedies}.`;

  const assessment = `Clinical evaluation for ${chiefComplaint}. Patient reports ${duration} of symptoms with ${severity}. Vitals and physical examination recommended prior to definitive clinical management.`;

  return {
    caseId,
    generatedAt: new Date().toISOString(),
    patientInformation: {
      name: 'Clinical Patient',
      age: '38 years',
      sex: 'Adult',
      isProvided: true,
      source: 'kiosk_registration',
      sourceLabel: 'Kiosk Intake Registration',
      isDemo: false
    },
    chiefConcern: {
      value: chiefComplaint,
      source: 'conversation',
      sourceLabel: 'Patient Statement',
      isProvided: true
    },
    symptoms: {
      value: symptoms,
      source: 'conversation',
      sourceLabel: 'Clinical Intake Conversation',
      isProvided: true
    },
    timeline: {
      value: `Onset: ${onset} • Duration: ${duration}`,
      source: 'conversation',
      sourceLabel: 'Patient Interview',
      isProvided: true
    },
    severity: {
      value: severity,
      source: 'conversation',
      sourceLabel: 'Patient Self-Report',
      isProvided: true
    },
    relevantHistory: {
      value: pastHistory,
      source: 'conversation',
      sourceLabel: 'Patient Medical History',
      isProvided: Boolean(pastHistory)
    },
    medications: {
      value: medsList,
      source: 'conversation',
      sourceLabel: 'Medication Screening',
      isProvided: medsList.length > 0
    },
    allergies: {
      value: allergiesList,
      source: 'conversation',
      sourceLabel: 'Allergy Verification',
      isProvided: true
    },
    familyHistory: {
      value: familyHistory,
      source: 'conversation',
      sourceLabel: 'Clinical Interview',
      isProvided: true
    },
    socialHistory: {
      value: socialHistory,
      source: 'conversation',
      sourceLabel: 'Clinical Interview',
      isProvided: true
    },
    ayushInformation: {
      value: 'No concurrent AYUSH treatments reported.',
      source: 'conversation',
      sourceLabel: 'Clinical Interview',
      isProvided: true
    },
    medicalRecords: {
      verifiedDocuments: [
        {
          id: 'doc-lab-01',
          name: 'Laboratory_Blood_Chemistry_Panel.pdf',
          category: 'Laboratory Report',
          sizeBytes: 142800
        }
      ],
      excludedDocumentsCount: 0
    },
    clinicalInformationSummary: {
      value: `${hpi} Assessment: ${assessment}`,
      source: 'structured_response',
      sourceLabel: 'Clinical Synthesis',
      isProvided: true
    },
    additionalNotes: {
      value: 'Plan: 1. Attending physician physical examination. 2. Reconcile clinical vitals. 3. Order confirmatory diagnostics as indicated.',
      source: 'kiosk_registration',
      sourceLabel: 'Clinical Intake Plan',
      isProvided: true
    },
    isEdited: false
  };
}

// ============================================================
// CLIENT-SIDE VALID PDF 1.4 GENERATOR (MEDiKIOSK_Clinical_Summary.pdf)
// ============================================================
export function createClinicalSummaryPdfBlob(summary: StructuredClinicalSummary): Blob {
  const escapePdf = (text: string) =>
    text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');

  const ptName = summary.patientInformation?.name || 'Clinical Patient';
  const ptAge = summary.patientInformation?.age || '38 years';
  const ptSex = summary.patientInformation?.sex || 'Adult';
  const caseId = summary.caseId || 'case-live';
  const genDate = new Date(summary.generatedAt || Date.now()).toLocaleDateString('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  const rawLines: string[] = [
    "========================================================================",
    "                    MEDiKIOSK CLINICAL SUMMARY REPORT",
    "               Department of Clinical Intake & Evaluation",
    "========================================================================",
    `Case ID: ${caseId}                     Date: ${genDate}`,
    `Patient: ${ptName}             Age/Sex: ${ptAge} / ${ptSex}`,
    "------------------------------------------------------------------------",
    "",
    "1. CHIEF COMPLAINT:",
    `   ${summary.chiefConcern?.value || 'Clinical evaluation requested'}`,
    "",
    "2. HISTORY OF PRESENT ILLNESS (HPI):",
    `   ${summary.timeline?.value || 'Detailed in clinical conversation'}`,
    `   Reported Severity: ${summary.severity?.value || 'Moderate'}`,
    "",
    "3. CLINICAL FINDINGS & REPORTED SYMPTOMS:",
    `   ${(summary.symptoms?.value || []).join(', ') || 'Recorded in intake'}`,
    "",
    "4. PAST MEDICAL HISTORY:",
    `   ${summary.relevantHistory?.value || 'None reported'}`,
    "",
    "5. CURRENT MEDICATIONS:",
    `   ${(summary.medications?.value || []).join(', ') || 'None reported'}`,
    "",
    "6. ALLERGIES:",
    `   ${(summary.allergies?.value || []).join(', ') || 'No known allergies (NKDA)'}`,
    "",
    "7. RELEVANT EXAMINATION & VITALS:",
    "   BP: 120/80 mmHg | Pulse: 76 bpm | Temp: 98.6 F | SpO2: 99% | RR: 16/min",
    "",
    "8. INVESTIGATIONS & LAB PARAMETERS:",
    "   - Hemoglobin: 14.2 g/dL (Normal: 13.5 - 17.5 g/dL)",
    "   - WBC: 7,800 /uL (Normal: 4,500 - 11,000 /uL)",
    "   - Platelets: 245,000 /uL (Normal: 150,000 - 450,000 /uL)",
    "   - Fasting Glucose: 94 mg/dL (Normal: 70 - 100 mg/dL)",
    "   - Serum Creatinine: 0.9 mg/dL (Normal: 0.7 - 1.3 mg/dL)",
    "",
    "9. CLINICAL ASSESSMENT:",
    `   ${summary.clinicalInformationSummary?.value ? summary.clinicalInformationSummary.value.slice(0, 220) : 'Intake synthesis compiled for physician evaluation.'}`,
    "",
    "10. PLAN & FOLLOW-UP:",
    "   1. Attending physician physical examination and review.",
    "   2. Reconcile vitals and continue supportive measures.",
    "   3. Follow-up consultation as clinically indicated.",
    "",
    "========================================================================",
    "CONFIDENTIAL HEALTH RECORD - GENERATED VIA MEDiKIOSK CLINICAL SYSTEM"
  ];

  // Wrap lines to <= 72 characters for clean monospaced printing
  const wrappedLines: string[] = [];
  for (const line of rawLines) {
    if (line.length <= 72) {
      wrappedLines.push(line);
    } else {
      const words = line.split(' ');
      let current = '';
      for (const w of words) {
        if ((current + ' ' + w).length <= 72) {
          current = current ? current + ' ' + w : w;
        } else {
          wrappedLines.push(current);
          current = '   ' + w;
        }
      }
      if (current) wrappedLines.push(current);
    }
  }

  let streamText = "BT\n/F1 9 Tf\n12.5 TL\n40 760 Td\n";
  for (let i = 0; i < wrappedLines.length && i < 52; i++) {
    streamText += `(${escapePdf(wrappedLines[i])}) Tj T*\n`;
  }
  streamText += "ET\n";

  const streamLen = streamText.length;

  const pdfRaw = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>
endobj
4 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>
endobj
5 0 obj
<< /Length ${streamLen} >>
stream
${streamText}endstream
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000244 00000 n 
0000000318 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
${395 + streamLen}
%%EOF`;

  return new Blob([pdfRaw], { type: 'application/pdf' });
}

// ============================================================
// PUBLIC API
// ============================================================

export function getPatients(): DemoPatient[] {
  return DEMO_PATIENTS;
}

export function getCases(): DemoCase[] {
  return loadState().cases;
}

export function getCase(caseId: string): DemoCase | null {
  return loadState().cases.find(c => c.caseId === caseId) ?? null;
}

export function getPatientForCase(caseId: string): DemoPatient | null {
  const c = getCase(caseId);
  if (!c) return null;
  return DEMO_PATIENTS.find(p => p.patientId === c.patientId) ?? DEMO_PATIENTS[0];
}

/**
 * Creates a brand new, completely clean clinical case.
 * Has NO preloaded patient discussion. Begins strictly with the opening question.
 */
export function createCase(patientData?: Partial<DemoPatient>): DemoCase {
  const state = loadState();
  const idx = state.nextCaseIndex++;
  const newCaseId = `case-${Date.now().toString().slice(-4)}`;

  const newCase: DemoCase = {
    caseId: newCaseId,
    patientId: patientData?.patientId || `pt-${newCaseId}`,
    caseTitle: 'Clinical Intake Session',
    status: 'intake',
    chiefComplaint: '',
    symptoms: [],
    duration: '',
    severity: '',
    history: '',
    medications: [],
    allergies: [],
    vitals: { bp: '120/80 mmHg', hr: '76 bpm', temp: '98.6°F', spo2: '99%', rr: '16/min' },
    createdAt: new Date().toISOString(),
    workflowStage: 'clinical_history'
  };

  state.cases.unshift(newCase);

  // START CLEAN: Initialize conversation with ONLY the opening assistant greeting!
  state.conversations[newCaseId] = [
    {
      id: `msg-${Date.now()}-open`,
      role: 'assistant',
      content: "Hello. I'm MEDiKIOSK. I'll help collect the patient's clinical history. What brings you in today?",
      timestamp: new Date().toISOString(),
      provenance: 'ai',
      stage: 'completed'
    }
  ];

  // Ensure no stale summary exists for this clean case
  delete state.summaries[newCaseId];

  const activity: DemoActivity = {
    id: 'act-' + idx,
    type: 'case_created',
    title: 'New Case Opened',
    description: `Clinical intake session initialized for ${newCase.caseId}`,
    timestamp: new Date().toISOString(),
    caseId: newCase.caseId,
    status: 'active'
  };
  state.activities.unshift(activity);

  saveState(state);
  return newCase;
}

export function updateCase(caseId: string, updates: Partial<DemoCase>): void {
  const state = loadState();
  state.cases = state.cases.map(c => c.caseId === caseId ? { ...c, ...updates } : c);
  saveState(state);
}

/**
 * Loads conversation messages. If not yet initialized, returns ONLY the opening greeting!
 */
export function getConversation(caseId: string): ConversationMessage[] {
  const state = loadState();
  if (!state.conversations[caseId] || state.conversations[caseId].length === 0) {
    state.conversations[caseId] = [
      {
        id: `msg-${Date.now()}-open`,
        role: 'assistant',
        content: "Hello. I'm MEDiKIOSK. I'll help collect the patient's clinical history. What brings you in today?",
        timestamp: new Date().toISOString(),
        provenance: 'ai',
        stage: 'completed'
      }
    ];
    saveState(state);
  }

  return state.conversations[caseId].map(m => ({
    id: m.id,
    role: m.role,
    content: m.content,
    timestamp: m.timestamp,
    provenance: m.provenance,
    stage: m.stage
  }));
}

export function addConversationMessage(caseId: string, role: 'user' | 'assistant', content: string): ConversationMessage {
  const state = loadState();
  if (!state.conversations[caseId]) {
    state.conversations[caseId] = [
      {
        id: `msg-${Date.now()}-open`,
        role: 'assistant',
        content: "Hello. I'm MEDiKIOSK. I'll help collect the patient's clinical history. What brings you in today?",
        timestamp: new Date().toISOString(),
        provenance: 'ai',
        stage: 'completed'
      }
    ];
  }

  const msg: DemoMsg = {
    id: 'dm-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
    role,
    content,
    timestamp: new Date().toISOString(),
    provenance: role === 'user' ? 'user' : 'ai',
    stage: 'completed'
  };

  state.conversations[caseId].push(msg);
  saveState(state);
  return msg as ConversationMessage;
}

/**
 * Returns the adaptive next question based on the actual number of user turns for this case.
 */
export function getDemoAIReply(userText: string, caseId?: string): string {
  const state = loadState();
  const msgs = caseId && state.conversations[caseId] ? state.conversations[caseId] : [];
  const userTurnCount = msgs.filter(m => m.role === 'user').length;
  return getAdaptiveClinicalQuestion(userTurnCount, userText);
}

export function getSummary(caseId: string): StructuredClinicalSummary | null {
  const state = loadState();
  return state.summaries[caseId] ?? null;
}

/**
 * Generates a clean structured summary dynamically from the actual completed conversation!
 */
export function generateSummary(caseId: string): StructuredClinicalSummary {
  const state = loadState();
  const msgs = state.conversations[caseId] || [];
  const summary = buildDynamicSummary(caseId, msgs);
  state.summaries[caseId] = summary;

  const activity: DemoActivity = {
    id: 'act-sum-' + Date.now(),
    type: 'summary_generated',
    title: 'Summary Generated',
    description: `Clinical summary compiled for ${caseId}`,
    timestamp: new Date().toISOString(),
    caseId,
    status: 'completed'
  };
  state.activities.unshift(activity);

  saveState(state);
  return summary;
}

export function updateSummary(caseId: string, updates: Partial<StructuredClinicalSummary>): StructuredClinicalSummary {
  const state = loadState();
  const existing = state.summaries[caseId] ?? generateSummary(caseId);
  const updated = { ...existing, ...updates, isEdited: true, lastUpdated: new Date().toISOString() };
  state.summaries[caseId] = updated;
  saveState(state);
  return updated;
}

export function confirmSummary(caseId: string): void {
  const state = loadState();
  if (!state.confirmedCases.includes(caseId)) {
    state.confirmedCases.push(caseId);
  }
  state.cases = state.cases.map(c => c.caseId === caseId ? { ...c, status: 'completed', workflowStage: 'completed' } : c);

  const activity: DemoActivity = {
    id: 'act-conf-' + Date.now(),
    type: 'summary_confirmed',
    title: 'Summary Confirmed',
    description: `Summary verified and locked for case ${caseId}`,
    timestamp: new Date().toISOString(),
    caseId,
    status: 'completed'
  };
  state.activities.unshift(activity);
  saveState(state);
}

export function isSummaryConfirmed(caseId: string): boolean {
  return loadState().confirmedCases.includes(caseId);
}

export function getDemoDocuments(caseId: string) {
  const ext = DEMO_EXTRACTION_RESULTS;
  const idx = parseInt(caseId.slice(-3).replace(/\D/g, '') || '0') % ext.length;
  return ext[idx];
}

export function processUploadedFile(_fileName: string) {
  return getNextDemoExtraction();
}

export function getWorkspaceData() {
  const state = loadState();
  return {
    cases: state.cases,
    activities: state.activities.slice(0, 10),
    totalCases: state.cases.length,
    activeCases: state.cases.filter(c => c.status === 'active' || c.status === 'intake').length,
    completedCases: state.cases.filter(c => c.status === 'completed').length
  };
}
