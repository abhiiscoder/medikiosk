/**
 * MEDiKIOSK Backend — Phase 04: Clinical Conversation Prompts & Templates
 * Strict clinical anamnesis system instructions and extraction prompt templates.
 */

export const CLINICAL_INTAKE_SYSTEM_INSTRUCTION = `
You are the MEDiKIOSK Authoritative Clinical Anamnesis Assistant.
Your sole responsibility is to assist in accurate, structured clinical history intake from patients.

STRICT MEDICAL & SAFETY RULES:
1. YOU ARE NOT A DIAGNOSTIC SYSTEM. NEVER diagnose the patient or speculate on medical conditions (e.g. do NOT classify "headache" as "migraine").
2. YOU ARE NOT A PRESCRIBING SYSTEM. NEVER recommend or prescribe medications, dosages, or treatments.
3. NEVER INVENT OR HALLUCINATE FACTS. Only extract what the patient explicitly stated. Never assume symptoms, history, or allergies.
4. EXPLICIT NEGATIVES VS MISSING: If a patient explicitly denies something (e.g., "No allergies", "I don't take medications"), record that explicit negative. If not mentioned, leave the field undefined.
5. VAGUE / AMBIGUOUS ANSWERS: If an answer does not adequately answer the target field (e.g. "quite some time" when asked duration), set needsClarification to true and formulate a focused clarification question.
6. TARGET CONFINEMENT: When suggesting the next question, you MUST stick strictly to the approved next target provided by the system. Never jump to unauthorized clinical topics.
7. STICK TO SCHEMA: Only extract fields supported by the MEDiKIOSK clinical history schema.
8. RETURN VALID JSON ONLY: You must respond in valid JSON conforming to the requested schema.
`.trim();

export interface BuildExtractionPromptParams {
  currentSection: string;
  targetField: string;
  relevantStructuredData: Record<string, unknown>;
  recentDialog: Array<{ role: string; content: string }>;
  patientAnswer: string;
  nextAllowedTarget: {
    section: string;
    field: string;
    defaultQuestion: string;
  };
}

/**
 * Builds a prompt for Gemini to understand the patient's answer, extract structured entities,
 * and generate a conversational next-question for the backend-approved target.
 */
export function buildClinicalExtractionPrompt(params: BuildExtractionPromptParams): string {
  const {
    currentSection,
    targetField,
    relevantStructuredData,
    recentDialog,
    patientAnswer,
    nextAllowedTarget
  } = params;

  const dialogSnippet = recentDialog.length > 0
    ? recentDialog.map((m) => `${m.role.toUpperCase()}: ${m.content}`).join('\n')
    : '(No prior messages in session)';

  return `
CLINICAL CONTEXT:
- Active Clinical Section: "${currentSection}"
- Active Target Field: "${targetField}"
- Currently Captured Structured Data:
${JSON.stringify(relevantStructuredData, null, 2)}

RECENT CONVERSATION HISTORY:
${dialogSnippet}

NEW PATIENT STATEMENT:
"${patientAnswer}"

APPROVED NEXT QUESTION TARGET:
- Next Section: "${nextAllowedTarget.section}"
- Next Target Field: "${nextAllowedTarget.field}"
- Default Reference Question: "${nextAllowedTarget.defaultQuestion}"

TASK:
1. Understand the patient's new statement in the context of the active target field ("${targetField}").
2. Extract all patient-stated factual information into the approved schema fields:
   - chiefComplaint: { text: string }
   - historyOfPresentIllness: { narrative?: string, onset?: string, progression?: string }
   - duration: { value: number, unit: "minutes" | "hours" | "days" | "weeks" | "months" | "years" | "unknown" }
   - severity: "mild" | "moderate" | "severe" | "unknown"
   - symptoms: Array<{ name: string, presence: boolean, severity?: "mild" | "moderate" | "severe", notes?: string }>
   - pastMedicalHistory: Array<{ condition: string, status?: "active" | "resolved" | "managed", notes?: string }>
   - pastSurgicalHistory: Array<{ procedure: string, approximateDate?: string, notes?: string }>
   - medications: Array<{ name: string, dosage?: string, frequency?: string, notes?: string }>
   - allergies: Array<{ allergen: string, reaction?: string, severity?: "mild" | "moderate" | "severe", notes?: string }>
   - familyHistory: Array<{ relationship: string, condition: string, notes?: string }>
   - socialHistory: { smoking?: string, alcohol?: string, occupation?: string, lifestyle?: string, notes?: string }
   - reviewOfSystems: { general?: string, respiratory?: string, cardiovascular?: string, gastrointestinal?: string, neurological?: string, other?: string }
   - ayushHistory: { prakriti?: string, vikriti?: string, treatmentHistory?: string, medicines?: string[], notes?: string }
   (If the patient answered multiple fields at once, extract all stated fields. If the patient explicitly denied something, record presence=false or allergen="No known allergies").
3. Determine answerStatus:
   - "answered": The statement clearly answers the active target field.
   - "partially_answered": The statement provides some detail but remains incomplete.
   - "needs_clarification": The statement is too ambiguous or vague (e.g., "for a while", "not sure").
   - "not_applicable": The patient explicitly stated this section does not apply to them.
   - "unclear": The statement cannot be understood.
4. If needsClarification is true:
   - Formulate a polite, brief, focused clarification question specifically addressing the current target field.
   - Do not advance to the next target field.
5. If needsClarification is false:
   - Formulate a natural, empathetic transition question addressing the APPROVED NEXT QUESTION TARGET ("${nextAllowedTarget.field}").
   - Do NOT ask questions outside the approved next target.

RESPONSE JSON SCHEMA:
{
  "answerUnderstanding": "Brief summary of what the patient conveyed",
  "extractedData": { ...only populate keys that were explicitly addressed... },
  "targetField": "${targetField}",
  "answerStatus": "answered" | "partially_answered" | "needs_clarification" | "not_applicable" | "unclear",
  "needsClarification": boolean,
  "clarificationReason": string or null,
  "suggestedNextQuestion": "Conversational question to present to the patient"
}
`.trim();
}
