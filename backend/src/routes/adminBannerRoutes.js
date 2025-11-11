/*
  Admin banner routes
  - Mounted at /api/admin/banners
  - Supports CRUD operations on hero/banner images
*/
const express = require('express');
const multer = require('multer');
const { protectAdmin } = require('../middleware/adminAuthMiddleware');
const {
  listAdminBanners,
  createBanner,
  updateBanner,
  deleteBanner,
} = require('../controllers/bannerController');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 }, // 8MB
  fileFilter: (req, file, cb) => {
    if (!file.mimetype || !file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image uploads are allowed'));
    }
    cb(null, true);
  },
});

const uploadBannerFields = upload.fields([
  { name: 'desktopImage', maxCount: 1 },
  { name: 'mobileImage', maxCount: 1 },
  { name: 'image', maxCount: 1 }, // backward compatibility
]);

const maybeUpload = (req, res, next) => {
  if (req.is('multipart/form-data')) {
    return uploadBannerFields(req, res, next);
  }
  return next();
};

router
  .route('/')
  .get(protectAdmin, listAdminBanners)
  .post(protectAdmin, uploadBannerFields, createBanner);

router
  .route('/:id')
  .patch(protectAdmin, maybeUpload, updateBanner)
  .delete(protectAdmin, deleteBanner);

module.exports = router;
