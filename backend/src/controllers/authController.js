const asyncHandler = require('express-async-handler');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { Types } = require('mongoose');
const User = require('../models/User');
const VerificationSession = require('../models/VerificationSession');
const UserAuthLog = require('../models/UserAuthLog');
const generateOtp = require('../utils/generateOtp');
const { sendOtpEmail, deliveryMode } = require('../utils/email');
const generateAuthToken = require('../utils/token');

const sanitizeString = (value) => (typeof value === 'string' ? value.trim() : '');

const resolveRequestIp = (req) => {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded && typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }

  if (Array.isArray(forwarded) && forwarded.length > 0) {
    return String(forwarded[0]).trim();
  }

  if (req.ip) {
    return req.ip;
  }

  return '';
};

const recordAuthEvent = async ({ userId, type, req }) => {
  if (!userId || !type) {
    return;
  }

  try {
    await UserAuthLog.create({
      user: userId,
      type,
      userAgent: req.get('user-agent') || '',
      ipAddress: resolveRequestIp(req),
    });
  } catch (error) {
    console.error(`[auth] Failed to record ${type.toLowerCase()} event`, error);
  }
};

const mergeSignupPayload = (base = {}, overrides = {}) => ({
  ...base,
  ...overrides,
  personalDetails: {
    ...(base.personalDetails || {}),
    ...(overrides.personalDetails || {}),
  },
  parentDetails: {
    ...(base.parentDetails || {}),
    ...(overrides.parentDetails || {}),
  },
  educationDetails: {
    ...(base.educationDetails || {}),
    ...(overrides.educationDetails || {}),
  },
});

const buildSignupDetails = (raw = {}) => {
  const personalDetailsRaw = raw.personalDetails || {};
  const parentDetailsRaw = raw.parentDetails || {};
  const educationDetailsRaw = raw.educationDetails || {};

  const rawParentDetails = {
    title: sanitizeString(parentDetailsRaw.title),
    fullName: sanitizeString(parentDetailsRaw.fullName),
    relation: sanitizeString(parentDetailsRaw.relation),
    phone: sanitizeString(parentDetailsRaw.phone),
    email: sanitizeString(parentDetailsRaw.email),
    jobTitle: sanitizeString(parentDetailsRaw.jobTitle),
    address: sanitizeString(parentDetailsRaw.address),
  };

  const parentDetails = Object.fromEntries(
    Object.entries(rawParentDetails).filter(([, value]) => Boolean(value))
  );

  const rawEducationDetails = {
    institutionName: sanitizeString(educationDetailsRaw.institutionName),
    passingYear: sanitizeString(educationDetailsRaw.passingYear),
    fieldOfStudy: sanitizeString(
      educationDetailsRaw.fieldOfStudy || educationDetailsRaw.board
    ),
    classGrade: sanitizeString(educationDetailsRaw.classGrade),
    address: sanitizeString(educationDetailsRaw.address),
  };

  const educationDetails = Object.fromEntries(
    Object.entries(rawEducationDetails).filter(([, value]) => Boolean(value))
  );

  return {
    firstName: sanitizeString(raw.firstName),
    lastName: sanitizeString(raw.lastName),
    mobile: sanitizeString(raw.mobile),
    personalDetails: {
      studentName: sanitizeString(personalDetailsRaw.studentName),
      gender: sanitizeString(personalDetailsRaw.gender),
      dateOfBirth: sanitizeString(personalDetailsRaw.dateOfBirth),
      city: sanitizeString(personalDetailsRaw.city),
      state: sanitizeString(personalDetailsRaw.state),
      country: sanitizeString(personalDetailsRaw.country),
      zipCode: sanitizeString(personalDetailsRaw.zipCode),
      address: sanitizeString(personalDetailsRaw.address),
    },
    parentDetails: Object.keys(parentDetails).length ? parentDetails : null,
    educationDetails,
  };
};

const validateSignupDetails = (details) => {
  if (!details.personalDetails.studentName) {
    return 'Student name is required.';
  }

  if (!details.firstName || !details.lastName) {
    return 'Student name is required.';
  }

  if (!details.mobile) {
    return 'Phone number is required.';
  }

  if (!details.personalDetails.gender) {
    return 'Gender is required.';
  }

  if (!details.personalDetails.dateOfBirth) {
    return 'Date of birth is required.';
  }

  if (!details.personalDetails.city) {
    return 'City is required.';
  }

  if (!details.personalDetails.state) {
    return 'State is required.';
  }

  if (!details.personalDetails.country) {
    return 'Country is required.';
  }

  if (!details.personalDetails.zipCode) {
    return 'Zip code is required.';
  }

  if (!details.educationDetails.institutionName) {
    return 'Education institution name is required.';
  }

  if (!details.educationDetails.passingYear) {
    return 'Education passing year is required.';
  }

  if (!details.educationDetails.fieldOfStudy) {
    return 'Field of study is required.';
  }

  return null;
};

const buildAuthResponse = (user) => {
  const token = generateAuthToken(user._id.toString());
  const safeUser = user.toObject();
  delete safeUser.password;

  return { token, user: safeUser };
};

