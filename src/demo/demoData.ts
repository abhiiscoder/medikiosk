/**
 * MEDiKIOSK — Clinical Demo Dataset
 * Centralized Clinical Dataset for Local Demo Mode
 *
 * Natural clinical wording without demo prefixes.
 */

// ============================================================
// DEMO FLAG
// ============================================================
export const DEMO_MODE: boolean = (() => {
  try {
    const env = (import.meta as any).env?.VITE_DEMO_MODE;
    if (env === undefined || env === null) return true;
    return String(env).toLowerCase() !== 'false';
  } catch {
    return true;
  }
})();

// ============================================================
// PATIENTS
// ============================================================
export interface DemoPatient {
  patientId: string;
  name: string;
  firstName: string;
  lastName: string;
  age: number;
  gender: string;
  phone: string;
  bloodGroup: string;
  allergies: string[];
  conditions: string[];
  visitReason: string;
  lastVisit: string;
}

export const DEMO_PATIENTS: DemoPatient[] = [
  { patientId: 'pt-001', name: 'Rajesh Sharma', firstName: 'Rajesh', lastName: 'Sharma', age: 52, gender: 'male', phone: '98XXXXXXXX', bloodGroup: 'B+', allergies: ['Sulfonamides'], conditions: ['Hypertension', 'Type 2 Diabetes'], visitReason: 'Persistent headache and dizziness', lastVisit: '2026-08-20' },
  { patientId: 'pt-002', name: 'Ananya Verma', firstName: 'Ananya', lastName: 'Verma', age: 34, gender: 'female', phone: '97XXXXXXXX', bloodGroup: 'O+', allergies: ['None known'], conditions: ['Mild Asthma'], visitReason: 'Persistent cough and shortness of breath', lastVisit: '2026-09-01' },
  { patientId: 'pt-003', name: 'Sunita Patel', firstName: 'Sunita', lastName: 'Patel', age: 41, gender: 'female', phone: '96XXXXXXXX', bloodGroup: 'A+', allergies: ['Penicillin'], conditions: ['Irritable Bowel Syndrome'], visitReason: 'Abdominal pain and bloating', lastVisit: '2026-08-28' },
  { patientId: 'pt-004', name: 'Vikram Joshi', firstName: 'Vikram', lastName: 'Joshi', age: 28, gender: 'male', phone: '95XXXXXXXX', bloodGroup: 'AB+', allergies: ['None known'], conditions: [], visitReason: 'Fever, chills, and body ache for 3 days', lastVisit: '2026-09-05' },
  { patientId: 'pt-005', name: 'Kavita Reddy', firstName: 'Kavita', lastName: 'Reddy', age: 47, gender: 'female', phone: '94XXXXXXXX', bloodGroup: 'O-', allergies: ['NSAIDs'], conditions: ['Lumbar Disc Herniation'], visitReason: 'Lower back pain radiating to left leg', lastVisit: '2026-08-15' },
  { patientId: 'pt-006', name: 'Meena Kulkarni', firstName: 'Meena', lastName: 'Kulkarni', age: 65, gender: 'female', phone: '93XXXXXXXX', bloodGroup: 'A-', allergies: ['Aspirin', 'Codeine'], conditions: ['Osteoarthritis', 'Hypothyroidism'], visitReason: 'Joint pain and fatigue', lastVisit: '2026-08-10' },
  { patientId: 'pt-007', name: 'Amitabh Sen', firstName: 'Amitabh', lastName: 'Sen', age: 22, gender: 'male', phone: '92XXXXXXXX', bloodGroup: 'B-', allergies: ['None known'], conditions: [], visitReason: 'Sore throat and mild fever', lastVisit: '2026-09-08' },
  { patientId: 'pt-008', name: 'Pooja Iyer', firstName: 'Pooja', lastName: 'Iyer', age: 38, gender: 'female', phone: '91XXXXXXXX', bloodGroup: 'O+', allergies: ['Latex'], conditions: ['Migraine'], visitReason: 'Severe migraine with aura', lastVisit: '2026-08-25' },
  { patientId: 'pt-009', name: 'Naveen Rao', firstName: 'Naveen', lastName: 'Rao', age: 59, gender: 'male', phone: '90XXXXXXXX', bloodGroup: 'AB-', allergies: ['Contrast Dye'], conditions: ['Chronic Kidney Disease Stage 2', 'Hypertension'], visitReason: 'Routine nephrology follow-up', lastVisit: '2026-07-30' },
  { patientId: 'pt-010', name: 'Divya Nair', firstName: 'Divya', lastName: 'Nair', age: 31, gender: 'female', phone: '89XXXXXXXX', bloodGroup: 'B+', allergies: ['None known'], conditions: ['PCOS'], visitReason: 'Irregular cycles and weight gain', lastVisit: '2026-09-02' },
  { patientId: 'pt-011', name: 'Suresh Pillai', firstName: 'Suresh', lastName: 'Pillai', age: 61, gender: 'male', phone: '88XXXXXXXX', bloodGroup: 'O+', allergies: ['Ciprofloxacin'], conditions: ['Coronary Artery Disease', 'Dyslipidemia'], visitReason: 'Exertional chest tightness', lastVisit: '2026-08-18' },
  { patientId: 'pt-012', name: 'Ritu Chadha', firstName: 'Ritu', lastName: 'Chadha', age: 29, gender: 'female', phone: '87XXXXXXXX', bloodGroup: 'A+', allergies: ['None known'], conditions: ['Allergic Rhinitis'], visitReason: 'Sneezing and nasal congestion', lastVisit: '2026-09-03' },
  { patientId: 'pt-013', name: 'Farhan Ahmed', firstName: 'Farhan', lastName: 'Ahmed', age: 45, gender: 'male', phone: '86XXXXXXXX', bloodGroup: 'B+', allergies: ['None known'], conditions: ['GERD'], visitReason: 'Heartburn and acid regurgitation', lastVisit: '2026-08-29' },
  { patientId: 'pt-014', name: 'Shweta Deshmukh', firstName: 'Shweta', lastName: 'Deshmukh', age: 36, gender: 'female', phone: '85XXXXXXXX', bloodGroup: 'AB+', allergies: ['Erythromycin'], conditions: ['Migraine without aura'], visitReason: 'Throbbing hemicranial headache', lastVisit: '2026-09-04' },
  { patientId: 'pt-015', name: 'Anand Kulkarni', firstName: 'Anand', lastName: 'Kulkarni', age: 50, gender: 'male', phone: '84XXXXXXXX', bloodGroup: 'O+', allergies: ['None known'], conditions: ['Type 2 Diabetes', 'Diabetic Neuropathy'], visitReason: 'Burning tingling sensation in feet', lastVisit: '2026-08-22' }
];

