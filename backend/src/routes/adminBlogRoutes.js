const express = require('express');
const { createBlog } = require('../controllers/blogController');
const { protectAdmin } = require('../middleware/adminAuthMiddleware');
const { blogImageUpload } = require('../middleware/uploadMiddleware');

const router = express.Router();

router.post('/', protectAdmin, blogImageUpload.single('featuredImage'), createBlog);

module.exports = router;
