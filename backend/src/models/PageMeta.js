/*
  Page meta model
  - Stores per-path SEO metadata editable from the admin portal
  - Includes a single default fallback entry (isDefault: true)
*/
const mongoose = require('mongoose');

const pageMetaSchema = new mongoose.Schema(
  {
    path: { type: String, trim: true },
    title: { type: String, trim: true },
    description: { type: String, trim: true },
    keywords: { type: String, trim: true },
    robots: { type: String, trim: true },
    active: { type: Boolean, default: true },
    isDefault: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser' },
  },
  { timestamps: true }
);

pageMetaSchema.index(
  { path: 1 },
  {
    unique: true,
    partialFilterExpression: { isDefault: false },
  }
);

pageMetaSchema.index(
  { isDefault: 1 },
  {
    unique: true,
    partialFilterExpression: { isDefault: true },
  }
);

module.exports = mongoose.model('PageMeta', pageMetaSchema);
