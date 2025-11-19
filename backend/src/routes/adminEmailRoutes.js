const express = require('express');
const { protectAdmin, requireProgrammerEmailAccess } = require('../middleware/adminAuthMiddleware');
const { listMailboxes, listMessages, getMessage, getAttachment } = require('../controllers/adminEmailController');

const router = express.Router();

router.use(protectAdmin);
router.use(requireProgrammerEmailAccess);

router.get('/accounts', listMailboxes);
router.get('/messages', listMessages);
router.get('/messages/:messageId', getMessage);
router.get('/messages/:messageId/attachments/:attachmentId', getAttachment);

module.exports = router;
