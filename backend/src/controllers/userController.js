/*
  User controller
  - Authenticated user profile and related operations
*/
const asyncHandler = require('express-async-handler');
const bcrypt = require('bcryptjs');
const { Types } = require('mongoose');
const User = require('../models/User');
const VerificationSession = require('../models/VerificationSession');
const Enrollment = require('../models/Enrollment');
const generateOtp = require('../utils/generateOtp');
const { sendOtpEmail, deliveryMode } = require('../utils/email');

const getProfile = asyncHandler(async (req, res) => {
  res.json({ user: req.user });
});

const updateProfile = asyncHandler(async (req, res) => {
  const { firstName, lastName, mobile, whatsappNumber, personalDetails, educationDetails } = req.body;

  const user = await User.findById(req.user._id);

  if (!user) {
    res.status(404);
    throw new Error('User not found.');
  }

  if (typeof firstName === 'string') {
    user.firstName = firstName;
  }

  if (typeof lastName === 'string') {
    user.lastName = lastName;
  }

  if (typeof mobile === 'string') {
    user.mobile = mobile.trim();
  }

  if (typeof whatsappNumber === 'string') {
    const trimmedWhatsApp = whatsappNumber.trim();
    if (trimmedWhatsApp) {
      user.whatsappNumber = trimmedWhatsApp;
      user.mobile = trimmedWhatsApp;
    }
  }

  const assignNestedString = (target, source, field, { allowEmpty = false } = {}) => {
    if (!source || typeof source !== 'object') {
      return;
    }

    if (Object.prototype.hasOwnProperty.call(source, field)) {
      const raw = source[field];
      if (typeof raw === 'string') {
        const trimmed = raw.trim();
        if (trimmed || allowEmpty) {
          target[field] = trimmed;
        }
      }
    }
  };

  if (personalDetails && typeof personalDetails === 'object') {
    if (!user.personalDetails) {
      user.personalDetails = {};
    }

    assignNestedString(user.personalDetails, personalDetails, 'studentName');
    assignNestedString(user.personalDetails, personalDetails, 'gender');
    assignNestedString(user.personalDetails, personalDetails, 'dateOfBirth');
    assignNestedString(user.personalDetails, personalDetails, 'city');
    assignNestedString(user.personalDetails, personalDetails, 'state');
    assignNestedString(user.personalDetails, personalDetails, 'country');
    assignNestedString(user.personalDetails, personalDetails, 'zipCode');
    assignNestedString(user.personalDetails, personalDetails, 'address', { allowEmpty: true });
  }

  if (educationDetails && typeof educationDetails === 'object') {
    if (!user.educationDetails) {
      user.educationDetails = {};
    }

    assignNestedString(user.educationDetails, educationDetails, 'institutionName');
    assignNestedString(user.educationDetails, educationDetails, 'passingYear');
    assignNestedString(user.educationDetails, educationDetails, 'fieldOfStudy', { allowEmpty: true });
    assignNestedString(user.educationDetails, educationDetails, 'address', { allowEmpty: true });
  }

  await user.save();

  res.json({ user });
});

const startEmailChange = asyncHandler(async (req, res) => {
  const { newEmail } = req.body;
  const normalizedEmail = newEmail.toLowerCase().trim();

  if (normalizedEmail === req.user.email) {
    res.status(400);
    throw new Error('You are already using this email address.');
  }

  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    res.status(409);
    throw new Error('Another account already uses this email.');
  }

  await VerificationSession.deleteMany({ type: 'EMAIL_CHANGE', user: req.user._id });

  const otp = generateOtp();
  const otpHash = await bcrypt.hash(otp, 10);
  const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

  const session = await VerificationSession.create({
    type: 'EMAIL_CHANGE',
    email: normalizedEmail,
    user: req.user._id,
    otpHash,
    otpExpiresAt,
  });

  let emailResult;
  try {
    emailResult = await sendOtpEmail({
      to: normalizedEmail,
      otp,
      context: {
        title: 'Confirm your new email address',
        action: 'updating your Gradus profile email',
      },
    });
  } catch (error) {
    console.error('[user] Failed to send email-change OTP:', error.message);
    await session.deleteOne();
    throw new Error('We could not send a verification code. Please try again later.');
  }

  const responsePayload = {
    sessionId: session._id.toString(),
    email: normalizedEmail,
  };

  if (emailResult?.mocked && deliveryMode !== 'live') {
    responsePayload.devOtp = otp;
  }

  res.json(responsePayload);
});

