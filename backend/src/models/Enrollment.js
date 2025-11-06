/*
  Enrollment model
  - Tracks user enrollments into courses and progress metadata
*/
const mongoose = require('mongoose');

const enrollmentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
      index: true,
    },
    // Enrollment lifecycle
    status: {
      type: String,
      enum: ['ACTIVE', 'CANCELLED'],
      default: 'ACTIVE',
    },
    // Payment lifecycle tracked separately
    paymentStatus: {
      type: String,
      enum: ['PENDING', 'PAID', 'FAILED', 'REFUNDED'],
      default: 'PENDING',
      index: true,
    },
    paymentReference: {
      // Transaction/payment id from gateway (e.g., razorpay_payment_id)
      type: String,
      default: '',
      trim: true,
    },
    paidAt: {
      type: Date,
      default: null,
    },

    // Pricing breakdown (in INR)
    currency: { type: String, default: 'INR' },
    priceBase: { type: Number, default: 0 }, // course price before tax
    priceTax: { type: Number, default: 0 }, // GST amount
    priceTotal: { type: Number, default: 0 }, // final amount to be paid

    // Payment gateway metadata
    paymentGateway: { type: String, default: 'RAZORPAY' },
    razorpayOrderId: { type: String, default: '', trim: true },
    razorpayPaymentId: { type: String, default: '', trim: true },
    razorpaySignature: { type: String, default: '', trim: true },
    receipt: { type: String, default: '', trim: true },
  },
  { timestamps: true, collection: 'courses-enrollments' }
);

enrollmentSchema.index({ user: 1, course: 1 }, { unique: true });

const Enrollment = mongoose.model('Enrollment', enrollmentSchema);

module.exports = Enrollment;
