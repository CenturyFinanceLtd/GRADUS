const express = require('express');
const {
  createBlog,
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
  .delete(protectAdmin, deleteAdminBlog);

router
  .route('/:blogId/comments')
  .get(protectAdmin, listAdminBlogComments)
  .post(protectAdmin, createAdminBlogComment);

router.delete('/:blogId/comments/:commentId', protectAdmin, deleteAdminBlogComment);

module.exports = router;
