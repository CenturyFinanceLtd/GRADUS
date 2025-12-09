/*
  SiteVisit model
  - Stores anonymized visit/event analytics from the public site
*/
const mongoose = require('mongoose');

const siteVisitSchema = new mongoose.Schema(
  {
    path: {
      type: String,
      required: true,
      trim: true,
      maxlength: 300,
    },
    pageTitle: {
      type: String,
      trim: true,
      maxlength: 300,
    },
    referrer: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    userAgent: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    ipHash: {
      type: String,
      index: true,
      sparse: true,
      maxlength: 128,
    },
    sessionId: {
      type: String,
      index: true,
      sparse: true,
      maxlength: 128,
    },
    visitedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    country: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    region: {
      type: String, // State/Province code or name
      trim: true,
      maxlength: 100,
    },
    city: {
      type: String,
      trim: true,
      maxlength: 100,
    },
  },
  { versionKey: false }
);

siteVisitSchema.index({ path: 1, visitedAt: -1 });
siteVisitSchema.index({ visitedAt: -1, ipHash: 1 });

const SiteVisit = mongoose.model('SiteVisit', siteVisitSchema);

module.exports = SiteVisit;
