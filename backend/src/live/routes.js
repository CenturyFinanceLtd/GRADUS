const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { protectAdmin } = require('../middleware/adminAuthMiddleware');
const {
  createSession,
  listSessions,
  getSessionForAdmin,
  getSessionForParticipant,
  updateSession,
  joinStudentSession,
  joinInstructorSession,
} = require('./liveController');

const router = express.Router();

// Admin/instructor endpoints
router.post('/sessions', protectAdmin, createSession);
router.get('/sessions', protectAdmin, listSessions);
router.get('/sessions/:sessionId', protectAdmin, getSessionForAdmin);
router.patch('/sessions/:sessionId', protectAdmin, updateSession);
router.post('/sessions/:sessionId/instructor/join', protectAdmin, joinInstructorSession);

// Student endpoints
router.get('/sessions/:sessionId/public', protect, getSessionForParticipant);
router.post('/sessions/:sessionId/join', protect, joinStudentSession);

module.exports = router;
