/*
  ExpertVideo model
  - Stores Cloudinary metadata for expert insight videos
*/
const mongoose = require('mongoose');

const expertVideoSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    subtitle: { type: String, trim: true },
    description: { type: String, trim: true },
    active: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
    // Cloudinary fields
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

module.exports = mongoose.model('ExpertVideo', expertVideoSchema);

