/*
  LiveSession model
  - Persists live class metadata, host secret, and coarse-grained status
  - Paired with LiveParticipant/LiveChatMessage/LiveHandRaise collections
*/
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const LIVE_SESSION_STATUSES = ['scheduled', 'live', 'ended'];
const SESSION_EXPIRY_SECONDS = 60 * 60 * 24 * 30; // 30 days after ending

const liveSessionSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    status: { type: String, enum: LIVE_SESSION_STATUSES, default: 'scheduled', index: true },
    scheduledFor: { type: Date, default: null, index: true },
    startedAt: { type: Date, default: null },
    endedAt: { type: Date, default: null },
    hostAdminId: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser', default: null, index: true },
    hostDisplayName: { type: String, trim: true },
    hostSecret: { type: String, required: true, index: true },
    courseId: { type: String, default: null, index: true },
    courseSlug: { type: String, default: null, index: true },
    courseName: { type: String, default: null },
    allowStudentAudio: { type: Boolean, default: true },
    allowStudentVideo: { type: Boolean, default: true },
    allowStudentScreenShare: { type: Boolean, default: true },
    waitingRoomEnabled: { type: Boolean, default: false },
    locked: { type: Boolean, default: false },
    passcodeHash: { type: String, default: null },
    meetingToken: { type: String, default: uuidv4, index: true },
    bannedUserIds: { type: [String], default: [] },
    screenShareOwner: { type: String, default: null },
    lastActivityAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true, collection: 'live_sessions' }
);

liveSessionSchema.index({ status: 1, createdAt: -1 });
liveSessionSchema.index(
  { endedAt: 1 },
  {
    expireAfterSeconds: SESSION_EXPIRY_SECONDS,
    partialFilterExpression: { status: 'ended', endedAt: { $type: 'date' } },
  }
);

const LiveSession = mongoose.model('LiveSession', liveSessionSchema);

module.exports = { LiveSession, LIVE_SESSION_STATUSES };
