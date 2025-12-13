/*
  JobApplication model
  - Captures a user's application to a job with an optional resume snapshot
*/
const mongoose = require('mongoose');

const jobApplicationSchema = new mongoose.Schema(
  {
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job',
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    resumeSnapshot: {
      type: Object,
      default: {},
    },
    coverLetter: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['submitted', 'review', 'accepted', 'rejected'],
      default: 'submitted',
    },
    appliedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

jobApplicationSchema.index({ job: 1, user: 1 }, { unique: true });

module.exports = mongoose.model('JobApplication', jobApplicationSchema);
