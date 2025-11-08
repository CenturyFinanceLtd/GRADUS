/*
  Admin > Blog routes
  - Create/update/delete blog posts, upload images
  - Mounted at /api/admin/blogs
*/
const express = require('express');
const {
  createBlog,
  updateBlog,
  listAdminBlogs,
  getAdminBlogDetails,
  listAdminBlogComments,
  createAdminBlogComment,
  deleteAdminBlogComment,
  deleteAdminBlog,
} = require('../controllers/blogController');
const { protectAdmin } = require('../middleware/adminAuthMiddleware');
const { blogImageUpload } = require('../middleware/uploadMiddleware');

const router = express.Router();

router
  .route('/')
  .get(protectAdmin, listAdminBlogs)
  .post(protectAdmin, blogImageUpload.single('featuredImage'), createBlog);

router
  .route('/:blogId')
  .get(protectAdmin, getAdminBlogDetails)
  .put(protectAdmin, blogImageUpload.single('featuredImage'), updateBlog)
  .delete(protectAdmin, deleteAdminBlog);

router
  .route('/:blogId/comments')
  .get(protectAdmin, listAdminBlogComments)
  .post(protectAdmin, createAdminBlogComment);

router.delete('/:blogId/comments/:commentId', protectAdmin, deleteAdminBlogComment);

module.exports = router;
