/*
  Admin page meta routes
  - Mounted at /api/admin/page-meta
  - Authenticated CRUD endpoints for SEO metadata
*/
const express = require('express');
const { protectAdmin } = require('../middleware/adminAuthMiddleware');
const {
  listAdminPageMeta,
  createPageMeta,
  updatePageMeta,
  deletePageMeta,
} = require('../controllers/pageMetaController');

const router = express.Router();

router
  .route('/')
  .get(protectAdmin, listAdminPageMeta)
  .post(protectAdmin, createPageMeta);

router
  .route('/:id')
  .patch(protectAdmin, updatePageMeta)
  .delete(protectAdmin, deletePageMeta);

module.exports = router;
