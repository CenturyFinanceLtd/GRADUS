/*
  AssignmentSubmission model
  - Stores learner submissions and grading feedback per assignment
*/
const mongoose = require('mongoose');

const assignmentSubmissionSchema = new mongoose.Schema(
  {
    assignment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Assignment',
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    content: {
      type: String,
      trim: true,
    },
    attachmentUrl: {
      type: String,
      trim: true,
    },
    attachmentName: {
      type: String,
      trim: true,
    },
    attachmentType: {
      type: String,
      trim: true,
    },
    attachmentSize: {
      type: Number,
      default: null,
    },
    attachmentData: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['pending', 'submitted', 'graded'],
      default: 'submitted',
    },
    score: {
      type: Number,
      default: null,
    },
    maxPoints: {
      type: Number,
      default: null,
    },
    feedback: {
      type: String,
      trim: true,
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
    gradedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

assignmentSubmissionSchema.index({ assignment: 1, user: 1 }, { unique: true });

module.exports = mongoose.model('AssignmentSubmission', assignmentSubmissionSchema);
