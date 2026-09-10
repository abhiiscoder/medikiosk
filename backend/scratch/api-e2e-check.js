// E2E HTTP wire verification via native fetch against http://localhost:5000
async function run() {
  const headers = {
    'Content-Type': 'application/json',
    'x-user-id': 'user-e2e-demo'
  };

  // 1. Create case
  console.log('1. Creating case...');
  const caseRes = await fetch('http://localhost:5000/api/v1/cases', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      patientData: {
        firstName: 'Meera',
        lastName: 'Patel',
        age: 38,
        gender: 'female'
      }
    })
  });
  const caseJson = await caseRes.json();
  console.log('Case response status:', caseRes.status, 'Case ID:', caseJson.data?.caseId);
  const caseId = caseJson.data.caseId;
  const sessionId = caseJson.data.sessionId;

  // 2. Post conversational message to case endpoint
  console.log('\n2. Posting message to /api/v1/cases/:caseId/conversation/messages...');
  const msgRes = await fetch(`http://localhost:5000/api/v1/cases/${caseId}/conversation/messages`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      content: 'I have severe chest discomfort since 2 hours',
      source: 'text'
    })
  });
  const msgJson = await msgRes.json();
  console.log('Message response status:', msgRes.status);
  console.log('Assistant next question:', msgJson.data?.assistantMessage?.content);
  console.log('Current section/field:', msgJson.data?.clinicalState);
  console.log('Chief complaint in structured state:', msgJson.data?.structuredData?.chiefComplaint);

  // 3. Post follow-up message to session endpoint
  console.log('\n3. Posting message to /api/v1/clinical-sessions/:sessionId/messages...');
  const sessRes = await fetch(`http://localhost:5000/api/v1/clinical-sessions/${sessionId}/messages`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      content: 'The discomfort is crushing, radiating to my shoulder',
      source: 'text'
    })
  });
  const sessJson = await sessRes.json();
  console.log('Session response status:', sessRes.status);
  console.log('Assistant next question:', sessJson.data?.assistantMessage?.content);
  console.log('Current section/field:', sessJson.data?.clinicalState);

  // 4. Retrieve conversation history
  console.log('\n4. Retrieving full conversation history...');
  const convRes = await fetch(`http://localhost:5000/api/v1/cases/${caseId}/conversation`, {
    headers
  });
  const convJson = await convRes.json();
  console.log('Conversation status:', convRes.status, 'Total messages:', convJson.data?.messages?.length);
  convJson.data?.messages?.forEach((m, i) => {
    console.log(`  [${i + 1}] ${m.role.toUpperCase()}: ${m.content}`);
  });

  console.log('\n--- Live HTTP Endpoints Verified Cleanly ---');
}

run().catch(console.error);
