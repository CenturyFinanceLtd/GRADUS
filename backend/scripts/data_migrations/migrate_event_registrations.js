const mongoose = require("mongoose");
const { Client } = require("pg");
const dotenv = require("dotenv");

dotenv.config({ path: "../.env" });

const MONGODB_URI = process.env.MONGODB_URI;
const DATABASE_URL = process.env.DATABASE_URL;

// Define Mongoose Schema
const eventRegistrationSchema = new mongoose.Schema({
  name: String,
  email: String,
  phone: String,
  state: String,
  qualification: String,
  course: String,
  message: String,
  consent: Boolean,
  eventDetails: Object,
  sheetRowIndex: Number,
  event: String,
  createdAt: Date,
  updatedAt: Date,
});

const EventRegistration = mongoose.model(
  "EventRegistration",
  eventRegistrationSchema,
  "event-registrations"
);

async function migrateEventRegistrations() {
  let pgClient;

  try {
    // Connect to MongoDB
    console.log("📡 Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("✓ Connected to MongoDB");

    // Connect to PostgreSQL
    console.log("📡 Connecting to PostgreSQL...");
    pgClient = new Client({
      connectionString: DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    });
    await pgClient.connect();
    console.log("✓ Connected to PostgreSQL");

    // Fetch all event registrations from MongoDB
    console.log("📥 Fetching event registrations from MongoDB...");
    const registrations = await EventRegistration.find({}).lean();
    console.log(`✓ Found ${registrations.length} event registrations`);

    if (registrations.length === 0) {
      console.log("ℹ️  No data to migrate");
      return;
    }

    // Map event IDs if available
    console.log("🔍 Building event ID mapping...");
    const eventMapping = {};
    for (const reg of registrations) {
      if (reg.eventDetails?.id) {
        const mongoEventId = reg.eventDetails.id;
        if (!eventMapping[mongoEventId]) {
          const result = await pgClient.query(
            "SELECT id FROM events WHERE mongo_id = $1",
            [mongoEventId]
          );
          if (result.rows.length > 0) {
            eventMapping[mongoEventId] = result.rows[0].id;
          }
        }
      }
    }
    console.log(`✓ Mapped ${Object.keys(eventMapping).length} event IDs`);

    // Prepare data for PostgreSQL
    console.log("🔄 Migrating data to PostgreSQL...");
    let successCount = 0;
    let errorCount = 0;

    for (const reg of registrations) {
      try {
        const mongoEventId = reg.eventDetails?.id;
        const supabaseEventId = mongoEventId
          ? eventMapping[mongoEventId] || null
          : null;

        // Build meta object with additional data
        const meta = {
          state: reg.state || "",
          qualification: reg.qualification || "",
          course: reg.course || reg.event || "",
          message: reg.message || "",
          consent: reg.consent !== null ? reg.consent : false,
          eventDetails: reg.eventDetails || {},
          sheetRowIndex: reg.sheetRowIndex,
          event: reg.event,
        };

        await pgClient.query(
          `INSERT INTO event_registrations (
            event_id, name, email, phone, registered_at, status, meta, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            supabaseEventId,
            reg.name || "",
            reg.email || "",
            reg.phone || "",
            reg.createdAt || new Date(),
            "confirmed", // default status
            JSON.stringify(meta),
            reg.createdAt || new Date(),
            reg.updatedAt || new Date(),
          ]
        );
        successCount++;
        if (successCount % 10 === 0) {
          console.log(`  Migrated ${successCount}/${registrations.length}...`);
        }
      } catch (err) {
        errorCount++;
        console.error(
          `  ❌ Error migrating registration for ${reg.email}:`,
          err.message
        );
      }
    }

    console.log("\n✅ Migration Complete!");
    console.log(`   Success: ${successCount}`);
    console.log(`   Errors: ${errorCount}`);
    console.log(`   Total: ${registrations.length}`);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  } finally {
    if (pgClient) {
      await pgClient.end();
      console.log("✓ PostgreSQL connection closed");
    }
    await mongoose.disconnect();
    console.log("✓ MongoDB connection closed");
  }
}

// Run migration
migrateEventRegistrations()
  .then(() => {
    console.log("🎉 All done!");
    process.exit(0);
  })
  .catch((err) => {
    console.error("💥 Fatal error:", err);
    process.exit(1);
  });