const startSignup = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    res.status(400);
    throw new Error('Email is required.');
  }

  const normalizedEmail = email.toLowerCase().trim();

  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    res.status(409);
    throw new Error('An account with this email already exists. Try signing in instead.');
  }

  const signupDetails = buildSignupDetails(req.body);
  const validationError = validateSignupDetails(signupDetails);
  if (validationError) {
    res.status(400);
    throw new Error(validationError);
  }

  await VerificationSession.deleteMany({ type: 'SIGNUP', email: normalizedEmail });

  const otp = generateOtp();
  const otpHash = await bcrypt.hash(otp, 10);
  const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

  const session = await VerificationSession.create({
    type: 'SIGNUP',
    email: normalizedEmail,
    otpHash,
    otpExpiresAt,
    payload: signupDetails,
  });

  let emailResult;
  try {
    emailResult = await sendOtpEmail({
      to: normalizedEmail,
      otp,
      context: {
        title: 'Verify your email address',
        action: 'your Gradus account registration',
      },
    });
  } catch (error) {
    console.error('[auth] Failed to send signup OTP email:', error.message);
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

  res.status(200).json(responsePayload);
});

const verifySignupOtp = asyncHandler(async (req, res) => {
  const { sessionId, otp } = req.body;

  if (!Types.ObjectId.isValid(sessionId)) {
    res.status(400);
    throw new Error('Invalid session identifier.');
  }

  const session = await VerificationSession.findById(sessionId).select('+otpHash');

  if (!session || session.type !== 'SIGNUP') {
    res.status(400);
    throw new Error('Session could not be found. Please restart the sign-up.');
  }

  if (session.status === 'COMPLETED') {
    res.status(400);
    throw new Error('This session has already been completed.');
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

  const verificationToken = crypto.randomBytes(24).toString('hex');
  session.verificationToken = verificationToken;
  session.status = 'OTP_VERIFIED';
  await session.save();

  res.status(200).json({ sessionId: session._id.toString(), verificationToken });
});

const completeSignup = asyncHandler(async (req, res) => {
  const { sessionId, verificationToken, password } = req.body;

  if (!Types.ObjectId.isValid(sessionId)) {
    res.status(400);
    throw new Error('Invalid session identifier.');
  }

  const session = await VerificationSession.findById(sessionId);

  if (!session || session.type !== 'SIGNUP') {
    res.status(400);
    throw new Error('Session could not be found. Please restart the sign-up.');
  }

  if (session.status !== 'OTP_VERIFIED') {
    res.status(400);
    throw new Error('Email verification is still pending.');
  }

  if (!verificationToken || session.verificationToken !== verificationToken) {
    res.status(400);
    throw new Error('Verification token mismatch. Please restart the sign-up.');
  }

  if (!password) {
    res.status(400);
    throw new Error('Password is required to complete the sign-up.');
  }

  const normalizedEmail = session.email;

  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    await session.deleteOne();
    res.status(409);
    throw new Error('An account with this email already exists.');
  }

  const overrides = {};
  if (req.body.firstName !== undefined) {
    overrides.firstName = req.body.firstName;
  }
  if (req.body.lastName !== undefined) {
    overrides.lastName = req.body.lastName;
  }
  if (req.body.mobile !== undefined) {
    overrides.mobile = req.body.mobile;
  }
  if (req.body.personalDetails) {
    overrides.personalDetails = req.body.personalDetails;
  }
  if (req.body.parentDetails) {
    overrides.parentDetails = req.body.parentDetails;
  }
  if (req.body.educationDetails) {
    overrides.educationDetails = req.body.educationDetails;
  }

  const mergedPayload = mergeSignupPayload(session.payload || {}, overrides);
  const signupDetails = buildSignupDetails(mergedPayload);
  const validationError = validateSignupDetails(signupDetails);
  if (validationError) {
    res.status(400);
    throw new Error(`${validationError} Please restart the sign-up.`);
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const user = await User.create({
    firstName: signupDetails.firstName,
    lastName: signupDetails.lastName,
    email: normalizedEmail,
    mobile: signupDetails.mobile,
    password: hashedPassword,
    emailVerified: true,
    personalDetails: signupDetails.personalDetails,
    ...(signupDetails.parentDetails
      ? { parentDetails: signupDetails.parentDetails }
      : {}),
    educationDetails: signupDetails.educationDetails,
  });

  session.status = 'COMPLETED';
  await session.deleteOne();

  const authResponse = buildAuthResponse(user);
  res.status(201).json(authResponse);
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const normalizedEmail = email.toLowerCase().trim();

  const user = await User.findOne({ email: normalizedEmail }).select('+password');

  if (!user) {
    res.status(401);
    throw new Error('Invalid email or password.');
  }

  const isMatch = await user.matchPassword(password);

  if (!isMatch) {
    res.status(401);
    throw new Error('Invalid email or password.');
  }

  if (!user.emailVerified) {
    user.emailVerified = true;
    await user.save();
  }

  const safeUser = await User.findById(user._id);
  const authResponse = buildAuthResponse(safeUser);

  recordAuthEvent({ userId: user._id, type: 'LOGIN', req });
  res.status(200).json(authResponse);
});

const logout = asyncHandler(async (req, res) => {
  if (req.user?._id) {
    recordAuthEvent({ userId: req.user._id, type: 'LOGOUT', req });
  }

  res.status(200).json({ message: 'Logged out successfully.' });
});

module.exports = {
  startSignup,
  verifySignupOtp,
  completeSignup,
  login,
  logout,
};
