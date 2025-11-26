const mongoose = require('mongoose');

const liveRecordingSchema = new mongoose.Schema(
  {
    session: { type: mongoose.Schema.Types.ObjectId, ref: 'LiveSession', required: true, index: true },
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser', required: true, index: true },
    participantId: { type: String, default: null },
    url: { type: String, required: true },
    publicId: { type: String, required: true, index: true },
    bytes: { type: Number, default: null },
    durationMs: { type: Number, default: null },
    format: { type: String, default: null },
    createdAt: { type: Date, default: Date.now },
  },
  { collection: 'live_recordings' }
);

liveRecordingSchema.index({ session: 1, createdAt: -1 });

const LiveRecording = mongoose.model('LiveRecording', liveRecordingSchema);

module.exports = { LiveRecording };
