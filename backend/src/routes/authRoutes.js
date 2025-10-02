const express = require('express');
const { body } = require('express-validator');
const {
  startSignup,
  verifySignupOtp,
  completeSignup,
  login,
  logout,
} = require('../controllers/authController');
const validateRequest = require('../middleware/validateRequest');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.post(
  '/signup/start',
  [
    body('firstName').trim().notEmpty().withMessage('First name is required.'),
    body('lastName').trim().notEmpty().withMessage('Last name is required.'),
    body('email').isEmail().withMessage('A valid email is required.'),
    body('mobile')
      .trim()
      .notEmpty()
      .withMessage('Mobile number is required.')
      .isLength({ min: 6 })
      .withMessage('Please provide a valid mobile number.'),
  ],
  validateRequest,
  startSignup
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
  verifySignupOtp
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
  completeSignup
);

router.post(
  '/login',
  [
    body('email').isEmail().withMessage('A valid email is required.'),
    body('password').notEmpty().withMessage('Password is required.'),
  ],
  validateRequest,
  login
);

router.post('/logout', protect, logout);

module.exports = router;
