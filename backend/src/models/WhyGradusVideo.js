/*
  WhyGradusVideo model
  - Stores Cloudinary metadata for the hero video displayed beneath the home banner
*/
const mongoose = require('mongoose');

const whyGradusVideoSchema = new mongoose.Schema(
  {
    title: { type: String, trim: true },
    subtitle: { type: String, trim: true },
    description: { type: String, trim: true },
    ctaLabel: { type: String, trim: true },
    ctaHref: { type: String, trim: true },
    active: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
    publicId: { type: String, required: true, unique: true },
    folder: { type: String },
    resourceType: { type: String, default: 'video' },
    format: { type: String },
    width: { type: Number },
    height: { type: Number },
    duration: { type: Number },
    bytes: { type: Number },
    secureUrl: { type: String },
    thumbnailUrl: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model('WhyGradusVideo', whyGradusVideoSchema);