// ============================================================
// CASES
// ============================================================
export interface DemoCase {
  caseId: string;
  patientId: string;
  caseTitle: string;
  status: 'active' | 'completed' | 'intake';
  chiefComplaint: string;
  symptoms: string[];
  duration: string;
  severity: string;
  history: string;
  medications: string[];
  allergies: string[];
  vitals: { bp: string; hr: string; temp: string; spo2: string; rr: string };
  createdAt: string;
  workflowStage: string;
}

export const DEMO_CASES: DemoCase[] = [
  { caseId: 'case-8510', patientId: 'pt-001', caseTitle: 'Headache & Hypertension Evaluation', status: 'completed', chiefComplaint: 'Persistent headache and dizziness for 5 days', symptoms: ['Headache', 'Dizziness', 'Blurred vision', 'Nausea'], duration: '5 days', severity: 'moderate', history: 'Known hypertensive on amlodipine 5mg.', medications: ['Amlodipine 5mg OD', 'Metformin 500mg BD'], allergies: ['Sulfonamides'], vitals: { bp: '158/98 mmHg', hr: '82 bpm', temp: '98.6°F', spo2: '97%', rr: '18/min' }, createdAt: '2026-09-09T09:00:00Z', workflowStage: 'completed' },
  { caseId: 'case-8511', patientId: 'pt-002', caseTitle: 'Respiratory Evaluation — Cough & Dyspnoea', status: 'active', chiefComplaint: 'Productive cough and shortness of breath for 1 week', symptoms: ['Productive cough', 'Shortness of breath', 'Mild wheeze', 'Fatigue'], duration: '7 days', severity: 'mild-moderate', history: 'Known mild asthmatic.', medications: ['Salbutamol inhaler PRN'], allergies: ['None known'], vitals: { bp: '112/74 mmHg', hr: '88 bpm', temp: '99.1°F', spo2: '95%', rr: '22/min' }, createdAt: '2026-09-10T08:30:00Z', workflowStage: 'clinical_history' },
  { caseId: 'case-8512', patientId: 'pt-003', caseTitle: 'GI Evaluation — Abdominal Pain', status: 'active', chiefComplaint: 'Crampy abdominal pain and bloating for 3 days', symptoms: ['Abdominal cramps', 'Bloating', 'Diarrhoea', 'Anorexia'], duration: '3 days', severity: 'mild', history: 'Known IBS.', medications: ['Mebeverine 135mg TDS PRN'], allergies: ['Penicillin'], vitals: { bp: '118/76 mmHg', hr: '76 bpm', temp: '98.4°F', spo2: '99%', rr: '16/min' }, createdAt: '2026-09-08T11:00:00Z', workflowStage: 'medical_records' },
  { caseId: 'case-8513', patientId: 'pt-004', caseTitle: 'Fever & Systemic Symptoms', status: 'active', chiefComplaint: 'High-grade fever with chills and body ache', symptoms: ['Fever 102F', 'Chills', 'Body ache', 'Headache', 'Malaise'], duration: '3 days', severity: 'moderate', history: 'Lives in malaria-endemic area.', medications: ['Paracetamol 650mg TDS PRN'], allergies: ['None known'], vitals: { bp: '108/70 mmHg', hr: '104 bpm', temp: '102.4°F', spo2: '98%', rr: '20/min' }, createdAt: '2026-09-10T07:45:00Z', workflowStage: 'summary' },
  { caseId: 'case-8514', patientId: 'pt-005', caseTitle: 'Musculoskeletal — Lumbar Radiculopathy', status: 'completed', chiefComplaint: 'Lower back pain radiating to left leg (L4-L5)', symptoms: ['Lower back pain', 'Left leg pain', 'Numbness in left foot', 'Difficulty walking'], duration: '2 weeks', severity: 'severe', history: 'Known lumbar disc herniation at L4-L5.', medications: ['Pregabalin 75mg BD', 'Diclofenac gel topical'], allergies: ['NSAIDs (oral)'], vitals: { bp: '126/82 mmHg', hr: '74 bpm', temp: '98.2°F', spo2: '99%', rr: '16/min' }, createdAt: '2026-09-05T10:00:00Z', workflowStage: 'completed' },
  { caseId: 'case-8515', patientId: 'pt-006', caseTitle: 'Joint Pain & Osteoarthritis Check', status: 'completed', chiefComplaint: 'Bilateral knee pain and morning stiffness', symptoms: ['Knee pain', 'Morning stiffness', 'Crepitus', 'Difficulty on stairs'], duration: '3 months', severity: 'moderate', history: 'Known osteoarthritis of knees.', medications: ['Paracetamol 650mg SOS', 'Glucosamine 500mg OD'], allergies: ['Aspirin', 'Codeine'], vitals: { bp: '134/86 mmHg', hr: '72 bpm', temp: '98.4°F', spo2: '98%', rr: '16/min' }, createdAt: '2026-09-04T11:20:00Z', workflowStage: 'completed' },
  { caseId: 'case-8516', patientId: 'pt-007', caseTitle: 'Acute Pharyngitis & URI', status: 'completed', chiefComplaint: 'Sore throat and difficulty swallowing for 2 days', symptoms: ['Sore throat', 'Mild fever', 'Odynophagia', 'Hoarseness'], duration: '2 days', severity: 'mild', history: 'No prior chronic ENT conditions.', medications: ['Warm saline gargles', 'Paracetamol 500mg PRN'], allergies: ['None known'], vitals: { bp: '116/74 mmHg', hr: '80 bpm', temp: '99.4°F', spo2: '99%', rr: '16/min' }, createdAt: '2026-09-08T14:15:00Z', workflowStage: 'completed' },
  { caseId: 'case-8517', patientId: 'pt-008', caseTitle: 'Episodic Migraine Management', status: 'active', chiefComplaint: 'Severe unilateral headache with photophobia', symptoms: ['Unilateral throbbing headache', 'Photophobia', 'Phonophobia', 'Nausea'], duration: '1 day', severity: 'severe', history: 'Known migraineur with episodic attacks.', medications: ['Naproxen 500mg SOS', 'Zolmitriptan 2.5mg PRN'], allergies: ['Latex'], vitals: { bp: '122/78 mmHg', hr: '84 bpm', temp: '98.6°F', spo2: '98%', rr: '18/min' }, createdAt: '2026-09-10T09:10:00Z', workflowStage: 'clinical_history' },
  { caseId: 'case-8518', patientId: 'pt-009', caseTitle: 'Nephrology Renal Function Review', status: 'completed', chiefComplaint: 'Routine review for stage 2 renal impairment', symptoms: ['Mild bilateral ankle edema', 'Fatigue'], duration: '1 month', severity: 'mild', history: 'Known CKD stage 2 with controlled hypertension.', medications: ['Telmisartan 40mg OD', 'Torsemide 10mg OD'], allergies: ['Contrast Dye'], vitals: { bp: '138/88 mmHg', hr: '76 bpm', temp: '98.5°F', spo2: '97%', rr: '16/min' }, createdAt: '2026-08-30T10:00:00Z', workflowStage: 'completed' },
  { caseId: 'case-8519', patientId: 'pt-010', caseTitle: 'Endocrine & Metabolic Workup', status: 'active', chiefComplaint: 'Irregular menstrual cycles and metabolic review', symptoms: ['Oligomenorrhea', 'Weight gain', 'Hirsutism'], duration: '6 months', severity: 'mild', history: 'Known PCOS.', medications: ['Metformin 500mg BD', 'Myo-inositol OD'], allergies: ['None known'], vitals: { bp: '114/72 mmHg', hr: '78 bpm', temp: '98.4°F', spo2: '99%', rr: '16/min' }, createdAt: '2026-09-07T16:00:00Z', workflowStage: 'medical_records' },
  { caseId: 'case-8520', patientId: 'pt-011', caseTitle: 'Cardiovascular Exertional Assessment', status: 'completed', chiefComplaint: 'Exertional chest tightness during brisk walking', symptoms: ['Retrosternal chest tightness', 'Mild dyspnea on exertion'], duration: '2 weeks', severity: 'moderate', history: 'Known CAD, post-PTCA 2023.', medications: ['Aspirin 75mg OD', 'Atorvastatin 40mg OD', 'Metoprolol 25mg OD'], allergies: ['Ciprofloxacin'], vitals: { bp: '128/80 mmHg', hr: '68 bpm', temp: '98.2°F', spo2: '98%', rr: '16/min' }, createdAt: '2026-09-02T11:45:00Z', workflowStage: 'completed' },
  { caseId: 'case-8521', patientId: 'pt-013', caseTitle: 'Gastroenterology GERD Follow-up', status: 'completed', chiefComplaint: 'Acid regurgitation and retrosternal burning', symptoms: ['Heartburn', 'Acid reflux', 'Water brash'], duration: '3 weeks', severity: 'mild-moderate', history: 'Known GERD on PPI maintenance.', medications: ['Pantoprazole 40mg OD before breakfast'], allergies: ['None known'], vitals: { bp: '120/76 mmHg', hr: '74 bpm', temp: '98.6°F', spo2: '99%', rr: '16/min' }, createdAt: '2026-09-06T15:30:00Z', workflowStage: 'completed' }
];

