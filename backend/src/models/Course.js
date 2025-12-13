/*
  Course model
  - Public course catalogue entries and structured outcomes
*/
const mongoose = require('mongoose');

const weekSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      trim: true,
    },
    hours: {
      // e.g., "Weeks 1" or "Weeks 5–6" or "3 hours to complete"
      type: String,
      trim: true,
    },
    points: {
      type: [String],
      default: [],
    },
  },
  {
    _id: false,
  }
);

const certificationSchema = new mongoose.Schema(
  {
    level: {
      type: String,
      trim: true,
    },
    certificateName: {
      type: String,
      trim: true,
    },
    coverage: {
      type: [String],
      default: [],
    },
    outcome: {
      type: String,
      trim: true,
    },
  },
  {
    _id: false,
  }
);

const partnerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
    },
    logo: {
      type: String,
      trim: true,
    },
    website: {
      type: String,
      trim: true,
    },
  },
  {
    _id: false,
  }
);

const instructorSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true },
    subtitle: { type: String, trim: true },
  },
  { _id: false }
);

const moduleExtrasSchema = new mongoose.Schema(
  {
    projectTitle: { type: String, trim: true },
    projectDescription: { type: String, trim: true },
    examples: { type: [String], default: [] },
    deliverables: { type: [String], default: [] },
  },
  { _id: false }
);

const moduleLectureSchema = new mongoose.Schema(
  {
    title: { type: String, trim: true },
    duration: { type: String, trim: true },
    type: { type: String, trim: true },
  },
  { _id: false }
);

const moduleWeekSchema = new mongoose.Schema(
  {
    title: { type: String, trim: true },
    subtitle: { type: String, trim: true },
    summary: { type: String, trim: true },
    lectures: { type: [moduleLectureSchema], default: [] },
    assignments: { type: [String], default: [] },
    projects: { type: [String], default: [] },
    quizzes: { type: [String], default: [] },
    notes: { type: [String], default: [] },
  },
  { _id: false }
);

const moduleSchema = new mongoose.Schema(
  {
    title: { type: String, trim: true },
    weeksLabel: { type: String, trim: true },
    topics: { type: [String], default: [] },
    outcome: { type: String, trim: true },
    extras: { type: moduleExtrasSchema, default: undefined },
    weeklyStructure: { type: [moduleWeekSchema], default: [] },
    outcomes: { type: [String], default: [] },
    resources: { type: [String], default: [] },
  },
  { _id: false }
);

const courseSchema = new mongoose.Schema(
  {
    // Programme metadata
    programme: {
      type: String,
      enum: ['Gradus X', 'Gradus Finlit', 'Gradus Lead'],
      default: 'Gradus X',
      trim: true,
    },
    programmeSlug: { type: String, trim: true, default: '' },
    courseSlug: { type: String, trim: true, default: '' },

    // Top-level identifiers
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, unique: true }, // supports "programme/course"

    // Legacy/flat fields (kept for backward compatibility)
    subtitle: { type: String, trim: true },
    focus: { type: String, trim: true },
    approvals: { type: [String], default: undefined },
    placementRange: { type: String, trim: true },
    price: { type: String, trim: true },
    level: { type: String, trim: true },
    duration: { type: String, trim: true },
    mode: { type: String, trim: true },
    outcomeSummary: { type: String, trim: true },
    skills: { type: [String], default: undefined },
    details: {
      effort: { type: String, trim: true },
      language: { type: String, trim: true },
      prerequisites: { type: String, trim: true },
    },
    deliverables: { type: [String], default: undefined },
    outcomes: { type: [String], default: undefined },
    capstonePoints: { type: [String], default: undefined },
    careerOutcomes: { type: [String], default: undefined },
    toolsFrameworks: { type: [String], default: undefined },
    finalAward: { type: String, trim: true },
    partners: { type: [partnerSchema], default: undefined },
    weeks: { type: [weekSchema], default: undefined },
    certifications: { type: [certificationSchema], default: undefined },

    // New nested shape support
    hero: {
      subtitle: { type: String, trim: true, default: '' },
      priceINR: { type: Number, default: 0 },
      enrolledText: { type: String, trim: true, default: '' },
    },
    stats: {
      modules: { type: Number, default: 0 },
      mode: { type: String, trim: true, default: '' },
      level: { type: String, trim: true, default: '' },
      duration: { type: String, trim: true, default: '' },
    },
    aboutProgram: { type: [String], default: [] },
    learn: { type: [String], default: [] },
    targetAudience: { type: [String], default: [] },
    prereqsList: { type: [String], default: [] },
    modules: { type: [moduleSchema], default: [] },
    instructors: { type: [instructorSchema], default: [] },
    offeredBy: {
      name: { type: String, trim: true, default: '' },
      subtitle: { type: String, trim: true, default: '' },
      logo: { type: String, trim: true, default: '' },
    },
    capstone: {
      summary: { type: String, trim: true, default: '' },
      bullets: { type: [String], default: [] },
    },

    // Image/asset fields
    image: {
      url: { type: String, trim: true, default: '' },
      publicId: { type: String, trim: true, default: '' },
      alt: { type: String, trim: true, default: '' },
    },
    media: {
      banner: {
        url: { type: String, trim: true, default: '' },
        publicId: { type: String, trim: true, default: '' },
        width: { type: Number, default: 0 },
        height: { type: Number, default: 0 },
        format: { type: String, trim: true, default: '' },
      },
    },

    // Assessment settings
    assessmentMaxAttempts: { type: Number, default: 3 },

    order: { type: Number },
  },
  { timestamps: true }
);
const Course = mongoose.model('Course', courseSchema);

module.exports = Course;

