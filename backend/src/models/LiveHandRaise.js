/*
  LiveHandRaise model
  - Tracks hand-raise lifecycle for session participants
*/
const mongoose = require('mongoose');

const HAND_RAISE_TTL_SECONDS = 60 * 60 * 24 * 7; // cleanup after 7 days

const liveHandRaiseSchema = new mongoose.Schema(
  {
    session: { type: mongoose.Schema.Types.ObjectId, ref: 'LiveSession', required: true, index: true },
    participant: { type: mongoose.Schema.Types.ObjectId, ref: 'LiveParticipant', required: true, index: true },
    state: { type: String, enum: ['raised', 'lowered', 'resolved'], default: 'raised', index: true },
  },
  { timestamps: true, collection: 'live_hand_raises' }
);

liveHandRaiseSchema.index({ createdAt: 1 }, { expireAfterSeconds: HAND_RAISE_TTL_SECONDS });

const LiveHandRaise = mongoose.model('LiveHandRaise', liveHandRaiseSchema);

module.exports = { LiveHandRaise };
