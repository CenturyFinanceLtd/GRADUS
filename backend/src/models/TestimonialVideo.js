/*
  TestimonialVideo model
  - Stores Cloudinary public id and metadata for video testimonials
*/
const mongoose = require('mongoose');

const testimonialVideoSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    role: { type: String, trim: true },
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

module.exports = mongoose.model('TestimonialVideo', testimonialVideoSchema);

