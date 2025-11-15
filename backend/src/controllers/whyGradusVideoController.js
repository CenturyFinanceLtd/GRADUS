/*
  Why Gradus video controller
  - Handles Cloudinary-backed uploads for the hero "Why Gradus" section
*/
const asyncHandler = require('express-async-handler');
const { cloudinary, whyGradusVideoFolder } = require('../config/cloudinary');
const WhyGradusVideo = require('../models/WhyGradusVideo');

const mapItem = (doc) => ({
  id: doc._id,
  title: doc.title,
  subtitle: doc.subtitle,
  description: doc.description,
  ctaLabel: doc.ctaLabel,
  ctaHref: doc.ctaHref,
  secureUrl: doc.secureUrl,
  thumbnailUrl: doc.thumbnailUrl,
  duration: doc.duration,
  width: doc.width,
  height: doc.height,
});

const listPublicWhyGradusVideo = asyncHandler(async (req, res) => {
  const doc = await WhyGradusVideo.findOne({ active: true }).sort({ order: 1, createdAt: -1 }).lean();
  res.json({ item: doc ? mapItem(doc) : null });
});

const listAdminWhyGradusVideo = asyncHandler(async (req, res) => {
  const items = await WhyGradusVideo.find({}).sort({ order: 1, createdAt: -1 }).lean();
  res.json({ items });
});

const uploadToCloudinary = (buffer) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'video',
        folder: whyGradusVideoFolder,
        chunk_size: 6 * 1024 * 1024,
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    stream.end(buffer);
  });

const createWhyGradusVideo = asyncHandler(async (req, res) => {
  const { title, subtitle, description, ctaLabel, ctaHref, active, order } = req.body || {};
  if (!req.file || !req.file.buffer) {
    res.status(400);
    throw new Error('Video file is required');
  }

  let uploadResult;
  try {
    uploadResult = await uploadToCloudinary(req.file.buffer);
  } catch (error) {
    const status = error?.http_code || error?.status || error?.statusCode;
    if (status === 413) {
      res.status(413);
      throw new Error('Video is too large for the current plan. Please upload a smaller file.');
    }
    throw error;
  }

  const posterUrl = cloudinary.url(uploadResult.public_id + '.jpg', {
    resource_type: 'video',
    secure: true,
    transformation: [{ format: 'jpg' }],
  });

  const doc = await WhyGradusVideo.create({
    title: title ? String(title).trim() : undefined,
    subtitle: subtitle ? String(subtitle).trim() : undefined,
    description: description ? String(description).trim() : undefined,
    ctaLabel: ctaLabel ? String(ctaLabel).trim() : undefined,
    ctaHref: ctaHref ? String(ctaHref).trim() : undefined,
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

const updateWhyGradusVideo = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const patch = {};
  ['title', 'subtitle', 'description', 'ctaLabel', 'ctaHref'].forEach((field) => {
    if (typeof req.body[field] !== 'undefined') {
      patch[field] = String(req.body[field]).trim();
    }
  });
  if (typeof req.body.active !== 'undefined') {
    patch.active = req.body.active === 'true' || req.body.active === true;
  }
  if (typeof req.body.order !== 'undefined') {
    patch.order = Number(req.body.order) || 0;
  }

  const updated = await WhyGradusVideo.findByIdAndUpdate(id, patch, { new: true });
  if (!updated) {
    res.status(404);
    throw new Error('Item not found');
  }
  res.json({ item: updated });
});

const deleteWhyGradusVideo = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const doc = await WhyGradusVideo.findById(id);
  if (!doc) {
    res.status(404);
    throw new Error('Item not found');
  }

  try {
    await cloudinary.uploader.destroy(doc.publicId, { resource_type: 'video' });
  } catch (err) {
    // ignore
  }

  await doc.deleteOne();
  res.json({ message: 'Deleted' });
});

module.exports = {
  listPublicWhyGradusVideo,
  listAdminWhyGradusVideo,
  createWhyGradusVideo,
  updateWhyGradusVideo,
  deleteWhyGradusVideo,
};

