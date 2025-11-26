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
  getActiveLiveSessionForCourse,
  commandParticipantMedia,
  removeParticipant,
  admitWaitingParticipant,
  denyWaitingParticipant,
  uploadRecording,
  listAttendance,
  listSessionEvents,
  getChatMessages,
} = require('./liveController');

const router = express.Router();

// Admin/instructor endpoints
router.post('/sessions', protectAdmin, createSession);
router.get('/sessions', protectAdmin, listSessions);
router.get('/sessions/:sessionId', protectAdmin, getSessionForAdmin);
router.patch('/sessions/:sessionId', protectAdmin, updateSession);
router.post('/sessions/:sessionId/instructor/join', protectAdmin, joinInstructorSession);
router.get('/sessions/:sessionId/chat/admin', protectAdmin, getChatMessages);
router.post('/sessions/:sessionId/participants/:participantId/media', protectAdmin, commandParticipantMedia);
router.post('/sessions/:sessionId/participants/:participantId/kick', protectAdmin, removeParticipant);
router.post('/sessions/:sessionId/participants/:participantId/admit', protectAdmin, admitWaitingParticipant);
router.post('/sessions/:sessionId/participants/:participantId/deny', protectAdmin, denyWaitingParticipant);
router.post('/sessions/:sessionId/recordings', protectAdmin, uploadRecording);
router.get('/sessions/:sessionId/attendance', protectAdmin, listAttendance);
router.get('/sessions/:sessionId/events', protectAdmin, listSessionEvents);

// Student endpoints
router.get('/sessions/:sessionId/public', protect, getSessionForParticipant);
router.post('/sessions/:sessionId/join', protect, joinStudentSession);
router.get('/sessions/course/*courseKey/active', protect, getActiveLiveSessionForCourse);
router.get('/sessions/:sessionId/chat', protect, getChatMessages);

module.exports = router;
