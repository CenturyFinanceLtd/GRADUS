/* eslint-disable no-console */
const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const supabase = require("../src/config/supabase"); // Assumes this initializes client
const {
  ensureEventSpreadsheet,
} = require("../src/services/googleSheetsRegistrationSync");

const SHEETS_SYNC_DELAY_MS =
  Number(process.env.GOOGLE_SHEETS_SYNC_DELAY_MS) || 2000;
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const run = async () => {
  try {
    console.log(
      "[ensure-event-sheets] Fetching all events/courses from Supabase..."
    );

    // Fetch both events and courses since we sync both?
    // The previous script fetched `Event.find({})`.
    // We should fetch from 'events' table.

    const { data: events, error } = await supabase.from("events").select("*");

    if (error) throw new Error(error.message);

    console.log(
      `[ensure-event-sheets] Ensuring dedicated spreadsheets for ${events.length} events...`
    );

    let processed = 0;
    for (const event of events) {
      if (!event?.title) {
        continue;
      }
      try {
        await ensureEventSpreadsheet(event);
        processed += 1;
        process.stdout.write(".");
      } catch (error) {
        console.error("\n[ensure-event-sheets] Failed to ensure spreadsheet", {
          id: event.id,
          title: event.title,
          error: error?.message,
        });
      }
      if (SHEETS_SYNC_DELAY_MS > 0) {
        await delay(SHEETS_SYNC_DELAY_MS);
      }
    }

    console.log(
      `\n[ensure-event-sheets] Completed. Ensured ${processed}/${events.length} event spreadsheets.`
    );
    process.exit(0);
  } catch (error) {
    console.error("[ensure-event-sheets] Fatal error", error);
    process.exit(1);
  }
};

run();
