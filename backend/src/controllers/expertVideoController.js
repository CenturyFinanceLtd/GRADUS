/*
  Expert video controller
  - Cloudinary-backed CRUD for expert highlight videos
*/
const asyncHandler = require('express-async-handler');
const { cloudinary, expertVideosFolder } = require('../config/cloudinary');
const ExpertVideo = require('../models/ExpertVideo');

const toPlaybackUrl = (secureUrl) => secureUrl;

const mapItem = (doc) => ({
  id: doc._id,
  title: doc.title,
  subtitle: doc.subtitle,
  description: doc.description,
  order: doc.order,
  active: doc.active,
  playbackUrl: toPlaybackUrl(doc.secureUrl),
  thumbnailUrl: doc.thumbnailUrl,
  duration: doc.duration,
  width: doc.width,
  height: doc.height,
});

const listPublicExpertVideos = asyncHandler(async (req, res) => {
  const items = await ExpertVideo.find({ active: true })
    .sort({ order: 1, createdAt: -1 })
    .select('-__v');

  res.json({ items: items.map(mapItem) });
});

const listAdminExpertVideos = asyncHandler(async (req, res) => {
  const items = await ExpertVideo.find({}).sort({ order: 1, createdAt: -1 }).lean();
  res.json({ items });
});

const uploadToCloudinary = (buffer, { folder }) =>
  new Promise((resolve, reject) => {
    const upload = cloudinary.uploader.upload_stream(
      {
        resource_type: 'video',
        folder,
        chunk_size: 6 * 1024 * 1024, // 6MB chunks to support large files
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    upload.end(buffer);
  });

const createExpertVideo = asyncHandler(async (req, res) => {
  const { title, subtitle, description, active, order } = req.body || {};

  if (!title || !String(title).trim()) {
    res.status(400);
    throw new Error('Title is required');
  }
  if (!req.file || !req.file.buffer) {
    res.status(400);
    throw new Error('Video file is required');
  }

  let uploadResult;
  try {
    uploadResult = await uploadToCloudinary(req.file.buffer, { folder: expertVideosFolder });
  } catch (error) {
    const status = error?.http_code || error?.status || error?.statusCode;
    if (status === 413) {
      res.status(413);
      throw new Error('Video is too large for the current plan. Please upload a file under 200 MB or contact support for an increased limit.');
    }
    if (error?.message?.toLowerCase().includes('file size too large')) {
      res.status(413);
      throw new Error('Video exceeds the maximum upload size allowed by Cloudinary.');
    }
    throw error;
  }

  const posterUrl = cloudinary.url(uploadResult.public_id + '.jpg', {
    resource_type: 'video',
    secure: true,
    transformation: [{ format: 'jpg' }],
  });

  const doc = await ExpertVideo.create({
    title: String(title).trim(),
    subtitle: subtitle ? String(subtitle).trim() : undefined,
    description: description ? String(description).trim() : undefined,
    active: active === 'false' ? false : active === 'true' ? true : Boolean(active ?? true),
    order: typeof order !== 'undefined' ? Number(order) : 0,
    publicId: uploadResult.public_id,
    folder: uploadResult.folder,
    resourceType: uploadResult.resource_type,
    format: uploadResult.format,
    width: uploadResult.width,
    height: uploadResult.height,
    duration: uploadResult.duration,
    bytes: uploadResult.bytes,
    secureUrl: uploadResult.secure_url,
    thumbnailUrl: posterUrl,
  });

  res.status(201).json({ item: doc });
});

const updateExpertVideo = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const patch = {};

  if (typeof req.body.title !== 'undefined') patch.title = String(req.body.title).trim();
  if (typeof req.body.subtitle !== 'undefined') patch.subtitle = String(req.body.subtitle).trim();
  if (typeof req.body.description !== 'undefined') patch.description = String(req.body.description).trim();
  if (typeof req.body.active !== 'undefined') patch.active = req.body.active === 'true' || req.body.active === true;
  if (typeof req.body.order !== 'undefined') patch.order = Number(req.body.order) || 0;

  const updated = await ExpertVideo.findByIdAndUpdate(id, patch, { new: true });
  if (!updated) {
    res.status(404);
    throw new Error('Item not found');
  }
  res.json({ item: updated });
});

const deleteExpertVideo = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const doc = await ExpertVideo.findById(id);
  if (!doc) {
    res.status(404);
    throw new Error('Item not found');
  }

  try {
    await cloudinary.uploader.destroy(doc.publicId, { resource_type: 'video' });
  } catch (e) {
    // ignore
  }

  await doc.deleteOne();
  res.json({ message: 'Deleted' });
});

module.exports = {
  listPublicExpertVideos,
  listAdminExpertVideos,
  createExpertVideo,
  updateExpertVideo,
  deleteExpertVideo,
};
