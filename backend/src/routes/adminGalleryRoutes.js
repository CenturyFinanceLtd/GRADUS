/*
  Admin > Gallery routes
  - Create/delete gallery items
  - Mounted at /api/admin/gallery
*/
const express = require('express');
const {
    createGalleryItem,
    deleteGalleryItem,
    getGalleryItems,
} = require('../controllers/galleryController');
const { protectAdmin } = require('../middleware/adminAuthMiddleware');

const router = express.Router();

router
    .route('/')
    .get(protectAdmin, getGalleryItems)
    .post(protectAdmin, createGalleryItem);

router
    .route('/:id')
    .delete(protectAdmin, deleteGalleryItem);

module.exports = router;
