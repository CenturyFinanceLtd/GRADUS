/*
  Admin > Assessment routes
  - Trigger AI generation and list stored assessments
  - Mounted at /api/admin/assessments
*/
const express = require('express');
const { protectAdmin } = require('../middleware/adminAuthMiddleware');
const {
  generateCourseAssessments,
  listAssessmentsAdmin,
} = require('../controllers/assessmentController');

const router = express.Router();

router.get('/', protectAdmin, listAssessmentsAdmin);
router.get('/:courseSlug', protectAdmin, listAssessmentsAdmin);
router.get('/:programmeSlug/:courseSlug', protectAdmin, listAssessmentsAdmin);

router.post('/:courseSlug/generate', protectAdmin, generateCourseAssessments);
router.post('/:programmeSlug/:courseSlug/generate', protectAdmin, generateCourseAssessments);

module.exports = router;