// ============================================================
// 20 SEQUENTIAL CLINICAL INTAKE QUESTIONS (DETERMINISTIC ENGINE)
// ============================================================
export const CLINICAL_INTAKE_QUESTIONS: string[] = [
  // 1. Chief Complaint
  "Hello. I'm MEDiKIOSK. I'll help collect the patient's clinical history. What brings you in today?",
  // 2. Onset
  "When did the discomfort first begin, and did it start suddenly or gradually?",
  // 3. Duration
  "How long has this been going on continuously, or does it come and go in episodes?",
  // 4. Location
  "Where do you feel the discomfort or pain most strongly? Does it spread or radiate anywhere else?",
  // 5. Severity
  "On a scale of 1 to 10, with 10 being the most severe pain, how would you rate your discomfort?",
  // 6. Character
  "How would you describe the sensation — sharp, dull, aching, throbbing, burning, or pressure?",
  // 7. Timing / Frequency
  "Is the symptom constant throughout the day, or does it fluctuate at particular times of the day?",
  // 8. Aggravating Factors
  "Is there anything specific that makes it worse, such as physical exertion, movement, eating, or stress?",
  // 9. Relieving Factors
  "Does anything provide relief, such as resting, lying down, cold/warm application, or drinking fluids?",
  // 10. Associated Symptoms
  "Are you experiencing any associated symptoms like nausea, dizziness, vomiting, or shortness of breath?",
  // 11. Fever
  "Have you noticed any fever, chills, body aches, shivering, or unusual sweating?",
  // 12. Medication Use / Remedies
  "Have you taken any home remedies, paracetamol, or over-the-counter medications for this so far?",
  // 13. Past Medical History
  "Do you have any diagnosed medical conditions such as high blood pressure, diabetes, asthma, or thyroid disease?",
  // 14. Previous Similar Episodes
  "Have you ever experienced a similar illness or episode in the past?",
  // 15. Current Medications
  "What regular prescription medications, daily supplements, or vitamins are you currently taking?",
  // 16. Allergies
  "Do you have any known allergies to medicines (like penicillin or sulfa), foods, or substances?",
  // 17. Family History
  "Is there any relevant family history of heart disease, hypertension, diabetes, stroke, or migraine?",
  // 18. Social History
  "Regarding social history, do you smoke, consume alcohol, or experience high physical or occupational stress?",
  // 19. Relevant Risk Factors
  "Have you recently traveled, had surgery, or experienced any major recent lifestyle changes?",
  // 20. Final Clarification
  "Thank you. Is there any additional detail or specific health concern you would like the doctor to know?"
];

