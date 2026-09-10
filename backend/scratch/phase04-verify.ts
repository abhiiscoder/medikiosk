/**
 * Phase 04 Live Gemini Conversation Engine Verification
 * Executes synthetic multi-turn anamnesis dialogue using real Gemini API.
 * Uses completely synthetic, non-identifying health inputs.
 */

import { connectDatabase, disconnectDatabase } from '../src/config/database.js';
import { clinicalConversationService } from '../src/services/clinicalConversation.service.js';
import { Case } from '../src/models/case.model.js';
import { Patient } from '../src/models/patient.model.js';
import { Conversation } from '../src/models/conversation.model.js';
import { ClinicalHistory } from '../src/models/clinicalHistory.model.js';
import { Answer } from '../src/models/answer.model.js';
import { generatePatientId, generateCaseId, generateSessionId, generateMrn } from '../src/utils/idGenerator.js';

async function runVerification() {
  console.log('--- Phase 04 Live LLM Conversation Engine Verification ---');
  await connectDatabase();

  const testUserId = 'user-verifier-phase04';
  const patientId = generatePatientId();
  const caseId = generateCaseId();
  const sessionId = generateSessionId();

  try {
    // 1. Create Patient & Case
    await Patient.create({
      patientId,
      mrn: generateMrn(),
      ownerId: testUserId,
      firstName: 'Synthetic',
      lastName: 'Patient',
      age: 29,
      gender: 'other'
    });

    await Case.create({
      caseId,
      patientId,
      ownerId: testUserId,
      status: 'active',
      priority: 'routine'
    });

    console.log(`Created test case: ${caseId}`);

    // Turn 1: Chief Complaint & Duration
    console.log('\n[Turn 1] Sending: "I have had a throbbing pain in my forehead since yesterday morning, feeling dizzy"');
    const turn1 = await clinicalConversationService.sendMessage(testUserId, caseId, {
      content: 'I have had a throbbing pain in my forehead since yesterday morning, feeling dizzy',
      source: 'text'
    });

    console.log('Turn 1 Response:');
    console.log(' - Assistant Question:', turn1.assistantMessage.content);
    console.log(' - Next Section/Field:', turn1.clinicalState.currentSection, '/', turn1.clinicalState.currentField);
    console.log(' - Extracted Data:', JSON.stringify(turn1.extractedData, null, 2));
    console.log(' - Chief Complaint in State:', turn1.structuredData?.chiefComplaint);

    // Turn 2: Severity & Description
    console.log('\n[Turn 2] Sending: "It is moderate pain, about 6 out of 10, feels dull and aching"');
    const turn2 = await clinicalConversationService.sendMessage(testUserId, caseId, {
      content: 'It is moderate pain, about 6 out of 10, feels dull and aching',
      source: 'text'
    });

    console.log('Turn 2 Response:');
    console.log(' - Assistant Question:', turn2.assistantMessage.content);
    console.log(' - Next Section/Field:', turn2.clinicalState.currentSection, '/', turn2.clinicalState.currentField);
    console.log(' - Severity in State:', turn2.structuredData?.severity);
    console.log(' - Chief Complaint Preserved:', turn2.structuredData?.chiefComplaint?.text);

    // Turn 3: Explicit Negatives
    console.log('\n[Turn 3] Sending: "No history of diabetes or high blood pressure, no surgeries, no current medications"');
    const turn3 = await clinicalConversationService.sendMessage(testUserId, caseId, {
      content: 'No history of diabetes or high blood pressure, no surgeries, no current medications',
      source: 'text'
    });

    console.log('Turn 3 Response:');
    console.log(' - Assistant Question:', turn3.assistantMessage.content);
    console.log(' - PMH in State:', JSON.stringify(turn3.structuredData?.pastMedicalHistory, null, 2));
    console.log(' - Meds in State:', JSON.stringify(turn3.structuredData?.medications, null, 2));
    console.log(' - Surgical in State:', JSON.stringify(turn3.structuredData?.pastSurgicalHistory, null, 2));

    // Verify conversation document
    const conv = await Conversation.findOne({ caseId });
    console.log(`\nConversation document total messages: ${conv?.messages.length}`);
    conv?.messages.forEach((m, idx) => {
      console.log(` [${idx + 1}] [${m.role.toUpperCase()}] ${m.content.slice(0, 80)}...`);
    });

    console.log('\nLive Conversation Engine Verification COMPLETED SUCCESSFULLY!');
  } finally {
    // Cleanup
    await Case.deleteOne({ caseId });
    await Patient.deleteOne({ patientId });
    await Conversation.deleteOne({ caseId });
    await ClinicalHistory.deleteOne({ caseId });
    await Answer.deleteMany({ caseId });
    await disconnectDatabase();
  }
}

runVerification().catch((err) => {
  console.error('Verification failed:', err);
  process.exit(1);
});
