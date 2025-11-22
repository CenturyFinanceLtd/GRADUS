/*
  Why Gradus video controller
  - Handles Cloudinary-backed uploads for the hero "Why Gradus" section
*/
const asyncHandler = require('express-async-handler');
const fs = require('fs');
const { cloudinary, whyGradusVideoFolder } = require('../config/cloudinary');
const WhyGradusVideo = require('../models/WhyGradusVideo');

const VIDEO_LIMIT_MB = Number.isFinite(Number(process.env.VIDEO_MAX_SIZE_MB))
  ? Number(process.env.VIDEO_MAX_SIZE_MB)
  : 2048;
const CLOUDINARY_CHUNK_BYTES = 20 * 1024 * 1024; // 20MB chunks to support large files

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

const cleanupTempFile = async (filePath) => {
  if (!filePath) return;
  try {
    await fs.promises.unlink(filePath);
  } catch (_) {
    // ignore cleanup errors
  }
};

const uploadToCloudinary = (filePath) =>
  new Promise((resolve, reject) => {
    let settled = false;
    const finish = (err, result) => {
      if (settled) return;
      settled = true;
      if (err) return reject(err);
      resolve(result);
    };

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'video',
        folder: whyGradusVideoFolder,
        chunk_size: CLOUDINARY_CHUNK_BYTES,
      },
      (error, result) => finish(error, result)
    );

    const fileStream = fs.createReadStream(filePath);
    const handleError = (err) => {
      if (settled) return;
      settled = true;
      uploadStream.destroy?.();
      fileStream.destroy?.();
      reject(err);
    };

    fileStream.on('error', handleError);
    uploadStream.on('error', handleError);
    fileStream.pipe(uploadStream);
  });

const createWhyGradusVideo = asyncHandler(async (req, res) => {
  const { title, subtitle, description, ctaLabel, ctaHref, active, order } = req.body || {};
  if (!req.file || !req.file.path) {
    res.status(400);
    throw new Error('Video file is required');
  }

  let uploadResult;
  try {
    uploadResult = await uploadToCloudinary(req.file.path);
  } catch (error) {
    const status = error?.http_code || error?.status || error?.statusCode;
    if (status === 413) {
      res.status(413);
      const limitText = Number.isFinite(VIDEO_LIMIT_MB) ? `${VIDEO_LIMIT_MB} MB` : 'the configured maximum size';
      throw new Error(`Video is too large. Maximum allowed size is ${limitText}. If the file is within the limit, your Cloudinary plan or reverse proxy may need a higher cap.`);
    }
    throw error;
  } finally {
    await cleanupTempFile(req.file?.path);
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
