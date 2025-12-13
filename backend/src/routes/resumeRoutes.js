/*
  Resume routes
  - Mounted at /api/resume
*/
const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { getMyResume, upsertMyResume, exportMyResumePdf } = require('../controllers/resumeController');

const router = express.Router();

router.use(protect);

router.get('/me', getMyResume);
router.put('/me', upsertMyResume);
router.get('/me/pdf', exportMyResumePdf);

module.exports = router;
