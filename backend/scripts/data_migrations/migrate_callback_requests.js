const mongoose = require("mongoose");
const { Client } = require("pg");
const dotenv = require("dotenv");

dotenv.config({ path: "../.env" });

const MONGODB_URI = process.env.MONGODB_URI;
const DATABASE_URL = process.env.DATABASE_URL;

// Define Mongoose Schema
const callbackRequestSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  name: String,
  email: String,
  phone: String,
  status: String,
  createdAt: Date,
});

const CallbackRequest = mongoose.model(
  "CallbackRequest",
  callbackRequestSchema,
  "callbackrequests"
);

async function migrateCallbackRequests() {
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

    // Fetch all callback requests from MongoDB
    console.log("📥 Fetching callback requests from MongoDB...");
    const requests = await CallbackRequest.find({}).lean();
    console.log(`✓ Found ${requests.length} callback requests`);

    if (requests.length === 0) {
      console.log("ℹ️  No data to migrate");
      return;
    }

    // Get user ID mapping (MongoDB ObjectId -> Supabase UUID)
    console.log("🔍 Building user ID mapping...");
    const userMapping = {};

    for (const req of requests) {
      if (req.userId) {
        const mongoUserId = req.userId.toString();
        if (!userMapping[mongoUserId]) {
          const result = await pgClient.query(
            "SELECT id FROM users WHERE mongo_id = $1",
            [mongoUserId]
          );
          if (result.rows.length > 0) {
            userMapping[mongoUserId] = result.rows[0].id;
          }
        }
      }
    }
    console.log(`✓ Mapped ${Object.keys(userMapping).length} user IDs`);

    // Prepare data for PostgreSQL
    console.log("🔄 Migrating data to PostgreSQL...");
    let successCount = 0;
    let errorCount = 0;

    for (const req of requests) {
      try {
        const mongoUserId = req.userId ? req.userId.toString() : null;
        const supabaseUserId = mongoUserId
          ? userMapping[mongoUserId] || null
          : null;

        await pgClient.query(
          `INSERT INTO callback_requests (
            user_id, name, email, phone, status, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            supabaseUserId,
            req.name || "",
            req.email || "",
            req.phone || "",
            req.status?.toLowerCase() || "pending",
            req.createdAt || new Date(),
            req.createdAt || new Date(),
          ]
        );
        successCount++;
        if (successCount % 10 === 0) {
          console.log(`  Migrated ${successCount}/${requests.length}...`);
        }
      } catch (err) {
        errorCount++;
        console.error(
          `  ❌ Error migrating callback for ${req.email}:`,
          err.message
        );
      }
    }

    console.log("\n✅ Migration Complete!");
    console.log(`   Success: ${successCount}`);
    console.log(`   Errors: ${errorCount}`);
    console.log(`   Total: ${requests.length}`);
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
migrateCallbackRequests()
  .then(() => {
    console.log("🎉 All done!");
    process.exit(0);
  })
  .catch((err) => {
    console.error("💥 Fatal error:", err);
    process.exit(1);
  });
