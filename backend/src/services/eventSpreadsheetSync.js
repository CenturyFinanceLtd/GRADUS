/*
  Event spreadsheet sync
  - Primes Google Sheets for all existing events stored in MongoDB
  - Watches the `events` collection for inserts/updates so manual Mongo edits stay in sync
*/
const Event = require('../models/Event');
const { ensureEventSpreadsheet } = require('./googleSheetsRegistrationSync');

const SHEETS_SYNC_DELAY_MS = Number(process.env.GOOGLE_SHEETS_SYNC_DELAY_MS) || 2000;

let changeStream = null;
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const ensureForEvent = async (eventData, context) => {
  if (!eventData) {
    return;
  }

  const payload =
    typeof eventData === 'object' && eventData !== null ? eventData : { title: eventData };
  const trimmed = (payload.title || '').trim();
  if (!trimmed) {
    return;
  }

  try {
    await ensureEventSpreadsheet(payload);
  } catch (error) {
    console.warn('[event-sheet-sync] Failed to ensure spreadsheet', {
      title: trimmed,
      context,
      error: error?.message,
    });
  }
};

const primeExistingEvents = async () => {
  try {
    const events = await Event.find({}).lean();
    let processed = 0;
    for (const event of events) {
      await ensureForEvent(event, 'prime');
      processed += 1;
      if (SHEETS_SYNC_DELAY_MS > 0) {
        await delay(SHEETS_SYNC_DELAY_MS);
      }
    }
    console.log(`[event-sheet-sync] Primed ${processed} existing events from MongoDB`);
  } catch (error) {
    console.warn('[event-sheet-sync] Failed to prime existing events', error?.message);
  }
};

const startEventSpreadsheetSync = async () => {
  if (changeStream) {
    return changeStream;
  }

  const supportsWatch = typeof Event.watch === 'function';
  if (!supportsWatch) {
    console.warn('[event-sheet-sync] Change streams not supported by current Mongo deployment');
    await primeExistingEvents();
    return null;
  }

  try {
    changeStream = Event.watch(
      [
        {
          $match: {
            operationType: { $in: ['insert', 'update', 'replace'] },
          },
        },
      ],
      { fullDocument: 'updateLookup' }
    );

    changeStream.on('change', (change) => {
      const doc = change?.fullDocument || null;
      ensureForEvent(doc, change.operationType);
    });

    changeStream.on('error', (error) => {
      console.error('[event-sheet-sync] Change stream error', error?.message);
      changeStream = null;
      setTimeout(() => {
        startEventSpreadsheetSync().catch((err) =>
          console.error('[event-sheet-sync] Failed to restart watcher', err?.message)
        );
      }, 5000);
    });

    changeStream.on('close', () => {
      console.warn('[event-sheet-sync] Change stream closed. Restarting...');
      changeStream = null;
      startEventSpreadsheetSync().catch((error) =>
        console.error('[event-sheet-sync] Failed to restart watcher after close', error?.message)
      );
    });

    console.log('[event-sheet-sync] Watching MongoDB for event changes');
  } catch (error) {
    console.error('[event-sheet-sync] Unable to start change stream', error?.message);
  }

  // Kick off priming in the background without blocking server startup
  primeExistingEvents().catch((error) =>
    console.warn('[event-sheet-sync] Failed during prime pass', error?.message)
  );

  return changeStream;
};

module.exports = {
  startEventSpreadsheetSync,
};