export const CLINICAL_SUGGESTIONS_BY_TURN: Record<number, string[]> = {
  0: ["Severe headache for past few days", "Persistent dry cough & fever", "Abdominal pain & bloating", "Lower back pain radiating down leg"],
  1: ["Started gradually about 5 days ago", "Began suddenly this morning", "Started 2-3 days ago", "Woke up with it"],
  2: ["Constant throughout the day", "Comes and goes in waves", "Worse in the morning", "Lasts several hours at a time"],
  3: ["Forehead and both temples", "Right lower abdomen", "Lower back and left thigh", "Diffuse across chest"],
  4: ["Moderate — around 5 out of 10", "Severe — 7 to 8 out of 10", "Mild — around 3 out of 10", "Very intense — 9 out of 10"],
  5: ["Dull, throbbing ache", "Sharp and stabbing", "Aching heaviness", "Burning sensation"],
  6: ["Constant all day", "Worse in morning hours", "Worse at night or resting", "Intermittent episodes"],
  7: ["Bright light, loud sounds, or screen use", "Physical exertion or walking", "Eating spicy or heavy food", "No specific trigger"],
  8: ["Rest in a dark, quiet room", "Lying flat and resting", "Drinking plenty of water", "Nothing provides clear relief"],
  9: ["Mild nausea and dizziness", "Fatigue and body weakness", "Blurred vision at times", "No other associated symptoms"],
  10: ["No fever noticed", "Mild low-grade fever", "High-grade fever with chills", "Night sweats and feeling warm"],
  11: ["Took Paracetamol with mild temporary relief", "Tried rest and hydration", "Have not taken any medications yet", "Used topical pain relief"],
  12: ["Hypertension (high blood pressure)", "Type 2 Diabetes", "Mild bronchial asthma", "No chronic conditions diagnosed"],
  13: ["First time having this", "Had similar episodes last year", "Occasional episodes managed with rest", "Recurrent problem"],
  14: ["Amlodipine 5mg once daily", "Metformin 500mg twice daily", "None / no regular medications", "Multivitamins and calcium only"],
  15: ["No known drug allergies (NKDA)", "Allergic to Penicillin", "Allergic to Sulfa antibiotics", "Allergic to Aspirin / NSAIDs"],
  16: ["Hypertension in parents", "Diabetes running in family", "Family history of migraines", "No significant family history"],
  17: ["Non-smoker, non-drinker", "Non-smoker, occasional alcohol", "Desk job with moderate work stress", "Regular physical activity"],
  18: ["No recent travel or surgery", "High work stress and reduced sleep", "Recent domestic travel", "No major lifestyle changes"],
  19: ["No other concerns", "Would like doctor consultation today", "Need blood test recommendations", "Everything covered"]
};

