/*
  VerificationSession model
  - Temporary state for OTP-based verification flows (signup, reset, etc.)
*/
const mongoose = require('mongoose');

const verificationSessionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['SIGNUP', 'EMAIL_CHANGE', 'PASSWORD_RESET', 'ACCOUNT_DELETE', 'ADMIN_SIGNUP', 'ADMIN_EMAIL_CHANGE', 'ADMIN_PASSWORD_RESET'],
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
      select: false,
    },
    otpExpiresAt: {
      type: Date,
    },
    verificationToken: {
      type: String,
    },
    payload: {
      type: mongoose.Schema.Types.Mixed,
    },
    status: {
      type: String,
      enum: [
        'OTP_PENDING',
        'OTP_VERIFIED',
        'COMPLETED',
        'APPROVAL_PENDING',
        'APPROVED',
        'REJECTED',
        'CURRENT_OTP_PENDING',
        'NEW_OTP_PENDING',
      ],
      default: 'OTP_PENDING',
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
    approvalToken: {
      type: String,
    },
    approvalRespondedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

verificationSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const VerificationSession = mongoose.model('VerificationSession', verificationSessionSchema);

module.exports = VerificationSession;
