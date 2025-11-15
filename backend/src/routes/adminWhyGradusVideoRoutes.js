/*
  Admin Why Gradus video API
*/
const express = require('express');
const { protectAdmin } = require('../middleware/adminAuthMiddleware');
const { videoUpload } = require('../middleware/videoUploadMiddleware');
const {
  listAdminWhyGradusVideo,
  createWhyGradusVideo,
  updateWhyGradusVideo,
  deleteWhyGradusVideo,
} = require('../controllers/whyGradusVideoController');

const router = express.Router();

router
  .route('/')
  .get(protectAdmin, listAdminWhyGradusVideo)
  .post(protectAdmin, videoUpload.single('video'), createWhyGradusVideo);

router
  .route('/:id')
  .patch(protectAdmin, updateWhyGradusVideo)
  .delete(protectAdmin, deleteWhyGradusVideo);

module.exports = router;

