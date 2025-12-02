const mongoose = require('mongoose');

const assessmentJobSchema = new mongoose.Schema(
  {
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    courseSlug: { type: String, required: true },
    programmeSlug: { type: String, default: '' },
    courseName: { type: String, default: '' },
    moduleIndex: { type: Number, default: null },
    weekIndex: { type: Number, default: null },
    variant: { type: String, default: 'course-default' },
    level: { type: String, default: '' },
    totalTarget: { type: Number, default: 0 },
    completed: { type: Number, default: 0 },
    status: { type: String, enum: ['pending', 'running', 'completed', 'failed'], default: 'pending' },
    error: { type: String, default: '' },
    startedAt: { type: Date, default: null },
    finishedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

assessmentJobSchema.index({ courseSlug: 1, variant: 1, status: 1 });

module.exports = mongoose.model('AssessmentJob', assessmentJobSchema);
