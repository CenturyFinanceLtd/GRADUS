require("dotenv").config({ path: "../.env" });
const { Client } = require("pg");

const eventData = {
  _id: {
    $oid: "69392bef78e5c3dd4e11e08c",
  },
  title: "Ready To Get Job-Ready?",
  slug: "ready-to-get-job-ready",
  subtitle: "",
  summary:
    "We’re coming to SIRT Bhopal to help students learn what the industry really wants — Not just marks... but Tech, Finance skills & job readiness.",
  description: "",
  category: "General",
  badge: "",
  eventType: "Seminar",
  tags: [],
  level: "",
  trackLabel: "",
  heroImage: {
    url: "",
    alt: "",
  },
  host: {
    name: "Vaibhav Batra, Akhil Pandey & Khushi Soni",
    title: "Industry Experts (Gradus)",
    avatarUrl: "",
    bio: "Featuring Vaibhav Batra (Director Academics), Akhil Pandey (AI/ML Expert), and Khushi Soni (Asst. Manager Corporate Relations).",
  },
  price: {
    label: "Free",
    amount: 0,
    currency: "INR",
    isFree: true,
  },
  cta: {
    label: "Join us live",
    url: "",
    external: false,
  },
  schedule: {
    start: {
      $date: "2025-12-09T05:00:00.000Z",
    },
    timezone: "Asia/Kolkata",
  },
  mode: "in-person",
  location:
    "Sagar Institute of Research Technology (SIRT), Ayodhya Bypass, Bhopal",
  recordingAvailable: false,
  isFeatured: false,
  status: "published",
  sortOrder: 0,
  createdBy: {
    $oid: "68ea6aa3834c7110d476be0e",
  },
  meta: {
    highlights: [],
    agenda: [],
  },
  createdAt: {
    $date: "2025-12-10T08:14:39.688Z",
  },
  updatedAt: {
    $date: "2025-12-10T08:14:39.688Z",
  },
  __v: 0,
};

// --- Data Cleaning function ---
function cleanEventData(data) {
  const cleaned = { ...data };

  // Remove MongoDB _id and __v
  delete cleaned._id;
  delete cleaned.__v;

  // Transform $date fields
  if (
    cleaned.schedule &&
    cleaned.schedule.start &&
    cleaned.schedule.start.$date
  ) {
    cleaned.schedule.start = cleaned.schedule.start.$date;
  }
  if (cleaned.createdAt && cleaned.createdAt.$date) {
    cleaned.created_at = cleaned.createdAt.$date;
    delete cleaned.createdAt;
  }
  if (cleaned.updatedAt && cleaned.updatedAt.$date) {
    cleaned.updated_at = cleaned.updatedAt.$date;
    delete cleaned.updatedAt;
  }

  // Transform other fields if necessary
  if (cleaned.createdBy && cleaned.createdBy.$oid) {
    cleaned.created_by = cleaned.createdBy.$oid; // Keep as string ID for now
    delete cleaned.createdBy;
  }

  // Flatten or restructure if needed. For Postgres, JSONB is good for nested objects.
  // We will map structured fields to existing columns if we can, or JSONB.

  return cleaned;
}

const cleanedData = cleanEventData(eventData);

