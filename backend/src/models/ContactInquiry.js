/*
  ContactInquiry model
  - Stores public contact form submissions and status
*/
const mongoose = require('mongoose');

const contactInquirySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    state: {
      type: String,
      trim: true,
      default: '',
    },
    region: {
      type: String,
      required: true,
      trim: true,
    },
    institution: {
      type: String,
      required: true,
      trim: true,
    },
    course: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    qualification: {
      type: String,
      trim: true,
      default: '',
    },
    contactStatus: {
      type: String,
      enum: ['pending', 'contacted', 'unable_to_contact'],
      default: 'pending',
    },
    leadGenerated: {
      type: Boolean,
      default: null,
    },
    inquirySolved: {
      type: Boolean,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: 'contactus-inquiry',
  }
);

module.exports = mongoose.model('ContactInquiry', contactInquirySchema);