export function getAdaptiveClinicalQuestion(turnIndex: number, userText: string): string {
  if (turnIndex >= CLINICAL_INTAKE_QUESTIONS.length) {
    return "Clinical history intake is complete. All your responses have been documented and organized. Please proceed to Medical Records to attach any relevant reports, or view your generated Clinical Summary.";
  }

  const lower = userText.toLowerCase();

  if (turnIndex === 1) {
    let symptom = "discomfort";
    if (lower.includes('headache') || lower.includes('head')) symptom = "headache";
    else if (lower.includes('cough')) symptom = "cough";
    else if (lower.includes('fever')) symptom = "fever";
    else if (lower.includes('chest')) symptom = "chest discomfort";
    else if (lower.includes('stomach') || lower.includes('abdominal') || lower.includes('belly')) symptom = "abdominal pain";
    else if (lower.includes('back')) symptom = "back pain";
    else if (lower.includes('throat')) symptom = "throat discomfort";
    else if (lower.includes('pain')) symptom = "pain";
    return `When did the ${symptom} first begin, and did it start suddenly or gradually?`;
  }

  if (turnIndex === 2) {
    return "How long has this been going on continuously, or does it come and go in episodes?";
  }

  if (turnIndex === 3) {
    return "Where do you feel the pain or discomfort most strongly? Does it spread anywhere else?";
  }

  if (turnIndex === 4) {
    return "On a scale of 1 to 10, with 10 being the most severe pain, how would you rate the severity?";
  }

  return CLINICAL_INTAKE_QUESTIONS[turnIndex];
}

