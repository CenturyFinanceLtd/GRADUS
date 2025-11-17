/*
  Partner logos controller
  - Admin: create (single + bulk), update, delete, list
  - Public: list active partner logos for marketing pages
*/
const asyncHandler = require('express-async-handler');
const { cloudinary, partnerLogosFolder } = require('../config/cloudinary');
const PartnerLogo = require('../models/PartnerLogo');

const trimValue = (value) => (typeof value === 'string' ? value.trim() : '');
const toBoolean = (value, defaultValue = true) => {
  if (typeof value === 'undefined') return defaultValue;
  if (typeof value === 'boolean') return value;
  const normalized = String(value).toLowerCase();
  return normalized !== 'false' && normalized !== '0' && normalized !== 'off' && normalized !== 'no';
};
const parsePrograms = (value) => {
  if (!value) return [];
  const arr = Array.isArray(value) ? value : String(value || '').split(',');
  return arr.map((entry) => trimValue(entry)).filter(Boolean);
};
const deriveNameFromFile = (file) => {
  if (!file?.originalname) return '';
  return file.originalname.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ').trim();
};

const uploadLogoBuffer = (buffer, { folder }) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
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
    stream.end(buffer);
  });

const destroyImageIfExists = async (publicId) => {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
  } catch {
    // ignore clean-up issues
  }
};

const serializePartner = (doc) => ({
  id: doc._id,
  name: doc.name || '',
  website: doc.website || '',
  programs: Array.isArray(doc.programs) ? doc.programs : [],
  active: typeof doc.active === 'undefined' ? true : Boolean(doc.active),
  order: typeof doc.order === 'number' ? doc.order : 0,
  logoUrl: doc.logoUrl,
  publicId: doc.publicId,
  width: doc.width,
  height: doc.height,
});

// Public: GET /api/partners
const listPublicPartners = asyncHandler(async (req, res) => {
  const items = await PartnerLogo.find({ active: true })
    .sort({ order: 1, createdAt: -1 })
    .select('-__v -updatedAt -bytes -folder -format');

  res.json({ items: items.map(serializePartner) });
});

// Admin: GET /api/admin/partners
const listAdminPartners = asyncHandler(async (req, res) => {
  const items = await PartnerLogo.find({})
    .sort({ order: 1, createdAt: -1 })
    .lean();
  res.json({ items });
});

// Admin: POST /api/admin/partners (single or bulk)
const createPartner = asyncHandler(async (req, res) => {
  const { name, website, order, active, programs } = req.body || {};
  const bulkFiles = req.files?.logos;
  const singleFile = (req.files?.logo && req.files.logo[0]) || req.file;

  // Bulk upload path
  if (Array.isArray(bulkFiles) && bulkFiles.length) {
    const bulkMetaRaw = req.body?.items || req.body?.meta || req.body?.metadata || null;
    let bulkMeta = [];
    if (typeof bulkMetaRaw === 'string') {
      try {
        const parsed = JSON.parse(bulkMetaRaw);
        if (Array.isArray(parsed)) {
          bulkMeta = parsed;
        }
      } catch (err) {
        // ignore malformed meta; fall back to defaults
        console.warn('[partners] Failed to parse bulk meta JSON:', err?.message);
      }
    }

    const defaults = {
      active: toBoolean(req.body?.defaultActive ?? active, true),
      programs: parsePrograms(req.body?.defaultPrograms ?? programs),
      website: trimValue(req.body?.defaultWebsite || ''),
      orderStart: typeof req.body?.orderStart !== 'undefined' ? Number(req.body.orderStart) || 0 : 0,
    };

    const created = [];
    // eslint-disable-next-line no-restricted-syntax
    for (const [index, file] of bulkFiles.entries()) {
      if (!file?.buffer) {
        // Skip invalid file entries instead of failing the whole batch
        // eslint-disable-next-line no-continue
        continue;
      }
      const meta = bulkMeta[index] || {};
      const uploadResult = await uploadLogoBuffer(file.buffer, { folder: partnerLogosFolder });

      const parsedPrograms = parsePrograms(meta.programs);
      const doc = await PartnerLogo.create({
        name: trimValue(meta.name) || trimValue(name) || deriveNameFromFile(file) || 'Partner',
        website: trimValue(meta.website) || defaults.website,
        programs: parsedPrograms.length ? parsedPrograms : defaults.programs,
        active: toBoolean(meta.active, defaults.active),
        order:
          typeof meta.order !== 'undefined'
            ? Number(meta.order) || 0
            : defaults.orderStart + index,
        logoUrl: uploadResult.secure_url,
        publicId: uploadResult.public_id,
        folder: uploadResult.folder,
        format: uploadResult.format,
        width: uploadResult.width,
        height: uploadResult.height,
        bytes: uploadResult.bytes,
      });
      created.push(doc);
    }

    return res.status(201).json({ items: created.map(serializePartner) });
  }

  // Single upload path
  if (!singleFile || !singleFile.buffer) {
    res.status(400);
    throw new Error('Logo image (field: logo) is required');
  }

  const uploadResult = await uploadLogoBuffer(singleFile.buffer, { folder: partnerLogosFolder });

  const doc = await PartnerLogo.create({
    name: trimValue(name) || deriveNameFromFile(singleFile) || 'Partner',
    website: trimValue(website),
    programs: parsePrograms(programs),
    active: toBoolean(active, true),
    order: typeof order !== 'undefined' ? Number(order) || 0 : 0,
    logoUrl: uploadResult.secure_url,
    publicId: uploadResult.public_id,
    folder: uploadResult.folder,
    format: uploadResult.format,
    width: uploadResult.width,
    height: uploadResult.height,
    bytes: uploadResult.bytes,
  });

  return res.status(201).json({ item: serializePartner(doc) });
});

// Admin: PATCH /api/admin/partners/:id
const updatePartner = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const doc = await PartnerLogo.findById(id);
  if (!doc) {
    res.status(404);
    throw new Error('Partner not found');
  }

  const patch = {};
  if (typeof req.body?.name !== 'undefined') patch.name = trimValue(req.body.name);
  if (typeof req.body?.website !== 'undefined') patch.website = trimValue(req.body.website);
  if (typeof req.body?.programs !== 'undefined') patch.programs = parsePrograms(req.body.programs);
  if (typeof req.body?.active !== 'undefined') patch.active = toBoolean(req.body.active, doc.active);
  if (typeof req.body?.order !== 'undefined') patch.order = Number(req.body.order) || 0;

  const uploadFile = (req.files?.logo && req.files.logo[0]) || req.file;
  if (uploadFile?.buffer) {
    const uploadResult = await uploadLogoBuffer(uploadFile.buffer, { folder: partnerLogosFolder });
    patch.logoUrl = uploadResult.secure_url;
    patch.publicId = uploadResult.public_id;
    patch.folder = uploadResult.folder;
    patch.format = uploadResult.format;
    patch.width = uploadResult.width;
    patch.height = uploadResult.height;
    patch.bytes = uploadResult.bytes;

    await destroyImageIfExists(doc.publicId);
  }

  Object.assign(doc, patch);
  await doc.save();

  res.json({ item: serializePartner(doc) });
});

// Admin: DELETE /api/admin/partners/:id
const deletePartner = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const doc = await PartnerLogo.findById(id);
  if (!doc) {
    res.status(404);
    throw new Error('Partner not found');
  }

  await destroyImageIfExists(doc.publicId);
  await doc.deleteOne();

  res.json({ message: 'Deleted' });
});

module.exports = {
  listPublicPartners,
  listAdminPartners,
  createPartner,
  updatePartner,
  deletePartner,
};
