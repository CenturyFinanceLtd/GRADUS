/*
  Banner model
  - Stores Cloudinary metadata for hero/banner images and optional copy
*/
const mongoose = require('mongoose');

const bannerSchema = new mongoose.Schema(
  {
    title: { type: String, trim: true },
    subtitle: { type: String, trim: true },
    description: { type: String, trim: true },
    ctaLabel: { type: String, trim: true },
    ctaUrl: { type: String, trim: true },
    active: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
    imageUrl: { type: String, required: true },
    publicId: { type: String, required: true, unique: true },
    deviceType: {
      type: String,
      enum: ['desktop', 'mobile'],
      default: 'desktop',
    },
    mobileImageUrl: { type: String },
    mobilePublicId: { type: String },
    mobileFormat: { type: String },
    mobileWidth: { type: Number },
    mobileHeight: { type: Number },
    mobileBytes: { type: Number },
    folder: { type: String },
    format: { type: String },
    width: { type: Number },
    height: { type: Number },
    bytes: { type: Number },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Banner', bannerSchema);
