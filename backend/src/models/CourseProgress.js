/*
  CourseProgress model
  - Stores per-lecture progress for each learner
*/
const mongoose = require('mongoose');

const courseProgressSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    courseSlug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    lectureId: {
      type: String,
      required: true,
      trim: true,
    },
    moduleId: { type: String, trim: true },
    sectionId: { type: String, trim: true },
    lectureTitle: { type: String, trim: true },
    videoUrl: { type: String, trim: true },
    durationSeconds: { type: Number, default: 0 },
    lastPositionSeconds: { type: Number, default: 0 },
    watchedSeconds: { type: Number, default: 0 },
    completionRatio: { type: Number, default: 0 },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

courseProgressSchema.index({ user: 1, courseSlug: 1, lectureId: 1 }, { unique: true });

module.exports = mongoose.model('CourseProgress', courseProgressSchema);
