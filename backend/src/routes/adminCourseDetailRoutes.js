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
  uploadLectureNotes,
} = require('../controllers/courseDetailController');

const router = express.Router();

const videoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB max
  fileFilter: (req, file, cb) => {
    if (!file.mimetype || !file.mimetype.startsWith('video/')) {
      return cb(new Error('Only video uploads are allowed'));
    }
    cb(null, true);
  },
});
const notesUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    if (!file.mimetype || (!file.originalname?.toLowerCase().endsWith('.pdf') && file.mimetype !== 'application/pdf')) {
      return cb(new Error('Only PDF notes are allowed'));
    }
    cb(null, true);
  },
});

router.get('/', protectAdmin, getCourseDetail);
router.put('/', protectAdmin, upsertCourseDetail);
router.post('/lectures/upload', protectAdmin, videoUpload.single('file'), uploadLectureVideo);
router.post('/lectures/upload-notes', protectAdmin, notesUpload.single('file'), uploadLectureNotes);

module.exports = router;
