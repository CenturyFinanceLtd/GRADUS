/*
  Public page meta routes
  - Mounted at /api/page-meta
  - Returns active SEO metadata for the marketing site
*/
const express = require('express');
const { listPublicPageMeta } = require('../controllers/pageMetaController');

const router = express.Router();

router.get('/', listPublicPageMeta);

module.exports = router;
