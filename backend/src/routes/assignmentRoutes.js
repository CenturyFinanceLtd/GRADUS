/*
  Assignment routes (learner)
  - Mounted at /api/assignments
*/
const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const {
  listAssignmentsForCourse,
  submitAssignment,
  listMySubmissions,
} = require('../controllers/assignmentController');

const router = express.Router();

router.use(protect);

router.get('/:courseSlug', listAssignmentsForCourse);
router.post('/:assignmentId/submit', submitAssignment);
router.get('/', listMySubmissions);

module.exports = router;
