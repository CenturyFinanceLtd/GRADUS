/*
  CourseDetail model
  - Stores deep module/week/lecture level data per course
*/
const mongoose = require('mongoose');

const lectureSchema = new mongoose.Schema(
  {
    lectureId: { type: String, trim: true, required: true },
    title: { type: String, trim: true, default: '' },
    duration: { type: String, trim: true, default: '' },
    description: { type: String, trim: true, default: '' },
    video: {
      url: { type: String, trim: true, default: '' },
      publicId: { type: String, trim: true, default: '' },
      folder: { type: String, trim: true, default: '' },
      assetType: { type: String, trim: true, default: 'video' },
      duration: { type: Number, default: 0 },
      bytes: { type: Number, default: 0 },
      format: { type: String, trim: true, default: '' },
    },
    notes: {
      publicId: { type: String, trim: true, default: '' },
      fileName: { type: String, trim: true, default: '' },
      folder: { type: String, trim: true, default: '' },
      bytes: { type: Number, default: 0 },
      format: { type: String, trim: true, default: '' },
      pages: { type: Number, default: 0 },
      accessMode: { type: String, trim: true, default: 'authenticated' },
      uploadedAt: { type: Date },
    },
  },
  { _id: false }
);

const sectionSchema = new mongoose.Schema(
  {
    sectionId: { type: String, trim: true, required: true },
    title: { type: String, trim: true, default: '' },
    subtitle: { type: String, trim: true, default: '' },
    summary: { type: String, trim: true, default: '' },
    lectures: { type: [lectureSchema], default: [] },
    assignments: { type: [String], default: [] },
    quizzes: { type: [String], default: [] },
    projects: { type: [String], default: [] },
    outcomes: { type: [String], default: [] },
    notes: { type: [String], default: [] },
  },
  { _id: false }
);

const moduleDetailSchema = new mongoose.Schema(
  {
    moduleId: { type: String, trim: true, required: true },
    order: { type: Number, default: 0 },
    moduleLabel: { type: String, trim: true, default: '' },
    title: { type: String, trim: true, default: '' },
    weeksLabel: { type: String, trim: true, default: '' },
    summary: { type: String, trim: true, default: '' },
    topicsCovered: { type: [String], default: [] },
    outcomes: { type: [String], default: [] },
    variant: { type: String, trim: true, default: 'default' }, // e.g., default or capstone
    sections: { type: [sectionSchema], default: [] },
    capstone: {
      summary: { type: String, trim: true, default: '' },
      deliverables: { type: [String], default: [] },
      rubric: { type: [String], default: [] },
    },
  },
  { _id: false }
);

const courseDetailSchema = new mongoose.Schema(
  {
    courseSlug: { type: String, required: true, trim: true, unique: true },
    courseName: { type: String, trim: true },
    programme: {
      type: String,
      enum: ['Gradus X', 'Gradus Finlit', 'Gradus Lead'],
      default: 'Gradus X',
    },
    programmeSlug: { type: String, trim: true, default: '' },
    modules: { type: [moduleDetailSchema], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model('CourseDetail', courseDetailSchema);
