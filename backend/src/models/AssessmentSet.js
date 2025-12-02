/*
  AssessmentSet model
  - Stores AI-generated multiple-choice assessments per course
*/
const mongoose = require('mongoose');

const optionSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, trim: true },
    label: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const questionSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, trim: true },
    prompt: { type: String, required: true, trim: true },
    options: { type: [optionSchema], default: [] },
    correctOptionId: { type: String, required: true, trim: true },
    explanation: { type: String, trim: true, default: '' },
    tryItTemplate: { type: String, trim: true, default: '' },
  },
  { _id: false }
);

const assessmentSetSchema = new mongoose.Schema(
  {
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
    courseSlug: { type: String, required: true, trim: true, index: true },
    programmeSlug: { type: String, trim: true, default: '' },
    courseName: { type: String, trim: true, default: '' },
    moduleIndex: { type: Number, default: null },
    weekIndex: { type: Number, default: null },
    moduleTitle: { type: String, trim: true, default: '' },
    weekTitle: { type: String, trim: true, default: '' },
    title: { type: String, required: true, trim: true },
    level: { type: String, trim: true, default: '' },
    summary: { type: String, trim: true, default: '' },
    tags: { type: [String], default: [] },
    questions: { type: [questionSchema], default: [] },
    source: { type: String, trim: true, default: 'ai' }, // ai/manual/imported
    variant: { type: String, trim: true, default: 'course-default' }, // allow multiple sets per course
    model: { type: String, trim: true, default: '' },
    usage: {
      promptTokens: { type: Number, default: 0 },
      completionTokens: { type: Number, default: 0 },
      totalTokens: { type: Number, default: 0 },
    },
    generatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

assessmentSetSchema.index({ courseSlug: 1, variant: 1 }, { unique: true });

module.exports = mongoose.model('AssessmentSet', assessmentSetSchema);
