/*
  Admin expert video API
  - CRUD endpoints for expert highlight videos
*/
const express = require('express');
const { protectAdmin } = require('../middleware/adminAuthMiddleware');
const { videoUpload } = require('../middleware/videoUploadMiddleware');
const {
  listAdminExpertVideos,
  createExpertVideo,
  createExpertVideoFromDirectUpload,
  updateExpertVideo,
  deleteExpertVideo,
  getExpertVideoUploadSignature,
} = require('../controllers/expertVideoController');

const router = express.Router();

router.post('/upload/signature', protectAdmin, getExpertVideoUploadSignature);
router.post('/upload/direct', protectAdmin, createExpertVideoFromDirectUpload);

router
  .route('/')
  .get(protectAdmin, listAdminExpertVideos)
  .post(protectAdmin, videoUpload.single('video'), createExpertVideo);

router
  .route('/:id')
  .patch(protectAdmin, updateExpertVideo)
  .delete(protectAdmin, deleteExpertVideo);

module.exports = router;
