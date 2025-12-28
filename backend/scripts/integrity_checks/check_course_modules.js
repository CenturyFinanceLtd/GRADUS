const { Client } = require("pg");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.resolve(__dirname, "../.env") });

async function checkCourse() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();

    const res = await client.query(`
      SELECT id, name, slug, modules 
      FROM courses 
      WHERE slug = 'gradus-x/agentic-ai-engineering-flagship'
      LIMIT 1;
    `);

    if (res.rows.length === 0) {
      console.log("Course not found");
      return;
    }

    const course = res.rows[0];
    console.log("Course:", course.name, "(", course.slug, ")");
    if (course.modules && course.modules.length > 0) {
      console.log(
        "Module 0 structure:",
        JSON.stringify(course.modules[0], null, 2)
      );
    } else {
      console.log("No modules found");
    }
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

checkCourse();
