const path = require("path");
console.log("CWD:", process.cwd());
const envPath = path.resolve(__dirname, "../.env");
const tempEnvPath = path.resolve(__dirname, "../temp_secret.env");
console.log("Loading .env from:", envPath);
require("dotenv").config({ path: envPath, debug: true });
console.log("Loading temp_secret.env from:", tempEnvPath);
require("dotenv").config({ path: tempEnvPath, debug: true });
const { Client } = require("pg");

const dropColumnQuery = `
  ALTER TABLE events 
  DROP COLUMN IF EXISTS mongo_id;
`;

async function run() {
  if (!process.env.DATABASE_URL) {
    console.error(
      "DATABASE_URL is missing. Please ensure it is set in .env or temp_secret.env"
    );
    process.exit(1);
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log("Connected to database.");

    // Drop Column
    await client.query(dropColumnQuery);
    console.log("Column 'mongo_id' dropped successfully (if it existed).");
  } catch (err) {
    console.error("Error executing script:", err);
  } finally {
    await client.end();
  }
}

run();
