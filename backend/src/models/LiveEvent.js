const mongoose = require('mongoose');

const liveEventSchema = new mongoose.Schema(
  {
    session: { type: mongoose.Schema.Types.ObjectId, ref: 'LiveSession', required: true, index: true },
    participantId: { type: String, default: null, index: true },
    role: { type: String, default: null },
    kind: { type: String, required: true, index: true },
    data: { type: Object, default: {} },
    createdAt: { type: Date, default: Date.now, index: true },
  },
  { collection: 'live_events', timestamps: false }
);

liveEventSchema.index({ session: 1, kind: 1, createdAt: -1 });

const LiveEvent = mongoose.model('LiveEvent', liveEventSchema);

module.exports = { LiveEvent };
