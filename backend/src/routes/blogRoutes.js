/*
  Public blog routes
  - Read/list blogs and comments for the public site
  - Mounted at /api/blogs
*/
const express = require('express');
const {
  getBlogs,
  getBlogBySlug,
  listBlogComments,
  createBlogComment,
} = require('../controllers/blogController');

const router = express.Router();

router.get('/', getBlogs);
router.get('/:slug/comments', listBlogComments);
router.post('/:slug/comments', createBlogComment);
router.get('/:slug', getBlogBySlug);

module.exports = router;
