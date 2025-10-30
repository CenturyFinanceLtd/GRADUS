/*
  One-off migration: rename MongoDB collection
  - Renames 'enrollments' to 'courses-enrollments' if needed
  - Uses the same MONGODB_URI as the app (backend/src/config/env.js)
  Usage:
    node backend/scripts/renameEnrollmentsCollection.js
*/
const mongoose = require('mongoose');
const config = require('../src/config/env');

const OLD_NAME = 'enrollments';
const NEW_NAME = 'courses-enrollments';

async function run() {
  if (!config.mongoUri) {
    console.error('[migration] MONGODB_URI is not set. Aborting.');
    process.exit(1);
  }

  await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 5000 });
  const db = mongoose.connection.db;

  const collections = await db.listCollections().toArray();
  const hasOld = collections.some((c) => c.name === OLD_NAME);
  const hasNew = collections.some((c) => c.name === NEW_NAME);

  if (!hasOld) {
    console.log(`[migration] '${OLD_NAME}' does not exist. Nothing to rename.`);
    if (hasNew) {
      console.log(`[migration] '${NEW_NAME}' already exists.`);
    }
    await mongoose.disconnect();
    return;
  }

  if (hasNew) {
    console.error(
      `[migration] Both '${OLD_NAME}' and '${NEW_NAME}' exist. Please resolve manually to avoid data loss.`
    );
    await mongoose.disconnect();
    process.exit(1);
  }

  console.log(`[migration] Renaming '${OLD_NAME}' -> '${NEW_NAME}' …`);
  await db.collection(OLD_NAME).rename(NEW_NAME);
  console.log('[migration] Done.');

  await mongoose.disconnect();
}

run().catch(async (err) => {
  console.error('[migration] Failed:', err);
  try { await mongoose.disconnect(); } catch {}
  process.exit(1);
});

