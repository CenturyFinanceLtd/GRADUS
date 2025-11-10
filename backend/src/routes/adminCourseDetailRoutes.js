/*
  Admin course detail routes
  - Mounted at /api/admin/course-details
*/
const express = require('express');
const multer = require('multer');
const { protectAdmin } = require('../middleware/adminAuthMiddleware');
const {
  getCourseDetail,
  upsertCourseDetail,
  uploadLectureVideo,
} = require('../controllers/courseDetailController');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB max
  fileFilter: (req, file, cb) => {
    if (!file.mimetype || !file.mimetype.startsWith('video/')) {
      return cb(new Error('Only video uploads are allowed'));
    }
    cb(null, true);
  },
});

router.get('/', protectAdmin, getCourseDetail);
router.put('/', protectAdmin, upsertCourseDetail);
router.post('/lectures/upload', protectAdmin, upload.single('file'), uploadLectureVideo);

module.exports = router;
