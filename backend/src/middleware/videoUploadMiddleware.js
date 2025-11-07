/*
  Multer memory storage for video uploads
  - Validates common video mime types
  - Size limit default 200MB (adjust via env VIDEO_MAX_SIZE_MB)
*/
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

const maxSizeMb = Number(process.env.VIDEO_MAX_SIZE_MB || 200);

const videoUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter: videoFileFilter,
  limits: { fileSize: maxSizeMb * 1024 * 1024 },
});

module.exports = { videoUpload };

