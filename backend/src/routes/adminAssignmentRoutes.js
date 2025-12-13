/*
  Assignment routes (admin)
  - Mounted at /api/admin/assignments
*/
const express = require('express');
const {
  createAssignment,
  listAssignmentsAdmin,
  listSubmissionsAdmin,
  gradeSubmission,
} = require('../controllers/assignmentController');
const { protectAdmin } = require('../middleware/adminAuthMiddleware');

const router = express.Router();

router.use(protectAdmin);

router.post('/', createAssignment);
router.get('/', listAssignmentsAdmin);
router.get('/:assignmentId/submissions', listSubmissionsAdmin);
router.put('/submissions/:submissionId/grade', gradeSubmission);

module.exports = router;
