const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const {
  getActiveSessionForCourse,
  joinSession,
  pingSession,
  leaveSession,
} = require('../controllers/liveSessionController');

const router = express.Router();

router.get('/courses/:courseSlug/active', getActiveSessionForCourse);
router.post('/:sessionId/join', protect, joinSession);
router.post('/:sessionId/ping', protect, pingSession);
router.post('/:sessionId/leave', protect, leaveSession);

module.exports = router;
