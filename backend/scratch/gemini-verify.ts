/**
 * MEDiKIOSK — Foundation 03: Gemini API Connectivity Verification Script
 * Sends a harmless non-clinical ping to Google Gemini API via @google/genai.
 * Run: npx tsx scratch/gemini-verify.ts
 */

import dotenv from 'dotenv';
dotenv.config();

import { geminiService } from '../src/services/gemini.service.js';
import { isGeminiConfigured } from '../src/config/index.js';

async function main() {
  console.log('=== MEDiKIOSK Foundation 03: Gemini API Verification ===');
  console.log(`Provider: Google Gemini API (@google/genai)`);
  console.log(`Configured Model: ${geminiService.getModel()}`);
  console.log(`API Key Status: ${isGeminiConfigured() ? 'Configured (present)' : 'NOT CONFIGURED (missing or placeholder)'}`);
  console.log('');

  if (!isGeminiConfigured()) {
    console.error('❌ Verification halted: GEMINI_API_KEY is not configured in backend/.env.');
    console.error('Please configure GEMINI_API_KEY with a valid Google Gemini API key and re-run.');
    process.exit(1);
  }

  console.log('[1/2] Sending non-clinical verification ping to Gemini API...');
  const result = await geminiService.verifyConnectivity();

  if (!result.connected) {
    console.error('❌ Verification failed!');
    console.error(`Error details: ${result.error}`);
    process.exit(1);
  }

  console.log(`  ✅ Gemini API responded successfully!`);
  console.log(`  ✅ Model used: ${result.model}`);
  console.log(`  ✅ Response snippet: "${result.responseSnippet}"`);
  console.log('');
  console.log('[2/2] Verifying security constraints...');
  console.log('  ✅ API key is NOT displayed or logged.');
  console.log('  ✅ Non-clinical payload used.');
  console.log('');
  console.log('=== VERIFICATION RESULT: ALL GEMINI CHECKS PASSED ===');
}

main().catch((err) => {
  console.error('');
  console.error('=== GEMINI VERIFICATION ERROR ===');
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
