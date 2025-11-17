/*
  Testimonial videos controller
  - Admin: upload/list/update/delete
  - Public: list active videos
*/
const asyncHandler = require('express-async-handler');
const { cloudinary, testimonialsFolder } = require('../config/cloudinary');
const TestimonialVideo = require('../models/TestimonialVideo');

const toPlaybackUrl = (secureUrl) => secureUrl; // passthrough for now

const uploadVideoToCloudinary = (buffer, { folder }) =>
  new Promise((resolve, reject) => {
    const upload = cloudinary.uploader.upload_stream(
      {
        resource_type: 'video',
        folder,
        chunk_size: 6 * 1024 * 1024,
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    upload.end(buffer);
  });

const uploadImageToCloudinary = (buffer, { folder }) =>
  new Promise((resolve, reject) => {
    const upload = cloudinary.uploader.upload_stream(
      {
        resource_type: 'image',
        folder,
        transformation: [{ quality: 'auto:good' }],
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    upload.end(buffer);
  });

const buildPosterUrl = (publicId) =>
  cloudinary.url(`${publicId}.jpg`, {
    resource_type: 'video',
    secure: true,
    transformation: [{ format: 'jpg' }],
  });

const listPublicTestimonials = asyncHandler(async (req, res) => {
  const items = await TestimonialVideo.find({ active: true })
    .sort({ order: 1, createdAt: -1 })
    .select('-__v');

  res.json({
    items: items.map((it) => ({
      id: it._id,
      name: it.name,
      role: it.role,
      publicId: it.publicId,
      playbackUrl: toPlaybackUrl(it.secureUrl),
      thumbnailUrl: it.thumbnailUrl || undefined,
      width: it.width,
      height: it.height,
      duration: it.duration,
    })),
  });
});

const listAdminTestimonials = asyncHandler(async (req, res) => {
  const items = await TestimonialVideo.find({}).sort({ order: 1, createdAt: -1 }).lean();
  res.json({ items });
});

const createTestimonial = asyncHandler(async (req, res) => {
  const { name, role, active, order } = req.body || {};
  const videoFile = (req.files?.video && req.files.video[0]) || req.file;
  const thumbnailFile = req.files?.thumbnail && req.files.thumbnail[0];

  if (!name || !String(name).trim()) {
    res.status(400);
    throw new Error('Name is required');
  }
  if (!videoFile || !videoFile.buffer) {
    res.status(400);
    throw new Error('Video file is required');
  }

  const folder = testimonialsFolder;
  let uploadResult;
  try {
    uploadResult = await uploadVideoToCloudinary(videoFile.buffer, { folder });
  } catch (error) {
    const status = error?.http_code || error?.status || error?.statusCode;
    if (status === 413) {
      res.status(413);
      throw new Error('Video is too large for the current plan. Please upload a smaller file or contact support.');
    }
    throw error;
  }

  let thumbnailUrl = buildPosterUrl(uploadResult.public_id);

  if (thumbnailFile?.buffer) {
    try {
      const thumbnailResult = await uploadImageToCloudinary(thumbnailFile.buffer, { folder });
      thumbnailUrl = thumbnailResult.secure_url || thumbnailUrl;
    } catch (error) {
      // Do not fail the whole request on thumbnail upload issues
      // eslint-disable-next-line no-console
      console.warn('[testimonial] Thumbnail upload failed, falling back to auto-generated frame:', error?.message);
    }
  }

  const doc = await TestimonialVideo.create({
    name: String(name).trim(),
    role: role ? String(role).trim() : undefined,
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
    thumbnailUrl,
  });

  res.status(201).json({ item: doc });
});

const updateTestimonial = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const patch = {};
  if (typeof req.body.name !== 'undefined') patch.name = String(req.body.name).trim();
  if (typeof req.body.role !== 'undefined') patch.role = String(req.body.role).trim();
  if (typeof req.body.active !== 'undefined') patch.active = req.body.active === 'true' || req.body.active === true;
  if (typeof req.body.order !== 'undefined') patch.order = Number(req.body.order) || 0;

  if (req.files?.video?.length) {
    res.status(400);
    throw new Error('Updating testimonial video is not supported. Please delete and re-upload.');
  }

  const thumbnailFile = req.files?.thumbnail && req.files.thumbnail[0];
  if (thumbnailFile?.buffer) {
    try {
      const folder = testimonialsFolder;
      const thumbnailResult = await uploadImageToCloudinary(thumbnailFile.buffer, { folder });
      patch.thumbnailUrl = thumbnailResult.secure_url;
    } catch (error) {
      res.status(400);
      throw new Error(error?.message || 'Thumbnail upload failed');
    }
  } else if (typeof req.body.thumbnailUrl !== 'undefined') {
    patch.thumbnailUrl = String(req.body.thumbnailUrl).trim();
  }

  const updated = await TestimonialVideo.findByIdAndUpdate(id, patch, { new: true });
  if (!updated) {
    res.status(404);
    throw new Error('Item not found');
  }

  res.json({ item: updated });
});

const deleteTestimonial = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const doc = await TestimonialVideo.findById(id);
  if (!doc) {
    res.status(404);
    throw new Error('Item not found');
  }

  try {
    await cloudinary.uploader.destroy(doc.publicId, { resource_type: 'video' });
  } catch (e) {
    // ignore deletion error; item may have been already removed
  }
  await doc.deleteOne();
  res.json({ message: 'Deleted' });
});

module.exports = {
  listPublicTestimonials,
  listAdminTestimonials,
  createTestimonial,
  updateTestimonial,
  deleteTestimonial,
};
