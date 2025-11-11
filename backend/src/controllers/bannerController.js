/*
  Banner controller
  - Admin CRUD endpoints with Cloudinary image uploads
  - Public list endpoint consumed by the marketing site
*/
const asyncHandler = require('express-async-handler');
const { cloudinary, bannerImagesFolder } = require('../config/cloudinary');
const Banner = require('../models/Banner');

const uploadImageBuffer = (buffer, { folder }) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { resource_type: 'image', folder, overwrite: false },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    stream.end(buffer);
  });

const serializeBanner = (doc) => ({
  id: doc._id,
  title: doc.title || '',
  subtitle: doc.subtitle || '',
  description: doc.description || '',
  ctaLabel: doc.ctaLabel || '',
  ctaUrl: doc.ctaUrl || '',
  active: Boolean(doc.active),
  order: doc.order || 0,
  imageUrl: doc.imageUrl,
  desktopImageUrl: doc.imageUrl,
  mobileImageUrl: doc.mobileImageUrl || '',
  });

const getUploadedFile = (req, fieldName) => {
  if (req.files && Array.isArray(req.files[fieldName]) && req.files[fieldName][0]) {
    return req.files[fieldName][0];
  }
  return null;
};

const destroyImageIfExists = async (publicId) => {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
  } catch (e) {
    // Ignore cleanup issues
  }
};

// Public: GET /api/banners
const listPublicBanners = asyncHandler(async (req, res) => {
  const items = await Banner.find({ active: true })
    .sort({ order: 1, createdAt: -1 })
    .select('-__v -updatedAt');

  res.json({
    items: items.map(serializeBanner),
  });
});

// Admin: GET /api/admin/banners
const listAdminBanners = asyncHandler(async (req, res) => {
  const items = await Banner.find({}).sort({ order: 1, createdAt: -1 }).lean();
  res.json({ items });
});

// Admin: POST /api/admin/banners (multipart/form-data)
const createBanner = asyncHandler(async (req, res) => {
  const { title, subtitle, description, ctaLabel, ctaUrl, order, active } = req.body || {};
  const desktopFile =
    getUploadedFile(req, 'desktopImage') ||
    getUploadedFile(req, 'image') ||
    req.file;
  const mobileFile = getUploadedFile(req, 'mobileImage');

  if (!desktopFile || !desktopFile.buffer) {
    res.status(400);
    throw new Error('Desktop banner image (field: desktopImage) is required');
  }

  const desktopUpload = await uploadImageBuffer(desktopFile.buffer, { folder: bannerImagesFolder });
  let mobileUpload = null;
  if (mobileFile && mobileFile.buffer) {
    mobileUpload = await uploadImageBuffer(mobileFile.buffer, { folder: bannerImagesFolder });
  }

  const doc = await Banner.create({
    title: title ? String(title).trim() : undefined,
    subtitle: subtitle ? String(subtitle).trim() : undefined,
    description: description ? String(description).trim() : undefined,
    ctaLabel: ctaLabel ? String(ctaLabel).trim() : undefined,
    ctaUrl: ctaUrl ? String(ctaUrl).trim() : undefined,
    order: typeof order !== 'undefined' ? Number(order) : 0,
    active: typeof active !== 'undefined' ? active === 'true' || active === true : true,
    imageUrl: desktopUpload.secure_url,
    publicId: desktopUpload.public_id,
    folder: desktopUpload.folder,
    format: desktopUpload.format,
    width: desktopUpload.width,
    height: desktopUpload.height,
    bytes: desktopUpload.bytes,
    mobileImageUrl: mobileUpload?.secure_url,
    mobilePublicId: mobileUpload?.public_id,
    mobileFormat: mobileUpload?.format,
    mobileWidth: mobileUpload?.width,
    mobileHeight: mobileUpload?.height,
    mobileBytes: mobileUpload?.bytes,
  });

  res.status(201).json({ item: doc });
});

// Admin: PATCH /api/admin/banners/:id (optionally multipart for image replacement)
const updateBanner = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const doc = await Banner.findById(id);
  if (!doc) {
    res.status(404);
    throw new Error('Banner not found');
  }

  const patch = {};
  ['title', 'subtitle', 'description', 'ctaLabel', 'ctaUrl'].forEach((field) => {
    if (typeof req.body?.[field] !== 'undefined') {
      patch[field] = String(req.body[field]).trim();
    }
  });
  if (typeof req.body?.active !== 'undefined') {
    patch.active = req.body.active === 'true' || req.body.active === true;
  }
  if (typeof req.body?.order !== 'undefined') {
    patch.order = Number(req.body.order) || 0;
  }
  const desktopFile =
    getUploadedFile(req, 'desktopImage') ||
    getUploadedFile(req, 'image') ||
    req.file;
  const mobileFile = getUploadedFile(req, 'mobileImage');

  if (desktopFile && desktopFile.buffer) {
    const uploadResult = await uploadImageBuffer(desktopFile.buffer, { folder: bannerImagesFolder });
    patch.imageUrl = uploadResult.secure_url;
    patch.publicId = uploadResult.public_id;
    patch.folder = uploadResult.folder;
    patch.format = uploadResult.format;
    patch.width = uploadResult.width;
    patch.height = uploadResult.height;
    patch.bytes = uploadResult.bytes;

    await destroyImageIfExists(doc.publicId);
  }

  if (mobileFile && mobileFile.buffer) {
    const uploadResult = await uploadImageBuffer(mobileFile.buffer, { folder: bannerImagesFolder });
    patch.mobileImageUrl = uploadResult.secure_url;
    patch.mobilePublicId = uploadResult.public_id;
    patch.mobileFormat = uploadResult.format;
    patch.mobileWidth = uploadResult.width;
    patch.mobileHeight = uploadResult.height;
    patch.mobileBytes = uploadResult.bytes;

    await destroyImageIfExists(doc.mobilePublicId);
  }

  Object.assign(doc, patch);
  await doc.save();

  res.json({ item: doc });
});

// Admin: DELETE /api/admin/banners/:id
const deleteBanner = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const doc = await Banner.findById(id);
  if (!doc) {
    res.status(404);
    throw new Error('Banner not found');
  }

  await destroyImageIfExists(doc.publicId);
  await destroyImageIfExists(doc.mobilePublicId);

  await doc.deleteOne();
  res.json({ message: 'Deleted' });
});

module.exports = {
  listPublicBanners,
  listAdminBanners,
  createBanner,
  updateBanner,
  deleteBanner,
};
