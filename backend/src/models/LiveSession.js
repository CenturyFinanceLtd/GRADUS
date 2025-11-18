/*
  LiveSession model
  - Tracks instructor-led live classes hosted from the admin portal
  - Stores course linkage, host metadata, and streaming status
*/
const mongoose = require('mongoose');

const { Schema } = mongoose;

const liveSessionSchema = new Schema(
  {
    course: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    courseTitle: { type: String, required: true },
    courseSlug: { type: String },
    title: { type: String, required: true },
    description: { type: String },
    status: { type: String, enum: ['ready', 'live', 'ended'], default: 'ready' },
    scheduledAt: { type: Date },
    startedAt: { type: Date },
    endedAt: { type: Date },
    host: { type: Schema.Types.ObjectId, ref: 'AdminUser' },
    hostName: { type: String },
    playbackUrl: { type: String },
    ingestEndpoint: { type: String },
    streamKey: { type: String },
    viewerCode: { type: String, unique: true, sparse: true },
    publishMode: { type: String, default: 'browser_webrtc' },
  },
  {
    timestamps: true,
  }
);

liveSessionSchema.index({ course: 1, status: 1 });
liveSessionSchema.index({ viewerCode: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('LiveSession', liveSessionSchema);

