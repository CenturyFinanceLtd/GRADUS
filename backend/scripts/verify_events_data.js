require("dotenv").config({ path: "../.env" });
const { Client } = require("pg");

async function run() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is missing. Run with explicit env var.");
    process.exit(1);
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log("Connected to database.");

    const res = await client.query(
      "SELECT id, title, slug, created_at FROM events"
    );
    console.log("Found", res.rowCount, "events:");
    res.rows.forEach((row) => {
      console.log(`- [${row.id}] Title: '${row.title}', Slug: '${row.slug}'`);
    });
  } catch (err) {
    console.error("Error executing query:", err);
  } finally {
    await client.end();
  }
}

run();
