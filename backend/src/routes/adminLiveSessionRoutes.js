const express = require('express');
const { protectAdmin } = require('../middleware/adminAuthMiddleware');
const {
  listCourses,
  getCourseRoster,
  listSessions,
  createSession,
  startSession,
  endSession,
  getSession,
} = require('../controllers/adminLiveSessionController');

const router = express.Router();

router.use(protectAdmin);

router.get('/courses', listCourses);
router.get('/courses/:courseId/roster', getCourseRoster);
router.get('/', listSessions);
router.post('/', createSession);
router.post('/:sessionId/start', startSession);
router.post('/:sessionId/end', endSession);
router.get('/:sessionId', getSession);

module.exports = router;
