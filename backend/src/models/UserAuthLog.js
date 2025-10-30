/*
  UserAuthLog model
  - Audit log for user authentication events (login, logout, etc.)
*/
const mongoose = require('mongoose');

const userAuthLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      required: true,
      enum: ['LOGIN', 'LOGOUT'],
    },
    userAgent: {
      type: String,
      trim: true,
      maxlength: 500,
      default: '',
    },
    ipAddress: {
      type: String,
      trim: true,
      maxlength: 100,
      default: '',
    },
  },
  {
    timestamps: {
      createdAt: 'createdAt',
      updatedAt: false,
    },
    versionKey: false,
  }
);

userAuthLogSchema.index({ createdAt: -1 });

const UserAuthLog = mongoose.model('UserAuthLog', userAuthLogSchema);

module.exports = UserAuthLog;
