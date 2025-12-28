const { Client } = require("pg");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.resolve(__dirname, "../.env") });

async function checkAdminUsers() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log("Checking admin_users table...");
    const res = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'admin_users'
      ORDER BY ordinal_position;
    `);
    console.log(JSON.stringify(res.rows, null, 2));

    const count = await client.query("SELECT count(*) FROM public.admin_users");
    console.log("Total admin users:", count.rows[0].count);
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

checkAdminUsers();
