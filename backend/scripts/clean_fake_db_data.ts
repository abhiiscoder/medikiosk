import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import process from 'node:process';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/medikiosk';

async function cleanDatabase() {
  console.log(`Connecting to MongoDB at ${MONGODB_URI}...`);
  await mongoose.connect(MONGODB_URI);

  const collectionsToClean = [
    'patients',
    'cases',
    'clinicalsessions',
    'conversations',
    'answers',
    'clinicalhistories',
    'medicaldocuments',
    'clinicalsummaries'
  ];

  console.log('\n--- CLEANING TEST / DEMO COLLECTIONS ---');
  for (const colName of collectionsToClean) {
    try {
      const collection = mongoose.connection.db!.collection(colName);
      const countBefore = await collection.countDocuments();
      const result = await collection.deleteMany({});
      console.log(`✓ Cleared collection '${colName}': deleted ${result.deletedCount} of ${countBefore} documents.`);
    } catch (err) {
      console.warn(`! Collection '${colName}' cleanup error:`, err);
    }
  }

  // Clean uploads/cases directory
  const uploadsCasesDir = path.resolve(process.cwd(), 'uploads', 'cases');
  console.log(`\n--- CLEANING UPLOADED TEST DIRECTORIES ---`);
  console.log(`Uploads directory: ${uploadsCasesDir}`);
  if (fs.existsSync(uploadsCasesDir)) {
    const entries = fs.readdirSync(uploadsCasesDir, { withFileTypes: true });
    let dirCount = 0;
    for (const entry of entries) {
      const fullPath = path.join(uploadsCasesDir, entry.name);
      if (entry.isDirectory()) {
        fs.rmSync(fullPath, { recursive: true, force: true });
        console.log(`✓ Removed test case upload folder: ${entry.name}`);
        dirCount++;
      } else {
        fs.unlinkSync(fullPath);
        console.log(`✓ Removed test file: ${entry.name}`);
        dirCount++;
      }
    }
    console.log(`Removed ${dirCount} test upload artifacts.`);
  } else {
    fs.mkdirSync(uploadsCasesDir, { recursive: true });
    console.log(`Ensured directory exists: ${uploadsCasesDir}`);
  }

  console.log('\n--- DATABASE AND DISK CLEANUP COMPLETE ---');
  await mongoose.disconnect();
}

cleanDatabase().catch((err) => {
  console.error('Fatal cleanup error:', err);
  process.exit(1);
});
