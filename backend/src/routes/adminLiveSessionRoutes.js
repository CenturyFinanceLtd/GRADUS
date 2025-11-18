/*
  Admin > Live sessions routes
  - Hosts CRUD + lifecycle endpoints for custom Go Live experience
  - Mounted at /api/admin/live-sessions
*/
const express = require('express');
const { protectAdmin } = require('../middleware/adminAuthMiddleware');
const {
  listAdminLiveSessions,
  getAdminLiveSession,
  createLiveSession,
  updateLiveSession,
  startLiveSession,
  endLiveSession,
} = require('../controllers/liveSessionController');

const router = express.Router();

router.use(protectAdmin);

router.get('/', listAdminLiveSessions);
router.post('/', createLiveSession);
router.get('/:sessionId', getAdminLiveSession);
router.patch('/:sessionId', updateLiveSession);
router.post('/:sessionId/start', startLiveSession);
router.post('/:sessionId/end', endLiveSession);

module.exports = router;

