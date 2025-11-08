/*
  Multer configuration for blog image uploads
  - Uses memory storage so controllers can push buffers to Cloudinary
  - Still exports the legacy blogImagesDirectory for serving existing files
*/
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const blogImagesDirectory = path.resolve(__dirname, '../../../frontend/public/assets/blog-images');

if (!fs.existsSync(blogImagesDirectory)) {
  fs.mkdirSync(blogImagesDirectory, { recursive: true });
}

const storage = multer.memoryStorage();

const imageFileFilter = (req, file, cb) => {
  if (!file.mimetype.startsWith('image/')) {
    return cb(new Error('Only image uploads are allowed'));
  }
  cb(null, true);
};

const blogImageUpload = multer({
  storage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});

module.exports = {
  blogImageUpload,
  blogImagesDirectory,
};
