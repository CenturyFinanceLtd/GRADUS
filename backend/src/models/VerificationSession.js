const mongoose = require('mongoose');

const verificationSessionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['SIGNUP', 'EMAIL_CHANGE', 'ACCOUNT_DELETE'],
      required: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    otpHash: {
      type: String,
      required: true,
      select: false,
    },
    otpExpiresAt: {
      type: Date,
      required: true,
    },
    verificationToken: {
      type: String,
    },
    payload: {
      type: mongoose.Schema.Types.Mixed,
    },
    status: {
      type: String,
      enum: ['OTP_PENDING', 'OTP_VERIFIED', 'COMPLETED'],
      default: 'OTP_PENDING',
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 60 * 60 * 1000),
    },
  },
  { timestamps: true }
);

verificationSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const VerificationSession = mongoose.model('VerificationSession', verificationSessionSchema);

module.exports = VerificationSession;

