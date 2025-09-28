const mongoose = require('mongoose');

const weekSchema = new mongoose.Schema(
  {
    title: {
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

const courseSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    subtitle: {
      type: String,
      trim: true,
    },
    focus: {
      type: String,
      trim: true,
    },
    approvals: {
      type: [String],
      default: [],
    },
    placementRange: {
      type: String,
      trim: true,
    },
    price: {
      type: String,
      trim: true,
    },
    outcomeSummary: {
      type: String,
      trim: true,
    },
    deliverables: {
      type: [String],
      default: [],
    },
    outcomes: {
      type: [String],
      default: [],
    },
    finalAward: {
      type: String,
      trim: true,
    },
    partners: {
      type: [String],
      default: [],
    },
    weeks: {
      type: [weekSchema],
      default: [],
    },
    certifications: {
      type: [certificationSchema],
      default: [],
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

const Course = mongoose.model('Course', courseSchema);

module.exports = Course;