// ============================================================
// CLINICAL EXTRACTION RESULTS (ROTATED ON UPLOAD)
// ============================================================
export const DEMO_EXTRACTION_RESULTS = [
  {
    medications: ['Amlodipine 5mg OD', 'Metformin 500mg BD'],
    allergies: ['Sulfonamides'],
    diagnoses: ['Essential Hypertension', 'Type 2 Diabetes'],
    labValues: [
      'Hemoglobin: 14.2 g/dL (Normal: 13.5 - 17.5 g/dL)',
      'WBC: 7,800 /uL (Normal: 4,500 - 11,000 /uL)',
      'Platelets: 245,000 /uL (Normal: 150,000 - 450,000 /uL)',
      'Fasting Glucose: 94 mg/dL (Normal: 70 - 100 mg/dL)',
      'Serum Creatinine: 0.9 mg/dL (Normal: 0.7 - 1.3 mg/dL)',
      'Blood Pressure: 124/82 mmHg'
    ],
    dates: ['2026-09-08'],
    doctors: ['Dr. Arvind Mehta, MD (Pathology)']
  },
  {
    medications: ['Paracetamol 650mg TDS', 'Oral Rehydration Solution'],
    allergies: ['Penicillin'],
    diagnoses: ['Acute Febrile Illness'],
    labValues: [
      'Hemoglobin: 13.8 g/dL (Normal: 13.5 - 17.5 g/dL)',
      'WBC: 6,400 /uL (Normal: 4,500 - 11,000 /uL)',
      'Platelets: 210,000 /uL (Normal: 150,000 - 450,000 /uL)',
      'Fasting Glucose: 88 mg/dL (Normal: 70 - 100 mg/dL)',
      'Serum Creatinine: 0.8 mg/dL (Normal: 0.7 - 1.3 mg/dL)',
      'Blood Pressure: 118/76 mmHg'
    ],
    dates: ['2026-09-09'],
    doctors: ['Dr. Priya Nair, MD (Internal Medicine)']
  },
  {
    medications: ['Salbutamol Inhaler PRN', 'Budesonide 200mcg BD'],
    allergies: ['None known'],
    diagnoses: ['Mild Bronchial Asthma'],
    labValues: [
      'Hemoglobin: 14.5 g/dL (Normal: 13.5 - 17.5 g/dL)',
      'WBC: 8,100 /uL (Normal: 4,500 - 11,000 /uL)',
      'Platelets: 260,000 /uL (Normal: 150,000 - 450,000 /uL)',
      'Fasting Glucose: 92 mg/dL (Normal: 70 - 100 mg/dL)',
      'Serum Creatinine: 1.0 mg/dL (Normal: 0.7 - 1.3 mg/dL)',
      'Blood Pressure: 120/80 mmHg'
    ],
    dates: ['2026-09-05'],
    doctors: ['Dr. K. Sharma, MD (Pulmonology)']
  }
];

