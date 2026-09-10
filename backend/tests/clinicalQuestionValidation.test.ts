/**
 * MEDiKIOSK Backend — Phase 05: Clinical Question Validation & Adaptive Logic Tests
 * Comprehensive validation across all 26 mandatory scenarios:
 *
 * 1. Valid direct answer to current question -> accepted, recorded, advances
 * 2. Valid negative answer to current question -> accepted, recorded, advances
 * 3. Explicit "No" answer to medications -> recorded as negative finding, advances
 * 4. Explicit "No" answer to allergies -> recorded as negative finding, advances
 * 5. "I don't know" to active question -> recorded as unclear, does not convert to false
 * 6. "Not sure" to active question -> triggers clarification without hallucinated facts
 * 7. "Not applicable" to active question -> handled cleanly, skipped/fulfilled appropriately
 * 8. Partial answer to compound question -> partially_answered, triggers targeted clarification
 * 9. Clarification provided for partial answer -> merged into structured state, advances
 * 10. Multi-fact answer -> extracts all valid facts in single turn
 * 11. Multi-fact answer -> satisfied subsequent questions are NOT asked again (adaptive skipping)
 * 12. Contradictory / changed answer -> updates to latest valid patient statement while preserving history
 * 13. Completely irrelevant answer -> rejected, clarification loop triggered
 * 14. Unrecognized input -> clarification requested
 * 15. Clarification loop safeguard: attempt 1 invalid -> clarification 1
 * 16. Clarification loop safeguard: attempt 2 invalid -> clarification 2
 * 17. Clarification loop safeguard: attempt 3 invalid -> loop broken, recorded as unknown, advances
 * 18. Missing required question prioritized over missing optional question
 * 19. Missing required question: intake not complete
 * 20. All required questions answered: intake marked complete
 * 21. Duplicate question prevented when already answered
 * 22. Negative answers preserved as valid and complete
 * 23. "I don't know" preserved as unclear without converting to false
 * 24. Adaptive next question skips fields already fulfilled by multi-fact answers
 * 25. Dual endpoint /clinical-sessions/:sessionId/messages maintains identical validation logic
 * 26. Security / authorization checks: unauthorized clinician rejected (404/403)
 */

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { app } from '../src/app.js';
import { connectDatabase, disconnectDatabase } from '../src/config/database.js';
import { Case } from '../src/models/case.model.js';
import { Patient } from '../src/models/patient.model.js';
import { Conversation } from '../src/models/conversation.model.js';
import { ClinicalHistory } from '../src/models/clinicalHistory.model.js';
import { ClinicalSession } from '../src/models/session.model.js';
import { Answer } from '../src/models/answer.model.js';
import { geminiService } from '../src/services/gemini.service.js';
import { questionValidationService } from '../src/services/questionValidation.service.js';
import {
  CLINICAL_QUESTION_CATALOG,
  getQuestionById,
  getAdaptiveNextQuestion,
  getMissingRequiredQuestions,
  isQuestionFulfilled,
  isIntakeComplete
} from '../src/utils/clinicalQuestions.js';

