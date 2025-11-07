/*
  Testimonial videos controller
  - Admin: upload/list/update/delete
  - Public: list active videos
*/
const asyncHandler = require('express-async-handler');
const { cloudinary, testimonialsFolder } = require('../config/cloudinary');
const TestimonialVideo = require('../models/TestimonialVideo');

const toPlaybackUrl = (secureUrl) => secureUrl; // passthrough for now

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

const uploadToCloudinary = (buffer, { folder }) =>
  new Promise((resolve, reject) => {
    const upload = cloudinary.uploader.upload_stream(
      { resource_type: 'video', folder },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    upload.end(buffer);
  });

const createTestimonial = asyncHandler(async (req, res) => {
  const { name, role, active, order } = req.body || {};

  if (!name || !String(name).trim()) {
    res.status(400);
    throw new Error('Name is required');
  }
  if (!req.file || !req.file.buffer) {
    res.status(400);
    throw new Error('Video file is required');
  }

  const folder = testimonialsFolder;
  const uploadResult = await uploadToCloudinary(req.file.buffer, { folder });

  const posterUrl = cloudinary.url(uploadResult.public_id + '.jpg', {
    resource_type: 'video',
    secure: true,
    transformation: [{ format: 'jpg' }],
  });

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
    thumbnailUrl: posterUrl,
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

