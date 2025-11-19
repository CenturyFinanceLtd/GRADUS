/*
  EventRegistration model
  - Stores event registration submissions separately from contact inquiries
*/
const mongoose = require('mongoose');

const eventRegistrationSchema = new mongoose.Schema(
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
      required: true,
      trim: true,
    },
    qualification: {
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
    consent: {
      type: Boolean,
      default: false,
    },
    eventDetails: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    sheetRowIndex: {
      type: Number,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: 'event-registrations',
  }
);

module.exports = mongoose.model('EventRegistration', eventRegistrationSchema);
