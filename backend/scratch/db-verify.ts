/**
 * MEDiKIOSK — Step 5: MongoDB Connectivity Verification Script
 * Performs a safe write + read + cleanup cycle using a synthetic test record.
 * Run: npx tsx scratch/db-verify.ts
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/medikiosk';

async function verify() {
  console.log('=== MEDiKIOSK MongoDB Connectivity Verification ===');
  console.log(`URI: ${MONGODB_URI}`);
  console.log('');

  // 1. Connect
  console.log('[1/5] Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
  console.log(`  ✅ Connected to host: ${mongoose.connection.host}`);
  console.log(`  ✅ Database: ${mongoose.connection.name}`);
  console.log('');

  // 2. Define a temporary test schema
  const TestSchema = new mongoose.Schema({
    testId: { type: String, required: true, unique: true },
    purpose: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
  });

  const TestModel = mongoose.models.__MedikiskConnTest ||
    mongoose.model('__MedikiskConnTest', TestSchema);

  const testId = `conn-verify-${Date.now()}`;

  // 3. Write
  console.log('[2/5] Writing test record...');
  const doc = await TestModel.create({
    testId,
    purpose: 'MongoDB connectivity verification — Step 5'
  });
  console.log(`  ✅ Written: testId="${doc.testId}"`);
  console.log('');

  // 4. Read back
  console.log('[3/5] Reading test record back...');
  const readBack = await TestModel.findOne({ testId });
  if (!readBack) {
    throw new Error('FAILED: Could not read back the test record!');
  }
  console.log(`  ✅ Read back: testId="${readBack.testId}", purpose="${readBack.purpose}"`);
  console.log('');

  // 5. Cleanup
  console.log('[4/5] Cleaning up test record...');
  await TestModel.deleteOne({ testId });
  const afterDelete = await TestModel.findOne({ testId });
  if (afterDelete) {
    throw new Error('FAILED: Test record was not cleaned up!');
  }
  console.log('  ✅ Test record removed successfully');

  // Drop the temporary collection entirely
  await mongoose.connection.db!.dropCollection('__medikiskconntests').catch(() => {
    // Collection may not exist; ignore
  });
  console.log('  ✅ Temporary collection dropped');
  console.log('');

  // 6. Disconnect
  console.log('[5/5] Disconnecting...');
  await mongoose.disconnect();
  console.log('  ✅ Disconnected cleanly');
  console.log('');

  console.log('=== VERIFICATION RESULT: ALL CHECKS PASSED ===');
}

verify().catch(async (err) => {
  console.error('');
  console.error('=== VERIFICATION FAILED ===');
  console.error(`Error: ${err.message}`);
  try { await mongoose.disconnect(); } catch { /* ignore */ }
  process.exit(1);
});
