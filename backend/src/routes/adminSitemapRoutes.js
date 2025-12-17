const express = require('express');
const router = express.Router();
const {
    listSitemaps,
    getSitemapContent,
    updateSitemapContent
} = require('../controllers/sitemapController');
const { protect, admin } = require('../middleware/authMiddleware');

// Admin routes
router.use(protect, admin);
router.get('/', listSitemaps);
router.get('/:filename', getSitemapContent);
router.put('/:filename', updateSitemapContent);

module.exports = router;
