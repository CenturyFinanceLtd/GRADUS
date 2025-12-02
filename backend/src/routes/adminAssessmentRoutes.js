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
  generateAssessmentsFromSyllabus,
  deleteAssessmentSet,
  getAssessmentJobStatus,
  cancelAssessmentJob,
} = require('../controllers/assessmentController');

const router = express.Router();

router.get('/', protectAdmin, listAssessmentsAdmin);
router.get('/:courseSlug', protectAdmin, listAssessmentsAdmin);
router.get('/:programmeSlug/:courseSlug', protectAdmin, listAssessmentsAdmin);

router.post('/:courseSlug/generate', protectAdmin, generateCourseAssessments);
router.post('/:programmeSlug/:courseSlug/generate', protectAdmin, generateCourseAssessments);
router.post('/:courseSlug/syllabus', protectAdmin, generateAssessmentsFromSyllabus);
router.post('/:programmeSlug/:courseSlug/syllabus', protectAdmin, generateAssessmentsFromSyllabus);
router.delete('/set/:assessmentId', protectAdmin, deleteAssessmentSet);
router.get('/:courseSlug/progress', protectAdmin, getAssessmentJobStatus);
router.get('/:programmeSlug/:courseSlug/progress', protectAdmin, getAssessmentJobStatus);
router.post('/:courseSlug/cancel', protectAdmin, cancelAssessmentJob);
router.post('/:programmeSlug/:courseSlug/cancel', protectAdmin, cancelAssessmentJob);

module.exports = router;
