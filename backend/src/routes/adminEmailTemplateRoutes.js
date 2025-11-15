/*
  Admin email template routes
  - Allows admins to list and update transactional email templates
*/
const express = require('express');
const {
  listEmailTemplates,
  getEmailTemplate,
  upsertEmailTemplate,
  deleteEmailTemplate,
} = require('../controllers/adminEmailTemplateController');
const { protectAdmin } = require('../middleware/adminAuthMiddleware');

const router = express.Router();

router.use(protectAdmin);

router.route('/').get(listEmailTemplates);
router
  .route('/:key')
  .get(getEmailTemplate)
  .put(upsertEmailTemplate)
  .delete(deleteEmailTemplate);

module.exports = router;
