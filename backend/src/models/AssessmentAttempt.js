/*
  AssessmentAttempt model
  - Stores a learner's one-time attempt for a module/week assessment
  - Captures shuffled question subset, answers, and score
*/
const mongoose = require('mongoose');

const attemptOptionSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, trim: true },
    label: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const attemptQuestionSchema = new mongoose.Schema(
  {
    questionId: { type: String, required: true, trim: true },
    prompt: { type: String, required: true, trim: true },
    options: { type: [attemptOptionSchema], default: [] },
    correctOptionId: { type: String, required: true, trim: true },
    selectedOptionId: { type: String, trim: true, default: '' },
    isCorrect: { type: Boolean, default: null },
  },
  { _id: false }
);

const assessmentAttemptSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
    courseSlug: { type: String, required: true, trim: true, index: true },
    programmeSlug: { type: String, trim: true, default: '' },
    courseName: { type: String, trim: true, default: '' },
    moduleIndex: { type: Number, required: true },
    weekIndex: { type: Number, required: true },
    moduleTitle: { type: String, trim: true, default: '' },
    weekTitle: { type: String, trim: true, default: '' },
    status: { type: String, enum: ['in-progress', 'submitted'], default: 'in-progress' },
    questions: { type: [attemptQuestionSchema], default: [] },
    questionPoolSize: { type: Number, default: 0 },
    perAttemptCount: { type: Number, default: 10 },
    score: { type: Number, default: 0 },
    totalQuestions: { type: Number, default: 0 },
    startedAt: { type: Date, default: Date.now },
    submittedAt: { type: Date },
  },
  { timestamps: true }
);

assessmentAttemptSchema.index(
  { userId: 1, courseSlug: 1, moduleIndex: 1, weekIndex: 1 },
  { unique: false }
);

module.exports = mongoose.model('AssessmentAttempt', assessmentAttemptSchema);
