const express = require('express');
const router = express.Router();
const landingPageController = require('../controllers/landingPageController');

// Public routes (if any specific public listing is needed, usually just getBySlug)
router.get('/public/:slug', landingPageController.getLandingPageBySlug);

// Admin/Internal routes
router.get('/', landingPageController.getAllLandingPages);
router.get('/:slug', landingPageController.getLandingPageBySlug);
router.post('/', landingPageController.createLandingPage);
router.put('/:id', landingPageController.updateLandingPage);
router.delete('/:id', landingPageController.deleteLandingPage);

module.exports = router;
