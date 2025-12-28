const mongoose = require("mongoose");
const { Client } = require("pg");
const dotenv = require("dotenv");

dotenv.config({ path: "../.env" });

const MONGODB_URI = process.env.MONGODB_URI;
const DATABASE_URL = process.env.DATABASE_URL;

// Define Mongoose Schema
const contactInquirySchema = new mongoose.Schema({
  name: String,
  email: String,
  phone: String,
  state: String,
  region: String,
  institution: String,
  course: String,
  message: String,
  qualification: String,
  contactStatus: String,
  leadGenerated: Boolean,
  inquirySolved: Boolean,
  createdAt: Date,
  updatedAt: Date,
});

const ContactInquiry = mongoose.model(
  "ContactInquiry",
  contactInquirySchema,
  "contactus-inquiry"
);

async function migrateContactInquiries() {
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

    // Fetch all contact inquiries from MongoDB
    console.log("📥 Fetching contact inquiries from MongoDB...");
    const inquiries = await ContactInquiry.find({}).lean();
    console.log(`✓ Found ${inquiries.length} contact inquiries`);

    if (inquiries.length === 0) {
      console.log("ℹ️  No data to migrate");
      return;
    }

    // Prepare data for PostgreSQL
    console.log("🔄 Migrating data to PostgreSQL...");
    let successCount = 0;
    let errorCount = 0;

    for (const inquiry of inquiries) {
      try {
        await pgClient.query(
          `INSERT INTO contact_inquiries (
            name, email, phone, state, region, institution, course, message, 
            qualification, contact_status, lead_generated, inquiry_solved, 
            created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
          [
            inquiry.name || "",
            inquiry.email || "",
            inquiry.phone || "",
            inquiry.state || null,
            inquiry.region || "",
            inquiry.institution || null,
            inquiry.course || null,
            inquiry.message || null,
            inquiry.qualification || null,
            inquiry.contactStatus || "pending",
            inquiry.leadGenerated !== null ? inquiry.leadGenerated : null,
            inquiry.inquirySolved !== null ? inquiry.inquirySolved : null,
            inquiry.createdAt || new Date(),
            inquiry.updatedAt || new Date(),
          ]
        );
        successCount++;
        if (successCount % 10 === 0) {
          console.log(`  Migrated ${successCount}/${inquiries.length}...`);
        }
      } catch (err) {
        errorCount++;
        console.error(
          `  ❌ Error migrating inquiry for ${inquiry.email}:`,
          err.message
        );
      }
    }

    console.log("\n✅ Migration Complete!");
    console.log(`   Success: ${successCount}`);
    console.log(`   Errors: ${errorCount}`);
    console.log(`   Total: ${inquiries.length}`);
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
migrateContactInquiries()
  .then(() => {
    console.log("🎉 All done!");
    process.exit(0);
  })
  .catch((err) => {
    console.error("💥 Fatal error:", err);
    process.exit(1);
  });