let _extractionIndex = 0;
export const getNextDemoExtraction = () => {
  const result = DEMO_EXTRACTION_RESULTS[_extractionIndex % DEMO_EXTRACTION_RESULTS.length];
  _extractionIndex++;
  return result;
};

// ============================================================
// CONVERSATION MESSAGES PER CASE
// ============================================================
export interface DemoMsg {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  provenance: 'user' | 'ai';
  stage: 'completed';
}

export const DEMO_CONVERSATIONS: Record<string, DemoMsg[]> = {
  'case-8510': [
    { id: 'dm-001-01', role: 'assistant', content: "Hello. I'm MEDiKIOSK. I'll help collect the patient's clinical history. What brings you in today?", timestamp: '2026-09-09T09:01:00Z', provenance: 'ai', stage: 'completed' },
    { id: 'dm-001-02', role: 'user', content: 'I have a bad headache and my head feels heavy for the past 5 days.', timestamp: '2026-09-09T09:02:00Z', provenance: 'user', stage: 'completed' },
    { id: 'dm-001-03', role: 'assistant', content: 'When did the headache first begin, and did it start suddenly or gradually?', timestamp: '2026-09-09T09:02:30Z', provenance: 'ai', stage: 'completed' },
    { id: 'dm-001-04', role: 'user', content: 'It started gradually about five days ago.', timestamp: '2026-09-09T09:03:00Z', provenance: 'user', stage: 'completed' },
    { id: 'dm-001-05', role: 'assistant', content: 'Where do you feel the pain most strongly?', timestamp: '2026-09-09T09:03:30Z', provenance: 'ai', stage: 'completed' }
  ]
};

// ============================================================
// WORKSPACE ACTIVITIES
// ============================================================
export interface DemoActivity {
  id: string;
  type: string;
  title: string;
  description: string;
  timestamp: string;
  caseId?: string;
  status: 'completed' | 'active' | 'pending';
}

export const DEMO_ACTIVITIES: DemoActivity[] = [
  { id: 'act-001', type: 'case_created', title: 'Case Created', description: 'New clinical intake session opened', timestamp: '2026-09-10T07:45:00Z', caseId: 'case-8513', status: 'active' },
  { id: 'act-002', type: 'clinical_history', title: 'Clinical History Completed', description: 'Respiratory evaluation intake completed', timestamp: '2026-09-10T08:45:00Z', caseId: 'case-8511', status: 'completed' },
  { id: 'act-003', type: 'document_uploaded', title: 'Document Processed', description: 'Blood chemistry panel report verified', timestamp: '2026-09-10T08:00:00Z', caseId: 'case-8513', status: 'completed' },
  { id: 'act-004', type: 'summary_generated', title: 'Summary Generated', description: 'Clinical summary compiled', timestamp: '2026-09-09T09:30:00Z', caseId: 'case-8510', status: 'completed' },
  { id: 'act-005', type: 'summary_confirmed', title: 'Summary Confirmed', description: 'Summary confirmed for Lumbar case', timestamp: '2026-09-05T11:00:00Z', caseId: 'case-8514', status: 'completed' },
  { id: 'act-006', type: 'case_created', title: 'Case Created', description: 'Nephrology renal review session opened', timestamp: '2026-08-30T09:45:00Z', caseId: 'case-8518', status: 'completed' },
  { id: 'act-007', type: 'clinical_history', title: 'Clinical History Completed', description: 'Cardiovascular exertional intake documented', timestamp: '2026-09-02T12:00:00Z', caseId: 'case-8520', status: 'completed' },
  { id: 'act-008', type: 'document_uploaded', title: 'Document Processed', description: 'Metabolic lipid and fasting blood profile verified', timestamp: '2026-09-07T16:20:00Z', caseId: 'case-8519', status: 'active' },
  { id: 'act-009', type: 'summary_generated', title: 'Summary Generated', description: 'Clinical summary generated for Acute Pharyngitis', timestamp: '2026-09-08T14:40:00Z', caseId: 'case-8516', status: 'completed' },
  { id: 'act-010', type: 'summary_confirmed', title: 'Summary Confirmed', description: 'Summary locked and confirmed for GERD consultation', timestamp: '2026-09-06T16:00:00Z', caseId: 'case-8521', status: 'completed' }
];