const ensureSchemaQuery = `
  CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL
  );

  ALTER TABLE events ADD COLUMN IF NOT EXISTS title TEXT;
  ALTER TABLE events ADD COLUMN IF NOT EXISTS subtitle TEXT;
  ALTER TABLE events ADD COLUMN IF NOT EXISTS summary TEXT;
  ALTER TABLE events ADD COLUMN IF NOT EXISTS description TEXT;
  ALTER TABLE events ADD COLUMN IF NOT EXISTS category TEXT;
  ALTER TABLE events ADD COLUMN IF NOT EXISTS badge TEXT;
  ALTER TABLE events ADD COLUMN IF NOT EXISTS event_type TEXT;
  ALTER TABLE events ADD COLUMN IF NOT EXISTS tags TEXT[];
  ALTER TABLE events ADD COLUMN IF NOT EXISTS level TEXT;
  ALTER TABLE events ADD COLUMN IF NOT EXISTS track_label TEXT;
  ALTER TABLE events ADD COLUMN IF NOT EXISTS hero_image JSONB DEFAULT '{}'::jsonb;
  ALTER TABLE events ADD COLUMN IF NOT EXISTS host JSONB DEFAULT '{}'::jsonb;
  ALTER TABLE events ADD COLUMN IF NOT EXISTS price JSONB DEFAULT '{}'::jsonb;
  ALTER TABLE events ADD COLUMN IF NOT EXISTS cta JSONB DEFAULT '{}'::jsonb;
  ALTER TABLE events ADD COLUMN IF NOT EXISTS schedule JSONB DEFAULT '{}'::jsonb;
  ALTER TABLE events ADD COLUMN IF NOT EXISTS mode TEXT;
  ALTER TABLE events ADD COLUMN IF NOT EXISTS location TEXT;
  ALTER TABLE events ADD COLUMN IF NOT EXISTS recording_available BOOLEAN DEFAULT false;
  ALTER TABLE events ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;
  ALTER TABLE events ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft';
  ALTER TABLE events ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;
  ALTER TABLE events ADD COLUMN IF NOT EXISTS created_by TEXT;
  ALTER TABLE events ADD COLUMN IF NOT EXISTS meta JSONB DEFAULT '{}'::jsonb;
  ALTER TABLE events ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  ALTER TABLE events ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
`;

// Update run function to use this query
async function run() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is missing in .env");
    process.exit(1);
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log("Connected to database.");

    // 1. Ensure Schema (Create table + Add columns)
    await client.query(ensureSchemaQuery);
    console.log("Table 'events' schema ensured.");

    // 2. Prepare values
    const values = [
      cleanedData.title,
      cleanedData.slug,
      cleanedData.subtitle,
      cleanedData.summary,
      cleanedData.description,
      cleanedData.category,
      cleanedData.badge,
      cleanedData.eventType,
      cleanedData.tags,
      cleanedData.level,
      cleanedData.trackLabel,
      cleanedData.heroImage,
      cleanedData.host,
      cleanedData.price,
      cleanedData.cta,
      cleanedData.schedule,
      cleanedData.mode,
      cleanedData.location,
      cleanedData.recordingAvailable,
      cleanedData.isFeatured,
      cleanedData.status,
      cleanedData.sortOrder,
      cleanedData.created_by,
      cleanedData.meta,
      cleanedData.created_at,
      cleanedData.updated_at,
    ];

    // 3. Upsert Data (Update if exists, Insert if new)
    // Using ON CONFLICT (slug) DO UPDATE
    const upsertQuery = `
      INSERT INTO events (
        title, slug, subtitle, summary, description, category, badge, event_type, tags, 
        level, track_label, hero_image, host, price, cta, schedule, mode, location, 
        recording_available, is_featured, status, sort_order, created_by, meta, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, 
        $10, $11, $12, $13, $14, $15, $16, $17, $18, 
        $19, $20, $21, $22, $23, $24, $25, $26
      ) 
      ON CONFLICT (slug) DO UPDATE SET
        title = EXCLUDED.title,
        subtitle = EXCLUDED.subtitle,
        summary = EXCLUDED.summary,
        description = EXCLUDED.description,
        category = EXCLUDED.category,
        badge = EXCLUDED.badge,
        event_type = EXCLUDED.event_type,
        tags = EXCLUDED.tags,
        level = EXCLUDED.level,
        track_label = EXCLUDED.track_label,
        hero_image = EXCLUDED.hero_image,
        host = EXCLUDED.host,
        price = EXCLUDED.price,
        cta = EXCLUDED.cta,
        schedule = EXCLUDED.schedule,
        mode = EXCLUDED.mode,
        location = EXCLUDED.location,
        recording_available = EXCLUDED.recording_available,
        is_featured = EXCLUDED.is_featured,
        status = EXCLUDED.status,
        sort_order = EXCLUDED.sort_order,
        created_by = EXCLUDED.created_by,
        meta = EXCLUDED.meta,
        updated_at = NOW()
      RETURNING *;
    `;

    const res = await client.query(upsertQuery, values);
    console.log("Upserted event:", res.rows[0]);
  } catch (err) {
    console.error("Error executing script:", err);
  } finally {
    await client.end();
  }
}

run();
