/*
  PartnerLogo model
  - Stores Cloudinary metadata for partner/placement logos
  - Used to drive public partner carousels from the admin panel
*/
const mongoose = require('mongoose');

const normalizePrograms = (value) => {
  if (!value) return [];
  const arr = Array.isArray(value) ? value : String(value || '')
    .split(',')
    .map((entry) => entry.trim());

  return arr.filter(Boolean);
};

const partnerLogoSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    website: { type: String, trim: true },
    programs: {
      type: [String],
      default: [],
      set: (value) => normalizePrograms(value),
    },
    active: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
    logoUrl: { type: String, required: true },
    // Cloudinary metadata
    publicId: { type: String, required: true, unique: true },
    folder: { type: String },
    format: { type: String },
    width: { type: Number },
    height: { type: Number },
    bytes: { type: Number },
  },
  { timestamps: true }
);

module.exports = mongoose.model('PartnerLogo', partnerLogoSchema);
