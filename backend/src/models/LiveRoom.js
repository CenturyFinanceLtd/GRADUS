const mongoose = require('mongoose');

const liveRoomSchema = new mongoose.Schema(
  {
    session: { type: mongoose.Schema.Types.ObjectId, ref: 'LiveSession', required: true, index: true },
    name: { type: String, required: true },
    slug: { type: String, required: true, index: true },
  },
  { timestamps: true, collection: 'live_rooms' }
);

liveRoomSchema.index({ session: 1, slug: 1 }, { unique: true });

const LiveRoom = mongoose.model('LiveRoom', liveRoomSchema);

module.exports = { LiveRoom };
