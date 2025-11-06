/*
  Seed a Course document from the frontend JSON file
  - Reads frontend/public/courses/gradusx/full-stack-development.json
  - Transforms it to the backend Course model shape (weeks, details, etc.)
  - Upserts by slug (e.g., gradus-x/full-stack-development)
*/
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const config = require('../src/config/env');
const Course = require('../src/models/Course');

const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));

async function run() {
  if (!config.mongoUri) {
    console.error('[seed] MONGODB_URI is not set.');
    process.exit(1);
  }

  const jsonPath = path.resolve(__dirname, '../../frontend/public/courses/gradusx/full-stack-development.json');
  if (!fs.existsSync(jsonPath)) {
    console.error('[seed] JSON file not found at', jsonPath);
    process.exit(1);
  }

  const src = readJson(jsonPath);

  // Transform frontend JSON -> Course schema
  const weeks = Array.isArray(src.modules)
    ? src.modules.map((m) => ({ title: m.title || '', hours: m.weeksLabel || '', points: Array.isArray(m.topics) ? m.topics : [] }))
    : [];

  const doc = {
    name: src.name || 'Full Stack Development',
    slug: (src.slug || 'gradus-x/full-stack-development').toLowerCase(),
    programme: src.programme || 'Gradus X',
    subtitle: src.hero?.subtitle || '',
    level: src.stats?.level || '',
    duration: src.stats?.duration || '',
    mode: src.stats?.mode || '',
    price: src.hero?.priceINR ? String(src.hero.priceINR) : '',
    outcomeSummary: Array.isArray(src.aboutProgram) && src.aboutProgram.length ? src.aboutProgram[0] : '',
    outcomes: Array.isArray(src.learn) ? src.learn : [],
    skills: Array.isArray(src.skills) ? src.skills : [],
    details: {
      effort: src.details?.effort || '',
      language: src.details?.language || '',
      prerequisites: src.details?.prerequisites || '',
    },
    capstonePoints: Array.isArray(src.capstone?.bullets) ? src.capstone.bullets : [],
    careerOutcomes: Array.isArray(src.careerOutcomes) ? src.careerOutcomes : [],
    toolsFrameworks: Array.isArray(src.toolsFrameworks) ? src.toolsFrameworks : [],
    weeks,
  };

  await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 10000 });

  const existing = await Course.findOne({ slug: doc.slug }).lean();
  if (existing) {
    await Course.updateOne({ slug: doc.slug }, { $set: doc });
    console.log('[seed] Updated course', doc.slug);
  } else {
    await Course.create(doc);
    console.log('[seed] Inserted course', doc.slug);
  }

  await mongoose.disconnect();
}

run().catch(async (err) => {
  console.error(err);
  try { await mongoose.disconnect(); } catch {}
  process.exit(1);
});

