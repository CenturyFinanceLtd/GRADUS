/*
  Admin partner logos routes
  - Mounted at /api/admin/partners
  - Supports CRUD with Cloudinary uploads (single + bulk)
*/
const express = require('express');
const multer = require('multer');
const { protectAdmin } = require('../middleware/adminAuthMiddleware');
const {
  listAdminPartners,
  createPartner,
  updatePartner,
  deletePartner,
} = require('../controllers/partnerController');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 }, // 8MB per logo
  fileFilter: (req, file, cb) => {
    if (!file.mimetype || !file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image uploads are allowed'));
    }
    cb(null, true);
  },
});

const uploadFields = upload.fields([
  { name: 'logo', maxCount: 1 }, // single create/update
  { name: 'logos', maxCount: 150 }, // bulk upload (supports large batches)
]);

const maybeUpload = (req, res, next) => {
  if (req.is('multipart/form-data')) {
    return uploadFields(req, res, next);
  }
  return next();
};

router
  .route('/')
  .get(protectAdmin, listAdminPartners)
  .post(protectAdmin, uploadFields, createPartner);

router
  .route('/:id')
  .patch(protectAdmin, maybeUpload, updatePartner)
  .delete(protectAdmin, deletePartner);

module.exports = router;
