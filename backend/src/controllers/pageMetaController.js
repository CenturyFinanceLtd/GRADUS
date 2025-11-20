/*
  Page meta controller
  - Admin CRUD for SEO metadata
  - Public endpoint exposes active entries for the marketing site
*/
const asyncHandler = require('express-async-handler');
const PageMeta = require('../models/PageMeta');
const { DEFAULT_META, PAGE_META } = require('../../../shared/pageMetaDefaults.json');

const trimToNull = (value) => {
  if (value === null || typeof value === 'undefined') {
    return undefined;
  }
  const trimmed = String(value).trim();
  return trimmed ? trimmed : undefined;
};

const parseBoolean = (value, fallback = false) => {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'number') {
    return value !== 0;
  }
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'y', 'on'].includes(normalized)) {
      return true;
    }
    if (['false', '0', 'no', 'n', 'off'].includes(normalized)) {
      return false;
    }
  }
  return fallback;
};

const normalizePath = (value) => {
  if (typeof value !== 'string') {
    return '';
  }
  let path = value.trim();
  if (!path) {
    return '';
  }
  if (!path.startsWith('/')) {
    path = `/${path}`;
  }
  // collapse duplicate slashes
  path = path.replace(/\/+/g, '/');
  if (path.length > 1) {
    path = path.replace(/\/+$/, '');
  }
  path = path.toLowerCase();
  return path || '/';
};

const toPlainObject = (doc) => {
  if (!doc) {
    return null;
  }
  if (typeof doc.toObject === 'function') {
    return doc.toObject();
  }
  return doc;
};

const formatAdminMeta = (doc) => {
  const plain = toPlainObject(doc) || {};
  return {
    id: plain._id ? String(plain._id) : null,
    path: plain.path || '',
    title: plain.title || '',
    description: plain.description || '',
    keywords: plain.keywords || '',
    robots: plain.robots || '',
    active: plain.active !== false,
    isDefault: Boolean(plain.isDefault),
    createdAt: plain.createdAt || null,
    updatedAt: plain.updatedAt || null,
  };
};

const formatPublicMeta = (doc) => {
  const plain = toPlainObject(doc) || {};
  return {
    path: plain.path || undefined,
    title: plain.title || '',
    description: plain.description || '',
    keywords: plain.keywords || '',
    robots: plain.robots || '',
  };
};

const buildSeedPayload = () => {
  const docs = [
    {
      isDefault: true,
      title: DEFAULT_META.title,
      description: DEFAULT_META.description,
      keywords: DEFAULT_META.keywords,
      robots: DEFAULT_META.robots,
      active: true,
    },
  ];

  Object.entries(PAGE_META || {}).forEach(([path, meta]) => {
    if (!meta || typeof meta !== 'object') {
      return;
    }
    const normalizedPath = normalizePath(path);
    if (!normalizedPath) {
      return;
    }
    docs.push({
      path: normalizedPath,
      title: trimToNull(meta.title) || DEFAULT_META.title,
      description: trimToNull(meta.description) || DEFAULT_META.description,
      keywords: trimToNull(meta.keywords) || DEFAULT_META.keywords,
      robots: trimToNull(meta.robots) || DEFAULT_META.robots,
      active: true,
    });
  });

  return docs;
};

let ensureSeedPromise = null;
const ensureSeedData = async () => {
  if (ensureSeedPromise) {
    await ensureSeedPromise;
    return;
  }

  ensureSeedPromise = (async () => {
    const hasRecords = await PageMeta.exists({});
    if (hasRecords) {
      return;
    }
    const seedDocs = buildSeedPayload();
    if (!seedDocs.length) {
      return;
    }
    try {
      await PageMeta.insertMany(seedDocs, { ordered: false });
    } catch (error) {
      if (error?.code !== 11000) {
        console.warn('[page-meta] Failed to seed default entries', error);
      }
    }
  })().catch((error) => {
    console.warn('[page-meta] Seed error', error);
  });

  await ensureSeedPromise;
};

