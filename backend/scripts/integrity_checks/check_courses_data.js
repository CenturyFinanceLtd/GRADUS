const { Client } = require("pg");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.resolve(__dirname, "../.env") });

async function checkCourses() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log("Checking courses table...");
    const res = await client.query("SELECT count(*) FROM public.courses");
    console.log("Total courses:", res.rows[0].count);

    const sample = await client.query(
      "SELECT id, slug, name FROM public.courses LIMIT 5"
    );
    console.log("Sample courses:", JSON.stringify(sample.rows, null, 2));

    const columns = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'courses'
    `);
    console.log(
      "Columns in courses table:",
      columns.rows.map((r) => r.column_name).join(", ")
    );
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

checkCourses();
