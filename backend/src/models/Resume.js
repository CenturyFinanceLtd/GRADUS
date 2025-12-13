/*
  Resume model
  - Stores a user's resume data for auto-fill and export
*/
const mongoose = require('mongoose');

const resumeSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    template: {
      type: String,
      default: 'classic',
      trim: true,
    },
    data: {
      type: Object,
      default: {},
    },
    isPublished: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Resume', resumeSchema);