const listAdminPageMeta = asyncHandler(async (req, res) => {
  await ensureSeedData();
  const docs = await PageMeta.find({}).sort({ isDefault: -1, path: 1 }).lean();
  const defaultMetaDoc = docs.find((doc) => doc.isDefault) || null;
  const items = docs.filter((doc) => !doc.isDefault);

  res.json({
    defaultMeta: defaultMetaDoc ? formatAdminMeta(defaultMetaDoc) : formatAdminMeta({
      isDefault: true,
      title: DEFAULT_META.title,
      description: DEFAULT_META.description,
      keywords: DEFAULT_META.keywords,
      robots: DEFAULT_META.robots,
    }),
    items: items.map(formatAdminMeta),
  });
});

const listPublicPageMeta = asyncHandler(async (req, res) => {
  await ensureSeedData();
  const docs = await PageMeta.find({}).sort({ isDefault: -1, path: 1 }).lean();
  const defaultMetaDoc = docs.find((doc) => doc.isDefault) || null;
  const items = docs.filter((doc) => !doc.isDefault && doc.active !== false);

  res.json({
    defaultMeta: defaultMetaDoc ? formatPublicMeta(defaultMetaDoc) : formatPublicMeta(DEFAULT_META),
    items: items.map(formatPublicMeta),
  });
});

const createPageMeta = asyncHandler(async (req, res) => {
  const isDefault = parseBoolean(req.body?.isDefault, false);
  const adminId = req.admin?._id;
  let normalizedPath = '';

  if (!isDefault) {
    normalizedPath = normalizePath(req.body?.path);
    if (!normalizedPath) {
      res.status(400);
      throw new Error('A valid path starting with / is required.');
    }
  }

  const title = trimToNull(req.body?.title);
  if (!title) {
    res.status(400);
    throw new Error('Title is required.');
  }

  if (isDefault) {
    const existingDefault = await PageMeta.findOne({ isDefault: true });
    if (existingDefault) {
      res.status(400);
      throw new Error('A default meta entry already exists. Please edit the existing default entry.');
    }
  }

  const payload = {
    path: isDefault ? undefined : normalizedPath,
    title,
    description: trimToNull(req.body?.description),
    keywords: trimToNull(req.body?.keywords),
    robots: trimToNull(req.body?.robots) || DEFAULT_META.robots,
    active: isDefault ? true : parseBoolean(req.body?.active, true),
    isDefault,
    createdBy: adminId,
    updatedBy: adminId,
  };

  const doc = await PageMeta.create(payload);
  res.status(201).json({ item: formatAdminMeta(doc) });
});

const updatePageMeta = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const doc = await PageMeta.findById(id);
  if (!doc) {
    res.status(404);
    throw new Error('Page meta entry not found.');
  }

  if (typeof req.body?.title !== 'undefined') {
    const title = trimToNull(req.body.title);
    if (!title) {
      res.status(400);
      throw new Error('Title cannot be empty.');
    }
    doc.title = title;
  }

  if (typeof req.body?.description !== 'undefined') {
    doc.description = trimToNull(req.body.description);
  }
  if (typeof req.body?.keywords !== 'undefined') {
    doc.keywords = trimToNull(req.body.keywords);
  }
  if (typeof req.body?.robots !== 'undefined') {
    doc.robots = trimToNull(req.body.robots) || DEFAULT_META.robots;
  }

  if (!doc.isDefault && typeof req.body?.path !== 'undefined') {
    const normalizedPath = normalizePath(req.body.path);
    if (!normalizedPath) {
      res.status(400);
      throw new Error('A valid path starting with / is required.');
    }
    doc.path = normalizedPath;
  }

  if (!doc.isDefault && typeof req.body?.active !== 'undefined') {
    doc.active = parseBoolean(req.body.active, doc.active !== false);
  }

  const adminId = req.admin?._id;
  if (adminId) {
    doc.updatedBy = adminId;
  }

  await doc.save();
  res.json({ item: formatAdminMeta(doc) });
});

const deletePageMeta = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const doc = await PageMeta.findById(id);
  if (!doc) {
    res.status(404);
    throw new Error('Page meta entry not found.');
  }

  if (doc.isDefault) {
    res.status(400);
    throw new Error('The default meta entry cannot be deleted.');
  }

  await doc.deleteOne();
  res.json({ message: 'Deleted' });
});

module.exports = {
  listAdminPageMeta,
  listPublicPageMeta,
  createPageMeta,
  updatePageMeta,
  deletePageMeta,
};
