const mongoose = require('mongoose');

const syllabusSchema = new mongoose.Schema(
  {
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    courseSlug: { type: String, required: true },
    programmeSlug: { type: String, default: '' },
    courseName: { type: String, default: '' },
    syllabus: { type: mongoose.Schema.Types.Mixed, required: true },
  },
  { timestamps: true }
);

syllabusSchema.index({ courseSlug: 1 }, { unique: true });

module.exports = mongoose.model('Syllabus', syllabusSchema);
