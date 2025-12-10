/*
  User routes (profile and related endpoints)
  - Requires user authentication
  - Mounted at /api/users
*/
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
  registerPushToken,
} = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');
const validateRequest = require('../middleware/validateRequest');

const router = express.Router();

router.get('/me', protect, getProfile);
router.post('/me/push-token', protect, registerPushToken); // Use explicit path
router.post('/push-token', protect, registerPushToken); // Alias for compatibility
router.get('/me/enrollments', protect, getMyEnrollments);

router.patch(
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
    body('whatsappNumber')
      .optional()
      .trim()
      .isLength({ min: 6 })
      .withMessage('Please provide a valid WhatsApp number.'),
    body('personalDetails')
      .optional()
      .isObject()
      .withMessage('Personal details must be an object.'),
    body('personalDetails.studentName')
      .optional()
      .trim()
      .isLength({ min: 1 })
      .withMessage('Student name cannot be empty.'),
    body('personalDetails.gender')
      .optional()
      .trim()
      .isLength({ min: 1 })
      .withMessage('Gender cannot be empty.'),
    body('personalDetails.dateOfBirth')
      .optional()
      .trim()
      .isLength({ min: 1 })
      .withMessage('Date of birth cannot be empty.'),
    body('personalDetails.city')
      .optional()
      .trim()
      .isLength({ min: 1 })
      .withMessage('City cannot be empty.'),
    body('personalDetails.state')
      .optional()
      .trim()
      .isLength({ min: 1 })
      .withMessage('State cannot be empty.'),
    body('personalDetails.country')
      .optional()
      .trim()
      .isLength({ min: 1 })
      .withMessage('Country cannot be empty.'),
    body('personalDetails.zipCode')
      .optional()
      .trim()
      .isLength({ min: 1 })
      .withMessage('Zip code cannot be empty.'),
    body('personalDetails.address').optional().trim(),
    body('educationDetails')
      .optional()
      .isObject()
      .withMessage('Education details must be an object.'),
    body('educationDetails.institutionName')
      .optional()
      .trim()
      .isLength({ min: 1 })
      .withMessage('Institution name cannot be empty.'),
    body('educationDetails.passingYear')
      .optional()
      .trim()
      .isLength({ min: 1 })
      .withMessage('Passing year cannot be empty.'),
    body('educationDetails.fieldOfStudy').optional().trim(),
    body('educationDetails.address').optional().trim(),
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