describe('Phase 05: Clinical Question Validation + Adaptive Logic', () => {
  let caseId: string;
  let patientId: string;
  let sessionId: string;
  const clinicianUser = 'user-clinician-phase05';
  const unauthorizedUser = 'user-clinician-unauth-phase05';

  const createdCases: string[] = [];

  before(async () => {
    await connectDatabase();

    // Create primary test case
    const caseRes = await request(app)
      .post('/api/v1/cases')
      .set('x-user-id', clinicianUser)
      .send({
        patientData: {
          firstName: 'Rajesh',
          lastName: 'Kulkarni',
          age: 48,
          gender: 'male'
        }
      });

    assert.equal(caseRes.status, 201);
    caseId = caseRes.body.data.caseId;
    patientId = caseRes.body.data.patientId;
    sessionId = caseRes.body.data.sessionId;
    createdCases.push(caseId);
  });

  after(async () => {
    for (const cid of createdCases) {
      await Case.deleteOne({ caseId: cid });
      await Conversation.deleteOne({ caseId: cid });
      await ClinicalHistory.deleteOne({ caseId: cid });
      await ClinicalSession.deleteMany({ caseId: cid });
      await Answer.deleteMany({ caseId: cid });
    }
    if (patientId) {
      await Patient.deleteOne({ patientId });
    }
    await disconnectDatabase();
  });

  // ─── Scenario 1: Valid direct answer ───
  test('1. Valid direct answer to current question -> accepted, recorded, advances', async () => {
    const origMethod = geminiService.generateStructuredJson;
    geminiService.generateStructuredJson = async () => ({
      answerUnderstanding: 'Patient reports severe persistent fever',
      extractedData: {
        chiefComplaint: 'High grade fever with chills'
      },
      targetField: 'q-chief-complaint',
      answerStatus: 'answered',
      needsClarification: false,
      clarificationReason: null,
      suggestedNextQuestion: 'How long have you had this fever?'
    }) as any;

    try {
      const res = await request(app)
        .post(`/api/v1/cases/${caseId}/conversation/messages`)
        .set('x-user-id', clinicianUser)
        .send({
          content: 'I have had a high fever with shivering since yesterday',
          source: 'text'
        });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.answer.answerStatus, 'answered');
      assert.equal(res.body.data.nextAction, 'ASK_QUESTION');
      assert.equal(res.body.data.structuredData.chiefComplaint.text, 'High grade fever with chills');
      assert.ok(res.body.data.completedFields.includes('q-chief-complaint'));
    } finally {
      geminiService.generateStructuredJson = origMethod;
    }
  });

  // ─── Scenario 2: Valid negative answer ───
  test('2. Valid negative answer to current question -> accepted, recorded, advances', async () => {
    const question = getQuestionById('q-past-medical')!;
    const evalResult = questionValidationService.evaluateAnswer(question, 'None, I am completely healthy', {});

    assert.equal(evalResult.isValid, true);
    assert.equal(evalResult.answerStatus, 'answered');
    assert.equal(evalResult.isNegativeAnswer, true);
    assert.equal(evalResult.needsClarification, false);
    assert.ok(evalResult.normalizedFacts.pastMedicalHistory);
    assert.equal(evalResult.normalizedFacts.pastMedicalHistory[0].condition, 'None reported');
  });

  // ─── Scenario 3: Explicit "No" answer to medications ───
  test('3. Explicit "No" answer to medications -> recorded as negative finding, advances', async () => {
    const qMed = getQuestionById('q-medications')!;
    const evalResult = questionValidationService.evaluateAnswer(qMed, 'No medications at all', {});

    assert.equal(evalResult.isValid, true);
    assert.equal(evalResult.answerStatus, 'answered');
    assert.equal(evalResult.isNegativeAnswer, true);
    assert.ok(Array.isArray(evalResult.normalizedFacts.medications));
    assert.equal(evalResult.normalizedFacts.medications[0].name, 'None reported');
    assert.ok(evalResult.satisfiedQuestionIds.includes('q-medications'));
  });

  // ─── Scenario 4: Explicit "No" answer to allergies ───
  test('4. Explicit "No" answer to allergies -> recorded as negative finding, advances', async () => {
    const qAllergy = getQuestionById('q-allergies')!;
    const evalResult = questionValidationService.evaluateAnswer(qAllergy, 'No known allergies', {});

    assert.equal(evalResult.isValid, true);
    assert.equal(evalResult.answerStatus, 'answered');
    assert.equal(evalResult.isNegativeAnswer, true);
    assert.ok(Array.isArray(evalResult.normalizedFacts.allergies));
    assert.equal(evalResult.normalizedFacts.allergies[0].allergen, 'No known allergies');
    assert.ok(evalResult.satisfiedQuestionIds.includes('q-allergies'));
  });

  // ─── Scenario 5: "I don't know" to active question ───
  test('5. "I don\'t know" to active question -> recorded as unclear, does not convert to false', async () => {
    const qSeverity = getQuestionById('q-severity')!;
    const evalResult = questionValidationService.evaluateAnswer(qSeverity, "I don't know", {}, 0);

    assert.equal(evalResult.answerStatus, 'unclear');
    assert.equal(evalResult.needsClarification, true);
    assert.equal(evalResult.isUnclear, true);
    // Crucial rule: must not convert "I don't know" to false or arbitrary value
    assert.equal(evalResult.normalizedFacts.severity, undefined);
  });

  // ─── Scenario 6: "Not sure" to active question ───
  test('6. "Not sure" to active question -> triggers clarification without hallucinated facts', async () => {
    const qDur = getQuestionById('q-duration')!;
    const evalResult = questionValidationService.evaluateAnswer(qDur, 'Not sure really', {}, 0);

    assert.equal(evalResult.answerStatus, 'unclear');
    assert.equal(evalResult.needsClarification, true);
    assert.ok(evalResult.clarificationPrompt);
    assert.deepEqual(evalResult.normalizedFacts, {});
  });

  // ─── Scenario 7: "Not applicable" to active question ───
  test('7. "Not applicable" to active question -> handled cleanly, recorded as not_applicable', async () => {
    const qSurg = getQuestionById('q-past-surgical')!;
    const evalResult = questionValidationService.evaluateAnswer(qSurg, 'Not applicable, never had any', {});

    assert.equal(evalResult.isValid, true);
    assert.equal(evalResult.answerStatus, 'not_applicable');
    assert.equal(evalResult.isNotApplicable, true);
    assert.equal(evalResult.needsClarification, false);
    assert.ok(evalResult.normalizedFacts.pastSurgicalHistory);
    assert.equal(evalResult.normalizedFacts.pastSurgicalHistory[0].procedure, 'None reported');
  });

  // ─── Scenario 8: Partial answer to compound question ───
  test('8. Partial answer to compound question -> partially_answered, triggers targeted clarification', async () => {
    const qHpi = getQuestionById('q-hpi')!;
    const evalResult = questionValidationService.evaluateAnswer(
      qHpi,
      'Started 2 days ago',
      { duration: { value: 2, unit: 'days' } }
    );

    assert.equal(evalResult.answerStatus, 'partially_answered');
    assert.equal(evalResult.isPartial, true);
    assert.equal(evalResult.needsClarification, true);
    assert.ok(evalResult.missingComponents?.includes('narrative progression'));
    assert.ok(evalResult.clarificationPrompt?.includes('progressing'));
  });

  // ─── Scenario 9: Clarification provided for partial answer ───
  test('9. Clarification provided for partial answer -> merged into structured state, advances', async () => {
    const qHpi = getQuestionById('q-hpi')!;
    const fullAnswer = 'It started with a dull ache and has progressively become sharper and throbbing';
    const evalResult = questionValidationService.evaluateAnswer(
      qHpi,
      fullAnswer,
      {
        historyOfPresentIllness: { narrative: fullAnswer }
      }
    );

    assert.equal(evalResult.isValid, true);
    assert.equal(evalResult.answerStatus, 'answered');
    assert.equal(evalResult.needsClarification, false);
    assert.equal(evalResult.normalizedFacts.historyOfPresentIllness?.narrative, fullAnswer);
  });

  // ─── Scenario 10: Multi-fact answer extracts multiple facts in single turn ───
  test('10. Multi-fact answer -> extracts all valid facts in single turn', async () => {
    const qHpi = getQuestionById('q-hpi')!;
    const facts = {
      historyOfPresentIllness: { narrative: 'Pain radiating to neck' },
      duration: { value: 3, unit: 'days' as const },
      severity: 'severe' as const,
      symptoms: [{ name: 'Fever', presence: true }]
    };

    const evalResult = questionValidationService.evaluateAnswer(qHpi, 'Severe pain since 3 days with fever', facts);

    assert.equal(evalResult.isValid, true);
    assert.equal(evalResult.answerStatus, 'answered');
    assert.ok(evalResult.satisfiedQuestionIds.includes('q-hpi'));
    assert.ok(evalResult.satisfiedQuestionIds.includes('q-duration'));
    assert.ok(evalResult.satisfiedQuestionIds.includes('q-severity'));
    assert.ok(evalResult.satisfiedQuestionIds.includes('q-symptoms'));
  });

  // ─── Scenario 11: Multi-fact answer skips satisfied questions adaptively ───
  test('11. Multi-fact answer -> satisfied subsequent questions are NOT asked again (skipped adaptively)', () => {
    const structuredState = {
      chiefComplaint: { text: 'Migraine headache' },
      historyOfPresentIllness: { narrative: 'Throbbing right sided pain' },
      duration: { value: 3, unit: 'days' as const },
      severity: 'moderate' as const,
      symptoms: [{ name: 'Photophobia', presence: true }]
    };

    // With duration, severity, and symptoms already populated by multi-fact extraction:
    const completed = ['q-chief-complaint', 'q-hpi', 'q-duration', 'q-severity', 'q-symptoms'];
    const nextQ = getAdaptiveNextQuestion(structuredState, completed);

    assert.ok(nextQ);
    // It should adaptively skip duration, severity, symptoms and jump to past medical history
    assert.equal(nextQ.questionId, 'q-past-medical');
    assert.equal(nextQ.section, 'past_medical_history');
  });

  // ─── Scenario 12: Contradictory / changed answer ───
  test('12. Contradictory / changed answer -> updates to latest valid patient statement while preserving history', async () => {
    const origMethod = geminiService.generateStructuredJson;
    // Patient updates chief complaint from fever to abdominal pain
    geminiService.generateStructuredJson = async () => ({
      answerUnderstanding: 'Patient clarifies actual primary complaint is acute stomach pain, not fever',
      extractedData: {
        chiefComplaint: 'Acute abdominal cramping'
      },
      targetField: 'q-chief-complaint',
      answerStatus: 'answered',
      needsClarification: false,
      clarificationReason: null,
      suggestedNextQuestion: 'How long have you had this abdominal pain?'
    }) as any;

    try {
      const res = await request(app)
        .post(`/api/v1/cases/${caseId}/conversation/messages`)
        .set('x-user-id', clinicianUser)
        .send({
          content: 'Actually doctor, my main issue is severe acute stomach pain, fever is secondary',
          source: 'text'
        });

      assert.equal(res.status, 200);
      assert.equal(res.body.data.structuredData.chiefComplaint.text, 'Acute abdominal cramping');

      // Conversation must preserve the message history
      const conv = await Conversation.findOne({ caseId });
      assert.ok(conv && conv.messages.length >= 4);
    } finally {
      geminiService.generateStructuredJson = origMethod;
    }
  });

  // ─── Scenario 13: Completely irrelevant answer ───
  test('13. Completely irrelevant answer -> rejected, clarification loop triggered', async () => {
    const qSeverity = getQuestionById('q-severity')!;
    const evalResult = questionValidationService.evaluateAnswer(
      qSeverity,
      'I like watching cricket matches on weekends',
      {}
    );

    assert.equal(evalResult.isValid, false);
    assert.equal(evalResult.answerStatus, 'needs_clarification');
    assert.equal(evalResult.needsClarification, true);
    assert.ok(/mild.*moderate.*severe/i.test(evalResult.clarificationPrompt || ''));
  });

  // ─── Scenario 14: Unrecognized input ───
  test('14. Unrecognized input -> clarification requested', async () => {
    const qYesNo = {
      questionId: 'q-test-yn',
      section: 'symptoms' as any,
      field: 'symptoms',
      text: 'Do you have cough?',
      responseType: 'yes_no' as any,
      order: 1,
      required: true,
      active: true,
      maxClarificationAttempts: 2
    };

    const evalResult = questionValidationService.evaluateAnswer(qYesNo, 'blue banana 123', {});
    assert.equal(evalResult.isValid, false);
    assert.equal(evalResult.answerStatus, 'needs_clarification');
    assert.equal(evalResult.needsClarification, true);
  });

  // ─── Scenarios 15, 16, 17: Clarification loop safeguard ───
  test('15. Clarification loop safeguard: attempt 1 invalid -> clarification 1', () => {
    const qSeverity = getQuestionById('q-severity')!;
    const evalResult = questionValidationService.evaluateAnswer(qSeverity, 'completely random', {}, 0);

    assert.equal(evalResult.answerStatus, 'needs_clarification');
    assert.equal(evalResult.needsClarification, true);
    assert.equal(evalResult.isBreakLoopSafeguard, undefined);
  });

  test('16. Clarification loop safeguard: attempt 2 invalid -> clarification 2', () => {
    const qSeverity = getQuestionById('q-severity')!;
    const evalResult = questionValidationService.evaluateAnswer(qSeverity, 'still nonsense', {}, 1);

    assert.equal(evalResult.answerStatus, 'needs_clarification');
    assert.equal(evalResult.needsClarification, true);
    assert.equal(evalResult.isBreakLoopSafeguard, undefined);
  });

  test('17. Clarification loop safeguard: attempt 3 invalid -> loop broken, recorded as unknown, advances', () => {
    const qSeverity = getQuestionById('q-severity')!;
    // Patient has failed twice (currentClarificationAttempts = 2), 3rd attempt triggers safeguard
    const evalResult = questionValidationService.evaluateAnswer(qSeverity, 'another invalid gibberish', {}, 2);

    assert.equal(evalResult.answerStatus, 'unclear');
    assert.equal(evalResult.isValid, true);
    assert.equal(evalResult.needsClarification, false);
    assert.equal(evalResult.isBreakLoopSafeguard, true);
    assert.equal(evalResult.normalizedFacts.severity, 'unknown');
    assert.ok(evalResult.satisfiedQuestionIds.includes('q-severity'));
  });

  // ─── Scenario 18: Missing required question prioritized over missing optional question ───
  test('18. Missing required question prioritized over missing optional question', () => {
    // Required fields: chiefComplaint, historyOfPresentIllness, duration, severity, symptoms, pastMedicalHistory, medications, allergies
    // Optional fields: pastSurgicalHistory, familyHistory, socialHistory, reviewOfSystems, ayushHistory
    const stateWithMissingRequired = {
      chiefComplaint: { text: 'Back pain' },
      historyOfPresentIllness: { narrative: 'Lumbar strain' }
      // Missing required: duration (q-duration)
      // Also missing optional: socialHistory, reviewOfSystems
    };

    const nextQ = getAdaptiveNextQuestion(stateWithMissingRequired, ['q-chief-complaint', 'q-hpi']);
    assert.ok(nextQ);
    assert.equal(nextQ.questionId, 'q-duration');
    assert.equal(nextQ.required, true);
  });

  // ─── Scenario 19: Missing required question: intake not complete ───
  test('19. Missing required question: intake not complete', () => {
    const state = {
      chiefComplaint: { text: 'Knee sprain' },
      historyOfPresentIllness: { narrative: 'Twisted knee playing football' },
      duration: { value: 1, unit: 'days' as const },
      severity: 'moderate' as const,
      symptoms: [{ name: 'Swelling', presence: true }]
      // Missing pastMedicalHistory, medications, allergies
    };

    const completed = ['q-chief-complaint', 'q-hpi', 'q-duration', 'q-severity', 'q-symptoms'];
    const isDone = isIntakeComplete(completed, state);
    assert.equal(isDone, false);

    const missing = getMissingRequiredQuestions(state, completed);
    assert.ok(missing.length > 0);
    assert.ok(missing.some((q) => q.questionId === 'q-past-medical'));
    assert.ok(missing.some((q) => q.questionId === 'q-medications'));
    assert.ok(missing.some((q) => q.questionId === 'q-allergies'));
  });

  // ─── Scenario 20: All required questions answered: intake marked complete ───
  test('20. All required questions answered: intake marked complete', () => {
    const fullState = {
      chiefComplaint: { text: 'Cough and cold' },
      historyOfPresentIllness: { narrative: 'Dry cough with nasal congestion' },
      duration: { value: 5, unit: 'days' as const },
      severity: 'mild' as const,
      symptoms: [{ name: 'Cough', presence: true }, { name: 'Congestion', presence: true }],
      pastMedicalHistory: [{ condition: 'None reported', status: 'resolved' as const }],
      medications: [{ name: 'None reported' }],
      allergies: [{ allergen: 'No known allergies' }]
    };

    const allCompleted = [
      'q-chief-complaint',
      'q-hpi',
      'q-duration',
      'q-severity',
      'q-symptoms',
      'q-past-medical',
      'q-medications',
      'q-allergies'
    ];

    const isDone = isIntakeComplete(allCompleted, fullState);
    assert.equal(isDone, true);

    const missing = getMissingRequiredQuestions(fullState, allCompleted);
    assert.equal(missing.length, 0);
  });

  // ─── Scenario 21: Duplicate question prevented when already answered ───
  test('21. Duplicate question prevented when already answered', () => {
    const state = {
      chiefComplaint: { text: 'Headache' },
      historyOfPresentIllness: { narrative: 'Frontal headache' },
      duration: { value: 2, unit: 'days' as const }
    };

    const completed = ['q-chief-complaint', 'q-hpi', 'q-duration'];
    const nextQ = getAdaptiveNextQuestion(state, completed);

    assert.ok(nextQ);
    assert.notEqual(nextQ.questionId, 'q-chief-complaint');
    assert.notEqual(nextQ.questionId, 'q-hpi');
    assert.notEqual(nextQ.questionId, 'q-duration');
    assert.equal(nextQ.questionId, 'q-severity');
  });

  // ─── Scenario 22: Negative answers preserved as valid and complete ───
  test('22. Negative answers preserved as valid and complete', () => {
    const qSym = getQuestionById('q-symptoms')!;
    const evalResult = questionValidationService.evaluateAnswer(qSym, 'No other symptoms, nothing else', {});

    assert.equal(evalResult.isValid, true);
    assert.equal(evalResult.answerStatus, 'answered');
    assert.equal(evalResult.isNegativeAnswer, true);
    assert.ok(evalResult.normalizedFacts.symptoms);
    assert.equal(evalResult.normalizedFacts.symptoms[0].name, 'None reported');
    assert.equal(evalResult.normalizedFacts.symptoms[0].presence, false);
  });

  // ─── Scenario 23: "I don't know" preserved as unclear without converting to false ───
  test('23. "I don\'t know" preserved as unclear without converting to false', () => {
    const qDur = getQuestionById('q-duration')!;
    const evalResult = questionValidationService.evaluateAnswer(qDur, 'I really do not know the exact days', {}, 0);

    assert.equal(evalResult.answerStatus, 'unclear');
    assert.equal(evalResult.isUnclear, true);
    assert.equal(evalResult.needsClarification, true);
    assert.equal(evalResult.normalizedFacts.duration, undefined);
  });

  // ─── Scenario 24: Adaptive next question skips fields already fulfilled by multi-fact answers ───
  test('24. Adaptive next question skips fields already fulfilled by multi-fact answers', () => {
    const state = {
      chiefComplaint: { text: 'Chest tightness' },
      historyOfPresentIllness: { narrative: 'Tightness after stair climbing' },
      duration: { value: 1, unit: 'hours' as const },
      severity: 'moderate' as const,
      symptoms: [{ name: 'Dyspnea', presence: true }]
    };

    // Even if completedQuestions list only recorded q-chief-complaint and q-hpi:
    const nextQ = getAdaptiveNextQuestion(state, ['q-chief-complaint', 'q-hpi']);

    // duration, severity, symptoms were fulfilled in state, so nextQ must skip them!
    assert.ok(nextQ);
    assert.equal(nextQ.questionId, 'q-past-medical');
  });

  // ─── Scenario 25: Dual endpoint maintaining identical validation logic ───
  test('25. Dual endpoint POST /clinical-sessions/:sessionId/messages maintains identical validation logic', async () => {
    const origMethod = geminiService.generateStructuredJson;
    // Create dedicated case & session for clean endpoint validation
    const newCaseRes = await request(app)
      .post('/api/v1/cases')
      .set('x-user-id', clinicianUser)
      .send({
        patientData: {
          firstName: 'Session',
          lastName: 'User',
          age: 36,
          gender: 'female'
        }
      });
    const dualSessionId = newCaseRes.body.data.sessionId;
    createdCases.push(newCaseRes.body.data.caseId);

    geminiService.generateStructuredJson = async () => ({
      answerUnderstanding: 'Patient reports severe persistent migraine',
      extractedData: {
        chiefComplaint: 'Severe throbbing migraine'
      },
      targetField: 'q-chief-complaint',
      answerStatus: 'answered',
      needsClarification: false,
      clarificationReason: null,
      suggestedNextQuestion: 'How long have you had this migraine?'
    }) as any;

    try {
      const res = await request(app)
        .post(`/api/v1/clinical-sessions/${dualSessionId}/messages`)
        .set('x-user-id', clinicianUser)
        .send({
          content: 'I have a terrible throbbing migraine since yesterday',
          source: 'text'
        });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.answer.answerStatus, 'answered');
      assert.ok(res.body.data.completedFields.includes('q-chief-complaint'));
      assert.equal(res.body.data.nextAction, 'ASK_QUESTION');
    } finally {
      geminiService.generateStructuredJson = origMethod;
    }
  });

  // ─── Scenario 26: Security / authorization checks ───
  test('26. Security / authorization checks: unauthorized clinician rejected (404 isolation)', async () => {
    const res = await request(app)
      .post(`/api/v1/cases/${caseId}/conversation/messages`)
      .set('x-user-id', unauthorizedUser)
      .send({
        content: 'I have fever',
        source: 'text'
      });

    assert.equal(res.status, 404);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'CASE_NOT_FOUND');
  });
});
