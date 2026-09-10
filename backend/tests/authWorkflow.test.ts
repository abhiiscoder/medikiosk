/**
 * MEDiKIOSK Backend — Phase R3: Live Authentication & User Isolation Tests
 *
 * Full verification suite covering Phase R3 requirements:
 * 1. User registration & MongoDB persistence
 * 2. Secure scrypt password hashing (never plaintext)
 * 3. HMAC-SHA256 JWT generation and validation
 * 4. Authentication with MEDiKIOSK ID & password
 * 5. ID recovery by registered mobile number
 * 6. Bearer token session middleware & 401 unauthorized rejection
 * 7. Multi-tenant user isolation (User A cannot access or mutate User B's cases)
 */

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { app } from '../src/app.js';
import { connectDatabase, disconnectDatabase } from '../src/config/database.js';
import { User } from '../src/models/user.model.js';
import { Case } from '../src/models/case.model.js';

describe('Phase R3: Live Authentication & User Isolation Verification', () => {
  let userAToken: string;
  let userAId: string;
  let userAMedikioskId: string;

  let userBToken: string;
  let userBId: string;
  let userBMedikioskId: string;

  let userACaseId: string;

  before(async () => {
    await connectDatabase();
    // Clean up test users
    await User.deleteMany({
      mobileNumber: { $in: ['9871110001', '9871110002'] }
    });
  });

  after(async () => {
    // Clean up test users and created cases
    if (userACaseId) {
      await Case.deleteOne({ caseId: userACaseId });
    }
    await User.deleteMany({
      mobileNumber: { $in: ['9871110001', '9871110002'] }
    });
    await disconnectDatabase();
  });

  // 1. REGISTRATION & MONGODB PERSISTENCE
  test('1. POST /auth/register creates user in MongoDB with hashed password and returns signed token', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Dr. Maya Patel',
        mobileNumber: '9871110001',
        password: 'SecurePassword#2026',
        role: 'clinician'
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.medikioskId.startsWith('MK-'));
    assert.ok(res.body.data.session.token);

    userAToken = res.body.data.session.token;
    userAId = res.body.data.session.userId;
    userAMedikioskId = res.body.data.medikioskId;

    // Verify token has standard 3 parts (header.body.signature)
    assert.equal(userAToken.split('.').length, 3);

    // Verify persisted directly in MongoDB
    const persisted = await User.findOne({ medikioskId: userAMedikioskId }).select('+passwordHash +salt');
    assert.ok(persisted, 'User must exist in MongoDB');
    assert.equal(persisted.name, 'Dr. Maya Patel');
    assert.equal(persisted.mobileNumber, '9871110001');

    // Verify password is NOT plaintext
    assert.ok(persisted.passwordHash);
    assert.notEqual(persisted.passwordHash, 'SecurePassword#2026');
    assert.ok(persisted.salt);
  });

  // 2. DUPLICATE REGISTRATION REJECTION
  test('2. POST /auth/register prevents duplicate account with same mobile number', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Duplicate Doctor',
        mobileNumber: '9871110001',
        password: 'AnotherPassword#2026'
      });

    // Expect error
    assert.ok(res.status >= 400);
    assert.equal(res.body.success, false);
  });

  // 3. LOGIN WITH MEDIKIOSK ID & PASSWORD
  test('3. POST /auth/login succeeds with valid MEDiKIOSK ID & password', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        medikioskId: userAMedikioskId,
        password: 'SecurePassword#2026'
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.medikioskId, userAMedikioskId);
    assert.ok(res.body.data.token);
  });

  test('4. POST /auth/login rejects incorrect password with 401', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        medikioskId: userAMedikioskId,
        password: 'WrongPassword#999'
      });

    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
  });

  test('5. POST /auth/login rejects non-existent MEDiKIOSK ID with 404', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        medikioskId: 'MK-000000',
        password: 'AnyPassword'
      });

    assert.equal(res.status, 404);
    assert.equal(res.body.success, false);
  });

  // 4. FIND ID BY MOBILE
  test('6. POST /auth/find-by-mobile returns matching MEDiKIOSK ID', async () => {
    const res = await request(app)
      .post('/api/v1/auth/find-by-mobile')
      .send({
        mobileNumber: '9871110001'
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.medikioskId, userAMedikioskId);
    assert.equal(res.body.data.name, 'Dr. Maya Patel');
  });

  // 5. SESSION VERIFICATION & AUTH GUARD
  test('7. GET /auth/session succeeds with valid Bearer token', async () => {
    const res = await request(app)
      .get('/api/v1/auth/session')
      .set('Authorization', `Bearer ${userAToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.userId, userAId);
    assert.equal(res.body.data.medikioskId, userAMedikioskId);
  });

  test('8. GET /auth/session rejects requests without token with 401', async () => {
    const res = await request(app)
      .get('/api/v1/auth/session');

    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
  });

  test('9. GET /auth/session rejects tampered token with 401', async () => {
    const tampered = userAToken.slice(0, -5) + 'xxxxx';
    const res = await request(app)
      .get('/api/v1/auth/session')
      .set('Authorization', `Bearer ${tampered}`);

    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
  });

  // 6. USER ISOLATION
  test('10. Multi-tenant user isolation: User B cannot access User A case', async () => {
    // Register User B
    const regB = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Dr. Rohan Mehra',
        mobileNumber: '9871110002',
        password: 'PasswordB#2026',
        role: 'clinician'
      });

    assert.equal(regB.status, 201);
    userBToken = regB.body.data.session.token;
    userBId = regB.body.data.session.userId;
    userBMedikioskId = regB.body.data.medikioskId;

    // User A creates a case using Bearer token
    const createCaseRes = await request(app)
      .post('/api/v1/cases')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        patientData: {
          firstName: 'Suresh',
          lastName: 'Kumar',
          age: 42,
          gender: 'male'
        }
      });

    assert.equal(createCaseRes.status, 201);
    assert.equal(createCaseRes.body.success, true);
    userACaseId = createCaseRes.body.data.caseId;

    // User A can access their own case
    const getOwnCase = await request(app)
      .get(`/api/v1/cases/${userACaseId}`)
      .set('Authorization', `Bearer ${userAToken}`);
    assert.equal(getOwnCase.status, 200);

    // User B attempts to access User A's case -> 404 (prevents ID enumeration/information leak)
    const getForbiddenCase = await request(app)
      .get(`/api/v1/cases/${userACaseId}`)
      .set('Authorization', `Bearer ${userBToken}`);
    assert.equal(getForbiddenCase.status, 404);

    // User B attempts to send message to User A's case -> rejected without access
    const msgForbidden = await request(app)
      .post(`/api/v1/cases/${userACaseId}/conversation/messages`)
      .set('Authorization', `Bearer ${userBToken}`)
      .send({
        content: 'Unauthorized intrusion attempt'
      });
    assert.ok(msgForbidden.status === 404 || msgForbidden.status === 403, 'Cross-user manipulation must be rejected');
    assert.equal(msgForbidden.body.success, false);
  });
});
