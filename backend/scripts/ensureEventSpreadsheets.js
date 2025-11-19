/* eslint-disable no-console */
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const connectDB = require('../src/config/db');
const Event = require('../src/models/Event');
const { ensureEventSpreadsheet } = require('../src/services/googleSheetsRegistrationSync');

const SHEETS_SYNC_DELAY_MS = Number(process.env.GOOGLE_SHEETS_SYNC_DELAY_MS) || 2000;
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const run = async () => {
  try {
    await connectDB();
    const events = await Event.find({});
    console.log(
      `[ensure-event-sheets] Ensuring dedicated spreadsheets for ${events.length} events...`
    );

    let processed = 0;
    for (const event of events) {
      const payload = event?.toObject ? event.toObject() : event;
      if (!payload?.title) {
        continue;
      }
      try {
        await ensureEventSpreadsheet(payload);
        processed += 1;
      } catch (error) {
        console.error('[ensure-event-sheets] Failed to ensure spreadsheet', {
          id: event._id?.toString(),
          title: payload.title,
          error: error?.message,
        });
      }
      if (SHEETS_SYNC_DELAY_MS > 0) {
        await delay(SHEETS_SYNC_DELAY_MS);
      }
    }

    console.log(
      `[ensure-event-sheets] Completed. Ensured ${processed}/${events.length} event spreadsheets.`
    );
    process.exit(0);
  } catch (error) {
    console.error('[ensure-event-sheets] Fatal error', error);
    process.exit(1);
  }
};

run();
