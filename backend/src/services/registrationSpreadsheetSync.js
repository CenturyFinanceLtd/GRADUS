/*
  Event registration spreadsheet sync
  - Keeps Google Sheets rows aligned with MongoDB changes (create/update/delete)
  - Provides helpers to rebuild sheets per event or for all events
*/
const EventRegistration = require('../models/EventRegistration');
const Event = require('../models/Event');
const {
  syncRegistrationToGoogleSheet,
  replaceEventRegistrationsSheet,
} = require('./googleSheetsRegistrationSync');

const SHEETS_SYNC_DELAY_MS = Number(process.env.GOOGLE_SHEETS_SYNC_DELAY_MS) || 2000;

let changeStream = null;
let watcherEnabled = false;
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const setWatcherStatus = (value) => {
  watcherEnabled = Boolean(value);
};

const isRegistrationSheetWatcherEnabled = () => watcherEnabled;

const eventNameFromRegistration = (registration) =>
  (registration?.course ||
    registration?.eventDetails?.title ||
    (registration?.eventDetails && registration.eventDetails.eventTitle) ||
    '').trim();

const updateSheetRowIndex = async (registrationId, rowIndex) => {
  try {
    await EventRegistration.updateOne(
      { _id: registrationId },
      { sheetRowIndex: Number.isFinite(rowIndex) ? rowIndex : null }
    );
  } catch (error) {
    console.warn('[registration-sheet-sync] Failed to update sheetRowIndex', {
      id: registrationId,
      error: error?.message,
    });
  }
};

const syncSingleRegistration = async (registration) => {
  if (!registration) return;
  try {
    const rowIndex = await syncRegistrationToGoogleSheet(registration);
    if (Number.isFinite(rowIndex)) {
      await updateSheetRowIndex(registration._id, rowIndex);
    }
  } catch (error) {
    console.warn('[registration-sheet-sync] Failed to sync registration', {
      id: registration?._id,
      error: error?.message,
    });
  }
};

const resyncEventRegistrationsForEvent = async (eventName) => {
  const normalized = (eventName || '').trim();
  if (!normalized) {
    return false;
  }

  try {
    const registrations = await EventRegistration.find({ course: normalized })
      .sort({ createdAt: 1 })
      .lean();

    const result = await replaceEventRegistrationsSheet(normalized, registrations);
    if (result?.rowMap) {
      const bulk = registrations.map((registration) => ({
        updateOne: {
          filter: { _id: registration._id },
          update: { sheetRowIndex: result.rowMap.get(String(registration._id)) || null },
        },
      }));
      if (bulk.length) {
        await EventRegistration.bulkWrite(bulk, { ordered: false });
      }
    }

    return true;
  } catch (error) {
    console.warn('[registration-sheet-sync] Failed to resync event registrations', {
      event: eventName,
      error: error?.message,
    });
    return false;
  }
};

const resyncAllEventRegistrationSheets = async () => {
  try {
    const eventNames = new Set();
    const events = await Event.find({}, { title: 1 }).lean();
    events.forEach((event) => {
      if (event?.title) {
        eventNames.add(event.title.trim());
      }
    });

    const registrationCourses = await EventRegistration.distinct('course');
    registrationCourses.forEach((course) => {
      if (course) {
        eventNames.add(String(course).trim());
      }
    });

    for (const eventName of eventNames) {
      await resyncEventRegistrationsForEvent(eventName);
      if (SHEETS_SYNC_DELAY_MS > 0) {
        // Avoid hammering Sheets API
        // eslint-disable-next-line no-await-in-loop
        await delay(SHEETS_SYNC_DELAY_MS);
      }
    }
    return true;
  } catch (error) {
    console.error('[registration-sheet-sync] Failed to resync all events', error?.message);
    return false;
  }
};

const shouldHandleUpdate = (change) => {
  const updatedFields = Object.keys(change?.updateDescription?.updatedFields || {});
  if (!updatedFields.length) return false;
  return updatedFields.some(
    (field) => field !== 'sheetRowIndex' && field !== 'updatedAt' && field !== 'createdAt'
  );
};

const startRegistrationSpreadsheetSync = async () => {
  if (changeStream) {
    return changeStream;
  }

  const supportsWatch = typeof EventRegistration.watch === 'function';
  if (!supportsWatch) {
    console.warn('[registration-sheet-sync] Change streams not supported; skipping watcher');
    setWatcherStatus(false);
    return null;
  }

  try {
    changeStream = EventRegistration.watch([], {
      fullDocument: 'updateLookup',
      fullDocumentBeforeChange: 'whenAvailable',
    });
    setWatcherStatus(true);

    changeStream.on('change', async (change) => {
      try {
        if (change.operationType === 'insert' || change.operationType === 'replace') {
          await syncSingleRegistration(change.fullDocument);
          return;
        }

        if (change.operationType === 'update') {
          if (shouldHandleUpdate(change)) {
            await syncSingleRegistration(change.fullDocument);
          }
          return;
        }

        if (change.operationType === 'delete') {
          const eventName =
            eventNameFromRegistration(change.fullDocumentBeforeChange) || null;
          if (eventName) {
            await resyncEventRegistrationsForEvent(eventName);
          } else {
            await resyncAllEventRegistrationSheets();
          }
        }
      } catch (error) {
        console.error('[registration-sheet-sync] Change handler error', error?.message);
      }
    });

    changeStream.on('error', (error) => {
      const isNetworkError = error?.message?.includes('ENOTFOUND') || error?.message?.includes('ECONNREFUSED');
      const retryDelay = isNetworkError ? 30000 : 5000;

      console.error(`[registration-sheet-sync] Change stream error (${error?.message}). Restarting in ${retryDelay / 1000}s...`);
      setWatcherStatus(false);
      changeStream = null;

      setTimeout(() => {
        startRegistrationSpreadsheetSync().catch((err) =>
          console.error('[registration-sheet-sync] Failed to restart watcher', err?.message)
        );
      }, retryDelay);
    });

    changeStream.on('close', () => {
      console.warn('[registration-sheet-sync] Change stream closed. Restarting in 5s...');
      setWatcherStatus(false);
      changeStream = null;

      setTimeout(() => {
        startRegistrationSpreadsheetSync().catch((error) =>
          console.error('[registration-sheet-sync] Failed to restart watcher', error?.message)
        );
      }, 5000);
    });

    console.log('[registration-sheet-sync] Watching MongoDB for registration changes');
  } catch (error) {
    console.error('[registration-sheet-sync] Unable to start change stream', error?.message);
    setWatcherStatus(false);
  }

  return changeStream;
};

module.exports = {
  startRegistrationSpreadsheetSync,
  resyncEventRegistrationsForEvent,
  resyncAllEventRegistrationSheets,
  isRegistrationSheetWatcherEnabled,
};
