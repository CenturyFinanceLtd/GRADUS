const express = require('express');
const { body, param } = require('express-validator');
const {
  startAdminSignup,
  handleAdminSignupDecision,
  verifyAdminSignupOtp,
  completeAdminSignup,
  adminLogin,
  getAdminProfile,
  updateAdminProfile,
  updateAdminPassword,
  startAdminEmailChange,
  verifyAdminEmailChangeCurrent,
  verifyAdminEmailChangeNew,
  getAdminSignupSession,
} = require('../controllers/adminAuthController');
const validateRequest = require('../middleware/validateRequest');
const { protectAdmin } = require('../middleware/adminAuthMiddleware');

const router = express.Router();

router.post(
  '/signup/start',
  [
    body('fullName').trim().notEmpty().withMessage('Full name is required.'),
    body('email').isEmail().withMessage('A valid email is required.'),
    body('phoneNumber')
      .trim()
      .notEmpty()
      .withMessage('Phone number is required.')
      .isLength({ min: 6 })
      .withMessage('Please provide a valid phone number.'),
    body('department').optional({ checkFalsy: true }).trim(),
    body('designation').optional({ checkFalsy: true }).trim(),
    body('languages').optional(),
    body('bio').optional({ checkFalsy: true }).trim(),
    body('role').optional({ checkFalsy: true }).trim(),
  ],
  validateRequest,
  startAdminSignup
);

router.get('/signup/decision', handleAdminSignupDecision);

router.get(
  '/signup/session/:sessionId',
  [param('sessionId').trim().notEmpty().withMessage('Session id is required.')],
  validateRequest,
  getAdminSignupSession
);

router.post(
  '/signup/verify-otp',
  [
    body('sessionId').trim().notEmpty().withMessage('Session id is required.'),
    body('otp')
      .trim()
      .notEmpty()
      .withMessage('Verification code is required.')
      .isLength({ min: 4, max: 6 })
      .withMessage('Invalid verification code.'),
  ],
  validateRequest,
  verifyAdminSignupOtp
);

router.post(
  '/signup/complete',
  [
    body('sessionId').trim().notEmpty().withMessage('Session id is required.'),
    body('verificationToken')
      .trim()
      .notEmpty()
      .withMessage('Verification token is required.'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long.'),
    body('confirmPassword')
      .custom((value, { req }) => value === req.body.password)
      .withMessage('Passwords do not match.'),
  ],
  validateRequest,
  completeAdminSignup
);

router.post(
  '/login',
  [
    body('email').isEmail().withMessage('A valid email is required.'),
    body('password').notEmpty().withMessage('Password is required.'),
  ],
  validateRequest,
  adminLogin
);

router.get('/me', protectAdmin, getAdminProfile);

router.put(
  '/me',
  protectAdmin,
  [
    body('fullName')
      .optional()
      .trim()
      .isLength({ min: 2 })
      .withMessage('Full name must be at least 2 characters long.'),
    body('phoneNumber')
      .optional({ checkFalsy: true })
      .trim()
      .isLength({ min: 6 })
      .withMessage('Please provide a valid phone number.'),
    body('department').optional({ checkFalsy: true }).trim(),
    body('designation').optional({ checkFalsy: true }).trim(),
    body('bio').optional({ checkFalsy: true }).trim(),
    body('languages')
      .optional()
      .custom((value) => {
        if (Array.isArray(value)) {
          return value.every((item) => typeof item === 'string');
        }
        return typeof value === 'string';
      })
      .withMessage('Languages must be a comma separated string or an array of strings.'),
  ],
  validateRequest,
  updateAdminProfile
);

router.put(
  '/me/password',
  protectAdmin,
  [
    body('currentPassword').notEmpty().withMessage('Current password is required.'),
    body('newPassword')
      .isLength({ min: 8 })
      .withMessage('New password must be at least 8 characters long.'),
  ],
  validateRequest,
  updateAdminPassword
);

router.post(
  '/email/change/start',
  protectAdmin,
  [body('newEmail').isEmail().withMessage('A valid new email is required.')],
  validateRequest,
  startAdminEmailChange
);

router.post(
  '/email/change/verify-current',
  protectAdmin,
  [
    body('sessionId').trim().notEmpty().withMessage('Session id is required.'),
    body('otp')
      .trim()
      .notEmpty()
      .withMessage('Verification code is required.')
      .isLength({ min: 4, max: 6 })
      .withMessage('Invalid verification code.'),
  ],
  validateRequest,
  verifyAdminEmailChangeCurrent
);

router.post(
  '/email/change/verify-new',
  protectAdmin,
  [
    body('sessionId').trim().notEmpty().withMessage('Session id is required.'),
    body('otp')
      .trim()
      .notEmpty()
      .withMessage('Verification code is required.')
      .isLength({ min: 4, max: 6 })
      .withMessage('Invalid verification code.'),
  ],
  validateRequest,
  verifyAdminEmailChangeNew
);

module.exports = router;
