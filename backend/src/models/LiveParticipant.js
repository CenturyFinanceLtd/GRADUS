/*
  LiveParticipant model
  - Tracks attendees for a live session and their signaling tokens
*/
const mongoose = require('mongoose');

const participantSchema = new mongoose.Schema(
  {
    session: { type: mongoose.Schema.Types.ObjectId, ref: 'LiveSession', required: true, index: true },
    role: { type: String, enum: ['instructor', 'student'], required: true, index: true },
    displayName: { type: String, trim: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser', default: null, index: true },
    joinedAt: { type: Date, default: Date.now, index: true },
    lastSeenAt: { type: Date, default: Date.now },
    signalingKey: { type: String, required: true, index: true },
    connected: { type: Boolean, default: false, index: true },
    waiting: { type: Boolean, default: false, index: true },
    roomId: { type: String, default: null, index: true },
    metadata: { type: Object, default: {} },
  },
  { timestamps: true, collection: 'live_participants' }
);

participantSchema.index({ session: 1, role: 1 });
participantSchema.index(
  { lastSeenAt: 1 },
  {
    expireAfterSeconds: 60 * 60 * 24 * 7, // prune disconnected participants after 7 days
    partialFilterExpression: { connected: false },
  }
);

const LiveParticipant = mongoose.model('LiveParticipant', participantSchema);

module.exports = { LiveParticipant };