const verifyEmailChange = asyncHandler(async (req, res) => {
  const { sessionId, otp } = req.body;

  if (!Types.ObjectId.isValid(sessionId)) {
    res.status(400);
    throw new Error('Invalid session identifier.');
  }

  const session = await VerificationSession.findById(sessionId).select('+otpHash');

  if (!session || session.type !== 'EMAIL_CHANGE') {
    res.status(400);
    throw new Error('Session could not be found. Please restart the email update.');
  }

  if (session.user.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('You are not allowed to access this session.');
  }

  if (session.otpExpiresAt.getTime() < Date.now()) {
    await session.deleteOne();
    res.status(410);
    throw new Error('The verification code has expired. Please request a new one.');
  }

  const isMatch = await bcrypt.compare(otp, session.otpHash);
  if (!isMatch) {
    res.status(401);
    throw new Error('Invalid verification code.');
  }

  const user = await User.findById(req.user._id);
  user.email = session.email;
  user.emailVerified = true;
  await user.save();

  session.status = 'COMPLETED';
  await session.deleteOne();

  res.json({ user });
});

const updatePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id).select('+password');

  if (!user) {
    res.status(404);
    throw new Error('User not found.');
  }

  const isMatch = await user.matchPassword(currentPassword);
  if (!isMatch) {
    res.status(401);
    throw new Error('Your current password is incorrect.');
  }

  user.password = await bcrypt.hash(newPassword, 12);
  await user.save();

  res.json({ message: 'Password updated successfully.' });
});

const startAccountDeletion = asyncHandler(async (req, res) => {
  await VerificationSession.deleteMany({ type: 'ACCOUNT_DELETE', user: req.user._id });

  const otp = generateOtp();
  const otpHash = await bcrypt.hash(otp, 10);
  const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

  const session = await VerificationSession.create({
    type: 'ACCOUNT_DELETE',
    email: req.user.email,
    user: req.user._id,
    otpHash,
    otpExpiresAt,
  });

  let emailResult;
  try {
    emailResult = await sendOtpEmail({
      to: req.user.email,
      otp,
      context: {
        title: 'Account deletion requested',
        action: 'deleting your Gradus account',
      },
    });
  } catch (error) {
    console.error('[user] Failed to send account deletion OTP:', error.message);
    await session.deleteOne();
    throw new Error('We could not send a verification code. Please try again later.');
  }

  const responsePayload = {
    sessionId: session._id.toString(),
    email: req.user.email,
  };

  if (emailResult?.mocked && deliveryMode !== 'live') {
    responsePayload.devOtp = otp;
  }

  res.json(responsePayload);
});

const verifyAccountDeletion = asyncHandler(async (req, res) => {
  const { sessionId, otp } = req.body;

  if (!Types.ObjectId.isValid(sessionId)) {
    res.status(400);
    throw new Error('Invalid session identifier.');
  }

  const session = await VerificationSession.findById(sessionId).select('+otpHash');

  if (!session || session.type !== 'ACCOUNT_DELETE') {
    res.status(400);
    throw new Error('Session could not be found. Please restart the deletion process.');
  }

  if (session.user.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('You are not allowed to access this session.');
  }

  if (session.otpExpiresAt.getTime() < Date.now()) {
    await session.deleteOne();
    res.status(410);
    throw new Error('The verification code has expired. Please request a new one.');
  }

  const isMatch = await bcrypt.compare(otp, session.otpHash);
  if (!isMatch) {
    res.status(401);
    throw new Error('Invalid verification code.');
  }

  await session.deleteOne();
  await VerificationSession.deleteMany({ user: req.user._id });
  await User.deleteOne({ _id: req.user._id });

  res.json({ message: 'Account deleted successfully.' });
});

const getMyEnrollments = asyncHandler(async (req, res) => {
  const enrollments = await Enrollment.find({
    user: req.user._id,
    status: 'ACTIVE',
  })
    .sort({ createdAt: -1 })
    // Include image so the frontend can render course thumbnails on My Courses
    .populate('course', 'name slug subtitle focus price hero stats image')
    .lean();

  const items = Array.isArray(enrollments)
    ? enrollments.map((enrollment) => ({
        id: enrollment._id.toString(),
        status: enrollment.status,
        paymentStatus: enrollment.paymentStatus,
        enrolledAt: enrollment.createdAt,
        paymentReference: enrollment.paymentReference || null,
        paidAt: enrollment.paidAt || null,
        currency: enrollment.currency || 'INR',
        priceBase: typeof enrollment.priceBase === 'number' ? enrollment.priceBase : null,
        priceTax: typeof enrollment.priceTax === 'number' ? enrollment.priceTax : null,
        priceTotal: typeof enrollment.priceTotal === 'number' ? enrollment.priceTotal : null,
        course: enrollment.course
          ? {
              id: enrollment.course._id?.toString?.() || '',
              slug: enrollment.course.slug || '',
              name: enrollment.course.name || '',
              subtitle: enrollment.course.subtitle || '',
              focus: enrollment.course.focus || '',
              price: enrollment.course.price || '',
              hero: enrollment.course.hero || {},
              // Flatten image URL for convenient frontend use
              imageUrl:
                (enrollment.course.image && enrollment.course.image.url) || '',
            }
          : null,
      }))
    : [];

  res.json({ items });
});

module.exports = {
  getProfile,
  updateProfile,
  startEmailChange,
  verifyEmailChange,
  updatePassword,
  startAccountDeletion,
  verifyAccountDeletion,
  getMyEnrollments,
};







