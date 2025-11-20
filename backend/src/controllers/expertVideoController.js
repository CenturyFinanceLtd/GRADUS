/*
  Expert video controller
  - Cloudinary-backed CRUD for expert highlight videos
*/
const asyncHandler = require('express-async-handler');
const { cloudinary, expertVideosFolder } = require('../config/cloudinary');
const ExpertVideo = require('../models/ExpertVideo');

const toPlaybackUrl = (secureUrl) => secureUrl;

const optionalString = (value) => {
  if (typeof value === 'undefined' || value === null) {
    return undefined;
  }
  const trimmed = String(value).trim();
  return trimmed.length ? trimmed : undefined;
};

const ensureTitle = (title) => {
  const normalized = optionalString(title);
  if (!normalized) {
    const error = new Error('Title is required');
    error.statusCode = 400;
    throw error;
  }
  return normalized;
};

const coerceBoolean = (value, fallback = true) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
    if (['false', '0', 'no', 'off'].includes(normalized)) return false;
  }
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'undefined') return fallback;
  return Boolean(value);
};

const coerceNumber = (value, fallback = 0) => {
  if (typeof value === 'undefined' || value === null) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const maybeNumber = (value) => {
  if (typeof value === 'undefined' || value === null) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const buildPosterUrl = (publicId) =>
  cloudinary.url(`${publicId}.jpg`, {
    resource_type: 'video',
    secure: true,
    transformation: [{ format: 'jpg' }],
  });

const normalizeUploadResult = (rawUpload) => {
  if (!rawUpload || typeof rawUpload !== 'object') {
    const error = new Error('Upload metadata is required');
    error.statusCode = 400;
    throw error;
  }

  const publicId = rawUpload.publicId || rawUpload.public_id;
  const secureUrl = rawUpload.secureUrl || rawUpload.secure_url || rawUpload.url;
  if (!publicId || !secureUrl) {
    const error = new Error('Upload metadata missing required fields');
    error.statusCode = 400;
    throw error;
  }

  if (expertVideosFolder) {
    const normalizedFolder = expertVideosFolder.replace(/^\/+/, '').replace(/\/+$/, '');
    const uploadFolder = (rawUpload.folder || '').replace(/^\/+/, '').replace(/\/+$/, '');
    if (normalizedFolder && uploadFolder && uploadFolder !== normalizedFolder) {
      const error = new Error('Uploaded asset must be stored inside the expert videos folder');
      error.statusCode = 400;
      throw error;
    }
    if (normalizedFolder && !uploadFolder && !publicId.startsWith(`${normalizedFolder}/`)) {
      const error = new Error('Uploaded asset must be stored inside the expert videos folder');
      error.statusCode = 400;
      throw error;
    }
  }

  return {
    public_id: publicId,
    secure_url: secureUrl,
    folder: rawUpload.folder,
    resource_type: rawUpload.resourceType || rawUpload.resource_type || 'video',
    format: rawUpload.format,
    width: maybeNumber(rawUpload.width),
    height: maybeNumber(rawUpload.height),
    duration: maybeNumber(rawUpload.duration),
    bytes: maybeNumber(rawUpload.bytes),
  };
};

const buildDocumentFromUpload = ({ uploadResult, payload }) => {
  if (!uploadResult?.public_id) {
    const error = new Error('Upload result missing public_id');
    error.statusCode = 400;
    throw error;
  }

  const posterUrl = buildPosterUrl(uploadResult.public_id);

  return {
    title: ensureTitle(payload.title),
    subtitle: optionalString(payload.subtitle),
    description: optionalString(payload.description),
    active: coerceBoolean(payload.active, true),
    order: coerceNumber(payload.order, 0),
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
  };
};

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
  const { title } = req.body || {};
  ensureTitle(title);

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

  const doc = await ExpertVideo.create(
    buildDocumentFromUpload({
      uploadResult,
      payload: req.body || {},
    })
  );

  res.status(201).json({ item: doc });
});

const parseUploadPayload = (value) => {
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch (error) {
      const err = new Error('Invalid upload metadata payload');
      err.statusCode = 400;
      throw err;
    }
  }
  return value;
};

const createExpertVideoFromDirectUpload = asyncHandler(async (req, res) => {
  const { upload } = req.body || {};
  const parsedUpload = parseUploadPayload(upload);
  const normalizedUpload = normalizeUploadResult(parsedUpload);

  const doc = await ExpertVideo.create(
    buildDocumentFromUpload({
      uploadResult: normalizedUpload,
      payload: req.body || {},
    })
  );

  res.status(201).json({ item: doc });
});

const getExpertVideoUploadSignature = asyncHandler(async (_req, res) => {
  const config = cloudinary.config();
  if (!config?.cloud_name || !config?.api_key || !config?.api_secret || !cloudinary?.utils?.api_sign_request) {
    res.status(500);
    throw new Error('Cloudinary is not configured for uploads');
  }

  const timestamp = Math.round(Date.now() / 1000);
  const paramsToSign = { timestamp };
  if (expertVideosFolder) {
    paramsToSign.folder = expertVideosFolder;
  }
  const signature = cloudinary.utils.api_sign_request(paramsToSign, config.api_secret);

  res.json({
    cloudName: config.cloud_name,
    apiKey: config.api_key,
    timestamp,
    folder: expertVideosFolder,
    signature,
    uploadUrl: `https://api.cloudinary.com/v1_1/${config.cloud_name}/video/upload`,
  });
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
  createExpertVideoFromDirectUpload,
  updateExpertVideo,
  deleteExpertVideo,
  getExpertVideoUploadSignature,
};
