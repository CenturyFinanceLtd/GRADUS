/*
  LiveChatMessage model
  - Persists chat for a live session
*/
const mongoose = require('mongoose');

const CHAT_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

const liveChatMessageSchema = new mongoose.Schema(
  {
    session: { type: mongoose.Schema.Types.ObjectId, ref: 'LiveSession', required: true, index: true },
    participant: { type: mongoose.Schema.Types.ObjectId, ref: 'LiveParticipant', default: null, index: true },
    senderRole: { type: String, enum: ['instructor', 'student'], default: 'student' },
    senderDisplayName: { type: String, trim: true },
    message: { type: String, required: true, trim: true, maxlength: 2000 },
  },
  { timestamps: true, collection: 'live_chat_messages' }
);

liveChatMessageSchema.index({ createdAt: 1 }, { expireAfterSeconds: CHAT_TTL_SECONDS });

const LiveChatMessage = mongoose.model('LiveChatMessage', liveChatMessageSchema);

module.exports = { LiveChatMessage };
