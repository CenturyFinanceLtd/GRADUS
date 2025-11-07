/*
  Admin upload routes
  - Mounted at /api/admin/uploads
*/
const express = require('express');
const multer = require('multer');
const { protectAdmin } = require('../middleware/adminAuthMiddleware');
const { uploadCourseImage } = require('../controllers/uploadController');

const router = express.Router();

// memory storage as we stream directly to Cloudinary
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (!file.mimetype || !file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image uploads are allowed'));
    }
    cb(null, true);
  },
});

router.post('/image', protectAdmin, upload.single('file'), uploadCourseImage);

module.exports = router;

