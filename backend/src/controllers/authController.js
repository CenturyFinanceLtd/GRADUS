const asyncHandler = require('express-async-handler');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { Types } = require('mongoose');
const User = require('../models/User');
const VerificationSession = require('../models/VerificationSession');
const generateOtp = require('../utils/generateOtp');
const { sendOtpEmail, deliveryMode } = require('../utils/email');
const generateAuthToken = require('../utils/token');

const buildAuthResponse = (user) => {
  const token = generateAuthToken(user._id.toString());
  const safeUser = user.toObject();
  delete safeUser.password;

  return { token, user: safeUser };
};

const startSignup = asyncHandler(async (req, res) => {
  const { firstName, lastName, email, mobile } = req.body;
  const normalizedEmail = email.toLowerCase().trim();

  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    res.status(409);
    throw new Error('An account with this email already exists. Try signing in instead.');
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
    payload: {
      firstName,
      lastName,
      mobile,
    },
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

  const normalizedEmail = session.email;

  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    await session.deleteOne();
    res.status(409);
    throw new Error('An account with this email already exists.');
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const user = await User.create({
    firstName: session.payload.firstName,
    lastName: session.payload.lastName,
    email: normalizedEmail,
    mobile: session.payload.mobile,
    password: hashedPassword,
    emailVerified: true,
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
  res.status(200).json(authResponse);
});

module.exports = {
  startSignup,
  verifySignupOtp,
  completeSignup,
  login,
};



