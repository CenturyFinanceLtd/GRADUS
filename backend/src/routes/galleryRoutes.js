/*
  Public gallery routes
  - Read/list gallery items
  - Mounted at /api/gallery
*/
const express = require('express');
const { getGalleryItems } = require('../controllers/galleryController');

const router = express.Router();

router.get('/', getGalleryItems);

module.exports = router;
