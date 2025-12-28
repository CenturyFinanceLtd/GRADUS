/* eslint-disable no-console */
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const connectDB = require('../src/config/db');
const { resyncAllEventRegistrationSheets } = require('../src/services/registrationSpreadsheetSync');

const SHEETS_SYNC_DELAY_MS = Number(process.env.GOOGLE_SHEETS_SYNC_DELAY_MS) || 2000;

const run = async () => {
  try {
    await connectDB();
    console.log('[sync] Rebuilding Google Sheets for all event registrations...');
    await resyncAllEventRegistrationSheets();
    if (SHEETS_SYNC_DELAY_MS > 0) {
      // Provide a buffer before exit to avoid cutting off pending async work
      await new Promise((resolve) => setTimeout(resolve, SHEETS_SYNC_DELAY_MS));
    }
    console.log('[sync] Completed rebuilding event registration sheets.');
    process.exit(0);
  } catch (error) {
    console.error('[sync] Fatal error', error);
    process.exit(1);
  }
};

run();
