/*
  Multer disk storage for video uploads
  - Streams uploads to disk (not memory) to support very large files
  - Validates common video mime types
  - Default size limit: 2GB (override via VIDEO_MAX_SIZE_MB)
*/
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const multer = require('multer');

const VIDEO_TYPES = new Set([
  'video/mp4',
  'video/quicktime', // mov
  'video/x-matroska', // mkv
  'video/webm',
  'video/ogg',
]);

const videoFileFilter = (req, file, cb) => {
  if (!VIDEO_TYPES.has(file.mimetype)) {
    return cb(new Error('Unsupported video type'));
  }
  cb(null, true);
};

const DEFAULT_MAX_SIZE_MB = 2048; // 2GB
const parsedMaxSize = Number(process.env.VIDEO_MAX_SIZE_MB);
const maxSizeMb = Number.isFinite(parsedMaxSize) && parsedMaxSize > 0 ? parsedMaxSize : DEFAULT_MAX_SIZE_MB;
const maxSizeBytes = maxSizeMb * 1024 * 1024;

const uploadDir = path.join(os.tmpdir(), 'gradus-video-uploads');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const safeExt = path.extname(file.originalname || '') || '.mp4';
    const uniqueName = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${safeExt}`;
    cb(null, uniqueName);
  },
});

const videoUpload = multer({
  storage,
  fileFilter: videoFileFilter,
  limits: { fileSize: maxSizeBytes, files: 1 },
});

module.exports = { videoUpload };
