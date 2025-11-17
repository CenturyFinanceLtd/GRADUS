/*
  Multer configuration for testimonial uploads
  - Accepts a required video file (field: "video")
  - Accepts an optional image thumbnail (field: "thumbnail")
*/
const multer = require('multer');

const VIDEO_TYPES = new Set([
  'video/mp4',
  'video/quicktime', // mov
  'video/x-matroska', // mkv
  'video/webm',
  'video/ogg',
]);

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (file.fieldname === 'video') {
    if (!VIDEO_TYPES.has(file.mimetype)) return cb(new Error('Unsupported video type'));
    return cb(null, true);
  }

  if (file.fieldname === 'thumbnail') {
    if (!file.mimetype.startsWith('image/')) return cb(new Error('Thumbnail must be an image'));
    return cb(null, true);
  }

  return cb(new Error(`Unexpected field: ${file.fieldname}`));
};

const maxSizeMb = Number(process.env.VIDEO_MAX_SIZE_MB || 200);

const testimonialUpload = multer({
  storage,
  fileFilter,
  limits: { fileSize: maxSizeMb * 1024 * 1024 },
}).fields([
  { name: 'video', maxCount: 1 },
  { name: 'thumbnail', maxCount: 1 },
]);

module.exports = { testimonialUpload };
