const express = require('express');
const { body } = require('express-validator');
const {
  getProfile,
  updateProfile,
  startEmailChange,
  verifyEmailChange,
  updatePassword,
  startAccountDeletion,
  verifyAccountDeletion,
  getMyEnrollments,
} = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');
const validateRequest = require('../middleware/validateRequest');

const router = express.Router();

router.get('/me', protect, getProfile);
router.get('/me/enrollments', protect, getMyEnrollments);

router.put(
  '/me',
  protect,
  [
    body('firstName')
      .optional()
      .trim()
      .isLength({ min: 1 })
      .withMessage('First name cannot be empty.'),
    body('lastName')
      .optional()
      .trim()
      .isLength({ min: 1 })
      .withMessage('Last name cannot be empty.'),
    body('mobile')
      .optional()
      .trim()
      .isLength({ min: 6 })
      .withMessage('Please provide a valid mobile number.'),
    body('email')
      .optional()
      .custom(() => {
        throw new Error('Email updates require verification.');
      }),
  ],
  validateRequest,
  updateProfile
);

router.post(
  '/email-change/start',
  protect,
  [body('newEmail').isEmail().withMessage('A valid email is required.')],
  validateRequest,
  startEmailChange
);

router.post(
  '/email-change/verify',
  protect,
  [
    body('sessionId').trim().notEmpty().withMessage('Session id is required.'),
    body('otp').trim().notEmpty().withMessage('Verification code is required.'),
  ],
  validateRequest,
  verifyEmailChange
);

router.post('/account-delete/start', protect, startAccountDeletion);

router.post(
  '/account-delete/verify',
  protect,
  [
    body('sessionId').trim().notEmpty().withMessage('Session id is required.'),
    body('otp').trim().notEmpty().withMessage('Verification code is required.'),
  ],
  validateRequest,
  verifyAccountDeletion
);

router.put(
  '/me/password',
  protect,
  [
    body('currentPassword').notEmpty().withMessage('Current password is required.'),
    body('newPassword')
      .isLength({ min: 8 })
      .withMessage('New password must be at least 8 characters long.'),
    body('confirmNewPassword')
      .custom((value, { req }) => value === req.body.newPassword)
      .withMessage('Passwords do not match.'),
  ],
  validateRequest,
  updatePassword
);

module.exports = router;






