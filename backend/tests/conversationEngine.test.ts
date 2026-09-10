/**
 * MEDiKIOSK Backend — Phase 04: LLM Clinical Conversation Engine Tests
 * Validates:
 * 1. Initial conversation initialization (Chief Complaint)
 * 2. Simple patient answer extraction & assistant progression
 * 3. Multi-fact patient answer extraction & state update
 * 4. Ambiguous answer handling & clarification prompt
 * 5. Explicit negative findings capture
 * 6. Fallback on Gemini malformed output
 * 7. Fallback on Gemini API error/unavailability
 * 8. Ownership isolation / Unauthorized access rejection
 * 9. Missing case/session 404 handling
 * 10. Session-based dual endpoint POST /clinical-sessions/:sessionId/messages
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

describe('Phase 04: LLM Clinical Conversation Engine', () => {
  let caseId: string;
  let patientId: string;
  let sessionId: string;
  const clinicianUser = 'user-clinician-phase04';
  const unauthorizedUser = 'user-clinician-unauthorized';

  before(async () => {
    await connectDatabase();

    // Create a clinical case
    const caseRes = await request(app)
      .post('/api/v1/cases')
      .set('x-user-id', clinicianUser)
      .send({
        patientData: {
          firstName: 'Ananya',
          lastName: 'Sharma',
          age: 34,
          gender: 'female'
        }
      });

    assert.equal(caseRes.status, 201);
    caseId = caseRes.body.data.caseId;
    patientId = caseRes.body.data.patientId;
    sessionId = caseRes.body.data.sessionId;
  });

  after(async () => {
    if (caseId) {
      await Case.deleteOne({ caseId });
      await Patient.deleteOne({ patientId });
      await Conversation.deleteOne({ caseId });
      await ClinicalHistory.deleteOne({ caseId });
      await ClinicalSession.deleteOne({ sessionId });
      await Answer.deleteMany({ caseId });
    }
    await disconnectDatabase();
  });

  // 1. Initial question retrieval
  test('1. Initial clinical anamnesis catalog starts with Chief Complaint & unstarted conversation', async () => {
    const qRes = await request(app)
      .get('/api/v1/clinical-history/questions')
      .set('x-user-id', clinicianUser);

    assert.equal(qRes.status, 200);
    assert.equal(qRes.body.success, true);
    assert.ok(Array.isArray(qRes.body.data));
    assert.equal(qRes.body.data.length, 13);
    assert.equal(qRes.body.data[0].questionId, 'q-chief-complaint');
    assert.equal(qRes.body.data[0].section, 'chief_complaint');

    // Before messaging, conversation is not yet initialized
    const convRes = await request(app)
      .get(`/api/v1/cases/${caseId}/conversation`)
      .set('x-user-id', clinicianUser);

    assert.equal(convRes.status, 404);
    assert.equal(convRes.body.error.code, 'CONVERSATION_NOT_FOUND');
  });

  // 2. Simple patient answer
  test('2. POST /cases/:caseId/conversation/messages processes simple answer and advances state', async () => {
    const origMethod = geminiService.generateStructuredJson;
    // Mock deterministic AI extraction
    geminiService.generateStructuredJson = async () => ({
      answerUnderstanding: 'Patient reports severe throbbing headache since morning',
      extractedData: {
        chiefComplaint: 'Throbbing headache',
        duration: 'since morning'
      },
      targetField: 'q-chief-complaint',
      answerStatus: 'answered',
      needsClarification: false,
      clarificationReason: null,
      suggestedNextQuestion: 'Could you describe the onset and severity of your headache?'
    }) as any;

    try {
      const res = await request(app)
        .post(`/api/v1/cases/${caseId}/conversation/messages`)
        .set('x-user-id', clinicianUser)
        .send({
          content: 'I have a severe throbbing headache since morning',
          source: 'text'
        });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(res.body.data.assistantMessage);
      assert.equal(res.body.data.assistantMessage.role, 'assistant');
      assert.ok(res.body.data.assistantMessage.content.length > 0);
      assert.equal(res.body.data.clinicalState.status, 'in_progress');
      assert.equal(res.body.data.structuredData.chiefComplaint.text, 'Throbbing headache');

      // Verify conversation has 3 messages now: initial assistant, user, next assistant
      const conv = await Conversation.findOne({ caseId });
      assert.ok(conv);
      assert.equal(conv.messages.length, 3);
      assert.equal(conv.messages[1].role, 'user');
      assert.equal(conv.messages[1].content, 'I have a severe throbbing headache since morning');
      assert.equal(conv.messages[2].role, 'assistant');

      // Verify raw answer document is persisted
      const ans = await Answer.findOne({ caseId, questionId: 'q-chief-complaint' });
      assert.ok(ans);
      assert.equal(ans.value, 'I have a severe throbbing headache since morning');
    } finally {
      geminiService.generateStructuredJson = origMethod;
    }
  });

  // 3. Multi-fact patient answer
  test('3. Multi-fact patient answer extracts multiple fields non-destructively', async () => {
    const origMethod = geminiService.generateStructuredJson;
    geminiService.generateStructuredJson = async () => ({
      answerUnderstanding: 'Patient describes acute onset sharp pain with radiation and nausea',
      extractedData: {
        hpi: 'Sharp chest pain radiating to left arm accompanied by nausea',
        severity: 'severe',
        symptoms: ['Chest pain', 'Left arm radiation', 'Nausea']
      },
      targetField: 'q-hpi',
      answerStatus: 'answered',
      needsClarification: false,
      clarificationReason: null,
      suggestedNextQuestion: 'How long have you experienced this chest pain?'
    }) as any;

    try {
      const res = await request(app)
        .post(`/api/v1/cases/${caseId}/conversation/messages`)
        .set('x-user-id', clinicianUser)
        .send({
          content: 'The pain is sharp in my chest, radiating to my left arm, very severe, and I feel nauseous',
          source: 'text'
        });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      // Prior chiefComplaint must NOT be overwritten
      assert.equal(res.body.data.structuredData.chiefComplaint.text, 'Throbbing headache');
      // New fields applied
      assert.equal(res.body.data.structuredData.severity, 'severe');
      assert.ok(Array.isArray(res.body.data.structuredData.symptoms));
      assert.ok(res.body.data.structuredData.symptoms.some((s: any) => s.name === 'Nausea'));
    } finally {
      geminiService.generateStructuredJson = origMethod;
    }
  });

  // 4. Ambiguous answer triggers clarification without hallucinated facts
  test('4. Ambiguous answer triggers clarification and stays on active section', async () => {
    const origMethod = geminiService.generateStructuredJson;
    geminiService.generateStructuredJson = async () => ({
      answerUnderstanding: 'Patient provided vague statement with no specific clinical findings',
      extractedData: {},
      targetField: 'q-duration',
      answerStatus: 'needs_clarification',
      needsClarification: true,
      clarificationReason: 'Patient did not specify duration or onset',
      suggestedNextQuestion: 'Could you tell me approximately how many days or hours ago this started?'
    }) as any;

    try {
      const histBefore = await ClinicalHistory.findOne({ caseId });
      const currentQBefore = histBefore?.currentQuestionId;

      const res = await request(app)
        .post(`/api/v1/cases/${caseId}/conversation/messages`)
        .set('x-user-id', clinicianUser)
        .send({
          content: 'I do not know, it just feels weird sometime',
          source: 'text'
        });

      assert.equal(res.status, 200);
      assert.equal(res.body.data.needsClarification, true);
      assert.match(res.body.data.assistantMessage.content, /how many days or hours/i);

      // Section/field should remain on current target, not advance
      const histAfter = await ClinicalHistory.findOne({ caseId });
      assert.equal(histAfter?.currentQuestionId, currentQBefore);
    } finally {
      geminiService.generateStructuredJson = origMethod;
    }
  });

  // 5. Explicit negative findings capture
  test('5. Explicit negative answer is preserved in structured clinical findings', async () => {
    const origMethod = geminiService.generateStructuredJson;
    geminiService.generateStructuredJson = async () => ({
      answerUnderstanding: 'Patient explicitly denies chronic illnesses',
      extractedData: {
        pastMedicalHistory: ['No known chronic illnesses', 'No hypertension', 'No diabetes']
      },
      targetField: 'q-past-medical',
      answerStatus: 'answered',
      needsClarification: false,
      clarificationReason: null,
      suggestedNextQuestion: 'Do you take any daily medications?'
    }) as any;

    try {
      const res = await request(app)
        .post(`/api/v1/cases/${caseId}/conversation/messages`)
        .set('x-user-id', clinicianUser)
        .send({
          content: 'No chronic illnesses, no hypertension, no diabetes at all',
          source: 'text'
        });

      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.body.data.structuredData.pastMedicalHistory));
      assert.ok(
        res.body.data.structuredData.pastMedicalHistory.some((item: any) =>
          item.condition.toLowerCase().includes('no diabetes')
        )
      );
    } finally {
      geminiService.generateStructuredJson = origMethod;
    }
  });

  // 6. Gemini malformed output error handling (Phase R2 requirement 7)
  test('6. Return 502 retryable error when Gemini returns invalid JSON structure without hallucinating fake response', async () => {
    const origMethod = geminiService.generateStructuredJson;
    // Return completely unexpected object missing required schema properties
    geminiService.generateStructuredJson = async () => ({
      randomKey: 'unexpected value',
      answerStatus: 'INVALID_ENUM_VALUE'
    }) as any;

    try {
      const res = await request(app)
        .post(`/api/v1/cases/${caseId}/conversation/messages`)
        .set('x-user-id', clinicianUser)
        .send({
          content: 'No allergies to penicillin or sulfur',
          source: 'text'
        });

      assert.equal(res.status, 502);
      assert.equal(res.body.success, false);
      assert.equal(res.body.error.code, 'GEMINI_MALFORMED_OUTPUT');
      assert.match(res.body.error.message, /malformed response/i);
    } finally {
      geminiService.generateStructuredJson = origMethod;
    }
  });

  // 7. Gemini API unavailable / exception handling (Phase R2 requirement 7)
  test('7. Return 503 retryable error when Gemini throws transient 503 or network error without fake responses', async () => {
    const origMethod = geminiService.generateStructuredJson;
    // Simulate Gemini API outage
    geminiService.generateStructuredJson = async () => {
      throw new Error('Gemini API Service Unavailable (503)');
    };

    try {
      const res = await request(app)
        .post(`/api/v1/cases/${caseId}/conversation/messages`)
        .set('x-user-id', clinicianUser)
        .send({
          content: 'Father had heart disease at age 60',
          source: 'text'
        });

      assert.equal(res.status, 503);
      assert.equal(res.body.success, false);
      assert.equal(res.body.error.code, 'GEMINI_SERVICE_ERROR');
      assert.match(res.body.error.message, /Clinical AI service encountered an error/i);
    } finally {
      geminiService.generateStructuredJson = origMethod;
    }
  });

  // 8. Ownership isolation
  test('8. POST /conversation/messages rejects requests from unauthorized clinician', async () => {
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

  // 9. Missing case and missing session return 404
  test('9. Missing case returns 404', async () => {
    const res = await request(app)
      .post('/api/v1/cases/case-nonexistent-9999/conversation/messages')
      .set('x-user-id', clinicianUser)
      .send({
        content: 'Fever for 3 days',
        source: 'text'
      });

    assert.equal(res.status, 404);
    assert.equal(res.body.error.code, 'CASE_NOT_FOUND');
  });

  test('9b. Missing session returns 404 on session message endpoint', async () => {
    const res = await request(app)
      .post('/api/v1/clinical-sessions/sess-nonexistent-8888/messages')
      .set('x-user-id', clinicianUser)
      .send({
        content: 'Fever for 3 days',
        source: 'text'
      });

    assert.equal(res.status, 404);
    assert.equal(res.body.error.code, 'SESSION_NOT_FOUND');
  });

  // 10. Session-based dual endpoint POST /clinical-sessions/:sessionId/messages
  test('10. Dual endpoint POST /clinical-sessions/:sessionId/messages works identically', async () => {
    const origMethod = geminiService.generateStructuredJson;
    geminiService.generateStructuredJson = async () => ({
      answerUnderstanding: 'Patient reports no tobacco or alcohol use',
      extractedData: {
        socialHistory: {
          tobacco: 'None',
          alcohol: 'None'
        }
      },
      targetField: 'q-social',
      answerStatus: 'answered',
      needsClarification: false,
      clarificationReason: null,
      suggestedNextQuestion: 'Do you have any difficulties with breathing or digestion?'
    }) as any;

    try {
      const res = await request(app)
        .post(`/api/v1/clinical-sessions/${sessionId}/messages`)
        .set('x-user-id', clinicianUser)
        .send({
          content: 'I do not smoke and I do not drink alcohol',
          source: 'text'
        });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(res.body.data.assistantMessage);
      assert.equal(res.body.data.structuredData.socialHistory.smoking, 'None');
    } finally {
      geminiService.generateStructuredJson = origMethod;
    }
  });
});
