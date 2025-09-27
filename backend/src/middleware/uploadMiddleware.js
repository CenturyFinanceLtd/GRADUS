const fs = require('fs');
const path = require('path');
const multer = require('multer');
const slugify = require('../utils/slugify');

const blogImagesDirectory = path.resolve(__dirname, '../../../frontend/public/assets/blog-images');

if (!fs.existsSync(blogImagesDirectory)) {
  fs.mkdirSync(blogImagesDirectory, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, blogImagesDirectory);
  },
  filename: (req, file, cb) => {
    const originalExtension = path.extname(file.originalname) || '.png';
    const title = req.body && req.body.title ? req.body.title : file.originalname || 'blog-image';
    const baseName = slugify(title) || 'blog-image';
    const timestamp = Date.now();
    const filename = baseName + '-' + timestamp + originalExtension;
    cb(null, filename);
  },
});

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
