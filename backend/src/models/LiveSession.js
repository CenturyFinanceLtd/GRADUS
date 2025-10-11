const mongoose = require('mongoose');

const liveSessionParticipantSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['INVITED', 'JOINED', 'LEFT'],
      default: 'INVITED',
    },
    accumulatedWatchTimeMs: {
      type: Number,
      default: 0,
    },
    attendancePercentage: {
      type: Number,
      default: 0,
    },
    joinEvents: [
      {
        joinedAt: { type: Date, required: true },
        leftAt: { type: Date },
        watchTimeMs: { type: Number, default: 0 },
        _id: false,
      },
    ],
    lastJoinedAt: {
      type: Date,
      default: null,
    },
  },
  { _id: false }
);

const liveSessionSchema = new mongoose.Schema(
  {
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
      index: true,
    },
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AdminUser',
      required: true,
      index: true,
    },
    title: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    provider: {
      type: String,
      enum: ['teams', 'zoom'],
      default: 'teams',
      lowercase: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['SCHEDULED', 'LIVE', 'ENDED', 'CANCELLED'],
      default: 'SCHEDULED',
      index: true,
    },
    scheduledStart: {
      type: Date,
      required: true,
    },
    durationMinutes: {
      type: Number,
      default: 60,
      min: 10,
    },
    actualStart: {
      type: Date,
    },
    actualEnd: {
      type: Date,
    },
    meeting: {
      meetingId: { type: String, trim: true },
      joinUrl: { type: String, trim: true },
      startUrl: { type: String, trim: true },
      password: { type: String, trim: true },
      organizerEmail: { type: String, trim: true },
    },
    meetingCode: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
      default: () => `LS-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8).toUpperCase()}`,
    },
    notifications: {
      emailSentAt: { type: Date },
      realtimeSentAt: { type: Date },
    },
    expectedWatchTimeMs: {
      type: Number,
      default: 0,
    },
    participants: {
      type: [liveSessionParticipantSchema],
      default: [],
    },
    recordingUrl: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

liveSessionSchema.index({ course: 1, status: 1 });
liveSessionSchema.index({ scheduledStart: -1 });

const LiveSession = mongoose.model('LiveSession', liveSessionSchema);

module.exports = LiveSession;
