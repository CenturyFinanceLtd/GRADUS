const mongoose = require('mongoose');

const heroSchema = new mongoose.Schema(
  {
    tagIcon: {
      type: String,
      trim: true,
    },
    tagText: {
      type: String,
      trim: true,
    },
    title: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
  },
  {
    _id: false,
  }
);

const coursePageSchema = new mongoose.Schema(
  {
    hero: heroSchema,
  },
  { timestamps: true }
);

const CoursePage = mongoose.model('CoursePage', coursePageSchema);

module.exports = CoursePage;
