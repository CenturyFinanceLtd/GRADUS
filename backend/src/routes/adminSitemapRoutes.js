const express = require('express');
const router = express.Router();
const {
    listSitemaps,
    getSitemapContent,
    updateSitemapContent
} = require('../controllers/sitemapController');
const { protectAdmin } = require('../middleware/adminAuthMiddleware');

// Admin routes
router.use(protectAdmin);
router.get('/', listSitemaps);
router.get('/:filename', getSitemapContent);
router.put('/:filename', updateSitemapContent);

module.exports = router;
