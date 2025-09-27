const asyncHandler = require('express-async-handler');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { Types } = require('mongoose');
const config = require('../config/env');
const AdminUser = require('../models/AdminUser');
const VerificationSession = require('../models/VerificationSession');
const generateOtp = require('../utils/generateOtp');
const { sendOtpEmail, sendAdminApprovalEmail, deliveryMode } = require('../utils/email');
const generateAuthToken = require('../utils/token');

const buildAdminAuthResponse = (admin) => {
  const token = generateAuthToken(admin._id.toString());
  const safeAdmin = admin.toObject ? admin.toObject() : admin;
  delete safeAdmin.password;

  return { token, admin: safeAdmin };
};

const normaliseLanguages = (languages) => {
  if (!languages) {
    return [];
  }
  if (Array.isArray(languages)) {
    return languages.map((lang) => lang.trim()).filter(Boolean);
  }
  if (typeof languages === 'string') {
    return languages
      .split(',')
      .map((lang) => lang.trim())
      .filter(Boolean);
  }
  return [];
};

const startAdminSignup = asyncHandler(async (req, res) => {
  const { fullName, email, phoneNumber, department, designation, languages, bio, role } = req.body;

  const normalizedEmail = email.toLowerCase().trim();

  const existingAdmin = await AdminUser.findOne({ email: normalizedEmail });
  if (existingAdmin) {
    res.status(409);
    throw new Error('An account with this email already exists. Try signing in instead.');
  }

  await VerificationSession.deleteMany({ type: 'ADMIN_SIGNUP', email: normalizedEmail });

  const approvalToken = crypto.randomBytes(24).toString('hex');
  const payload = {
    fullName: fullName.trim(),
    phoneNumber: phoneNumber.trim(),
    department: department ? department.trim() : '',
    designation: designation ? designation.trim() : '',
    languages: normaliseLanguages(languages),
    bio: bio ? bio.trim() : '',
    role: role ? role.trim() : 'admin',
  };

  const session = await VerificationSession.create({
    type: 'ADMIN_SIGNUP',
    email: normalizedEmail,
    status: 'APPROVAL_PENDING',
    approvalToken,
    payload,
  });

  const approvalUrl = `${config.serverUrl}/api/admin/auth/signup/decision?sessionId=${session._id.toString()}&token=${approvalToken}&decision=approve`;
  const rejectionUrl = `${config.serverUrl}/api/admin/auth/signup/decision?sessionId=${session._id.toString()}&token=${approvalToken}&decision=reject`;

  try {
    await sendAdminApprovalEmail({
      to: config.admin.approverEmail,
      requester: { ...payload, email: normalizedEmail },
      approvalUrl,
      rejectionUrl,
      portalName: config.admin.portalName,
    });
  } catch (error) {
    console.error('[admin-auth] Failed to send approval email:', error.message);
    await session.deleteOne();
    throw new Error('We could not start the approval process. Please try again later.');
  }

  res.status(200).json({
    sessionId: session._id.toString(),
    email: normalizedEmail,
    status: session.status,
    approverEmail: config.admin.approverEmail,
  });
});

const handleAdminSignupDecision = asyncHandler(async (req, res) => {
  const { sessionId, token, decision } = req.query;

  if (!Types.ObjectId.isValid(sessionId)) {
    res.status(400);
    res.send('<h2>Invalid approval link</h2><p>The approval link appears to be invalid or expired.</p>');
    return;
  }

  const normalizedDecision = (decision || '').toLowerCase();

  if (!['approve', 'reject'].includes(normalizedDecision)) {
    res.status(400);
    res.send('<h2>Invalid decision</h2><p>The requested action is not recognised.</p>');
    return;
  }

  const session = await VerificationSession.findById(sessionId).select('+otpHash');

  if (!session || session.type !== 'ADMIN_SIGNUP') {
    res.status(404);
    res.send('<h2>Request not found</h2><p>This signup request could not be located.</p>');
    return;
  }

  if (session.approvalToken !== token) {
    res.status(403);
    res.send('<h2>Link mismatch</h2><p>The approval token does not match this request.</p>');
    return;
  }

  if (session.status === 'REJECTED') {
    res.send('<h2>Already rejected</h2><p>This signup request has already been rejected.</p>');
    return;
  }

  if (['OTP_PENDING', 'OTP_VERIFIED', 'COMPLETED'].includes(session.status)) {
    res.send('<h2>Already approved</h2><p>This signup request has already been approved.</p>');
    return;
  }

  if (normalizedDecision === 'reject') {
    session.status = 'REJECTED';
    session.approvalRespondedAt = new Date();
    await session.save();
    res.send('<h2>Request rejected</h2><p>No verification email was sent to the requester.</p>');
    return;
  }

  const otp = generateOtp();
  session.otpHash = await bcrypt.hash(otp, 10);
  session.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
  session.status = 'OTP_PENDING';
  session.approvalRespondedAt = new Date();

  try {
    await session.save();
    await sendOtpEmail({
      to: session.email,
      otp,
      context: {
        title: 'Verify your Gradus admin email',
        action: 'your Gradus admin portal registration',
      },
    });
  } catch (error) {
    console.error('[admin-auth] Failed to send OTP email:', error.message);
    session.otpHash = undefined;
    session.otpExpiresAt = undefined;
    session.status = 'APPROVAL_PENDING';
    session.approvalRespondedAt = undefined;
    await session.save();
    res.status(500);
    res.send('<h2>Delivery issue</h2><p>We could not deliver the verification code to the requester. Please try again later.</p>');
    return;
  }

  res.send('<h2>Approved</h2><p>The requester has been emailed a one-time code to continue registration.</p>');
});

const verifyAdminSignupOtp = asyncHandler(async (req, res) => {
  const { sessionId, otp } = req.body;

  if (!Types.ObjectId.isValid(sessionId)) {
    res.status(400);
    throw new Error('Invalid session identifier.');
  }

  const session = await VerificationSession.findById(sessionId).select('+otpHash');

  if (!session || session.type !== 'ADMIN_SIGNUP') {
    res.status(400);
    throw new Error('Session could not be found. Please restart the sign-up.');
  }

  if (session.status === 'REJECTED') {
    res.status(403);
    throw new Error('Your signup request was not approved.');
  }

  if (session.status === 'APPROVAL_PENDING') {
    res.status(403);
    throw new Error('Your signup request is still awaiting approval.');
  }

  if (!session.otpHash || !session.otpExpiresAt) {
    res.status(400);
    throw new Error('No verification code is available for this session.');
  }

  if (session.otpExpiresAt.getTime() < Date.now()) {
    await session.deleteOne();
    res.status(410);
    throw new Error('The verification code has expired. Please restart the sign-up.');
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

const completeAdminSignup = asyncHandler(async (req, res) => {
  const { sessionId, verificationToken, password } = req.body;

  if (!Types.ObjectId.isValid(sessionId)) {
    res.status(400);
    throw new Error('Invalid session identifier.');
  }

  const session = await VerificationSession.findById(sessionId);

  if (!session || session.type !== 'ADMIN_SIGNUP') {
    res.status(400);
    throw new Error('Session could not be found. Please restart the sign-up.');
  }

  if (session.status === 'REJECTED') {
    res.status(403);
    throw new Error('Your signup request was not approved.');
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

  const existingAdmin = await AdminUser.findOne({ email: normalizedEmail });
  if (existingAdmin) {
    await session.deleteOne();
    res.status(409);
    throw new Error('An account with this email already exists.');
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const admin = await AdminUser.create({
    fullName: session.payload.fullName,
    email: normalizedEmail,
    phoneNumber: session.payload.phoneNumber,
    department: session.payload.department,
    designation: session.payload.designation,
    languages: session.payload.languages || [],
    bio: session.payload.bio,
    role: session.payload.role,
    password: hashedPassword,
    emailVerified: true,
  });

  session.status = 'COMPLETED';
  await session.deleteOne();

  const authResponse = buildAdminAuthResponse(admin);
  res.status(201).json(authResponse);
});

const adminLogin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const normalizedEmail = email.toLowerCase().trim();

  const admin = await AdminUser.findOne({ email: normalizedEmail }).select('+password');

  if (!admin) {
    res.status(401);
    throw new Error('Invalid email or password.');
  }

  const isMatch = await admin.matchPassword(password);

  if (!isMatch) {
    res.status(401);
    throw new Error('Invalid email or password.');
  }

  if (!admin.emailVerified) {
    admin.emailVerified = true;
    await admin.save();
  }

  const safeAdmin = await AdminUser.findById(admin._id);
  const authResponse = buildAdminAuthResponse(safeAdmin);
  res.status(200).json(authResponse);
});

const getAdminProfile = asyncHandler(async (req, res) => {
  res.status(200).json(req.admin);
});

const updateAdminProfile = asyncHandler(async (req, res) => {
  const { fullName, phoneNumber, department, designation, languages, bio } = req.body;

  const admin = await AdminUser.findById(req.admin._id);

  if (!admin) {
    res.status(404);
    throw new Error('Admin account not found.');
  }

  if (typeof fullName === 'string') {
    admin.fullName = fullName.trim();
  }

  if (typeof phoneNumber === 'string') {
    admin.phoneNumber = phoneNumber.trim();
  }

  if (typeof department === 'string') {
    admin.department = department.trim();
  }

  if (typeof designation === 'string') {
    admin.designation = designation.trim();
  }

  if (typeof bio === 'string') {
    admin.bio = bio.trim();
  }

  if (languages !== undefined) {
    admin.languages = normaliseLanguages(languages);
  }

  await admin.save();

  res.status(200).json(admin.toJSON());
});

const updateAdminPassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const admin = await AdminUser.findById(req.admin._id).select('+password');

  if (!admin) {
    res.status(404);
    throw new Error('Admin account not found.');
  }

  const isMatch = await admin.matchPassword(currentPassword);

  if (!isMatch) {
    res.status(401);
    throw new Error('Your current password is incorrect.');
  }

  admin.password = await bcrypt.hash(newPassword, 12);
  await admin.save();

  res.status(200).json({ message: 'Password updated successfully.' });
});

const startAdminEmailChange = asyncHandler(async (req, res) => {
  const { newEmail } = req.body;

  if (!newEmail) {
    res.status(400);
    throw new Error('A new email address is required.');
  }

  const normalizedNewEmail = newEmail.toLowerCase().trim();

  if (normalizedNewEmail === req.admin.email) {
    res.status(400);
    throw new Error('You are already using this email address.');
  }

  const existingAdmin = await AdminUser.findOne({ email: normalizedNewEmail });
  if (existingAdmin) {
    res.status(409);
    throw new Error('Another admin already uses this email address.');
  }

  await VerificationSession.deleteMany({ type: 'ADMIN_EMAIL_CHANGE', user: req.admin._id });

  const otp = generateOtp();
  const otpHash = await bcrypt.hash(otp, 10);
  const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

  const session = await VerificationSession.create({
    type: 'ADMIN_EMAIL_CHANGE',
    email: req.admin.email,
    user: req.admin._id,
    otpHash,
    otpExpiresAt,
    status: 'CURRENT_OTP_PENDING',
    payload: { newEmail: normalizedNewEmail },
  });

  let emailResult;
  try {
    emailResult = await sendOtpEmail({
      to: req.admin.email,
      otp,
      context: {
        title: 'Confirm your current email',
        action: 'changing your Gradus admin email address',
      },
    });
  } catch (error) {
    console.error('[admin-auth] Failed to send current email verification OTP:', error.message);
    await session.deleteOne();
    throw new Error('We could not send a verification code to your current email. Please try again later.');
  }

  const response = {
    sessionId: session._id.toString(),
    currentEmail: req.admin.email,
  };

  if (emailResult?.mocked && deliveryMode !== 'live') {
    response.devOtp = otp;
  }

  res.status(200).json(response);
});

const verifyAdminEmailChangeCurrent = asyncHandler(async (req, res) => {
  const { sessionId, otp } = req.body;

  if (!Types.ObjectId.isValid(sessionId)) {
    res.status(400);
    throw new Error('Invalid session identifier.');
  }

  const session = await VerificationSession.findById(sessionId).select('+otpHash');

  if (!session || session.type !== 'ADMIN_EMAIL_CHANGE') {
    res.status(400);
    throw new Error('Email change session could not be found.');
  }

  if (session.user.toString() !== req.admin._id.toString()) {
    res.status(403);
    throw new Error('You are not allowed to access this session.');
  }

  if (session.status !== 'CURRENT_OTP_PENDING') {
    res.status(400);
    throw new Error('Current email verification has already been completed.');
  }

  if (!session.otpHash || session.otpExpiresAt?.getTime() < Date.now()) {
    await session.deleteOne();
    res.status(410);
    throw new Error('The verification code has expired. Please restart the email change process.');
  }

  const isMatch = await bcrypt.compare(otp, session.otpHash);
  if (!isMatch) {
    res.status(401);
    throw new Error('Invalid verification code.');
  }

  const newEmail = session.payload?.newEmail;
  if (!newEmail) {
    await session.deleteOne();
    res.status(400);
    throw new Error('New email information is missing. Please restart the process.');
  }

  const newOtp = generateOtp();
  const newOtpHash = await bcrypt.hash(newOtp, 10);
  const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

  let emailResult;
  try {
    emailResult = await sendOtpEmail({
      to: newEmail,
      otp: newOtp,
      context: {
        title: 'Verify your new email address',
        action: 'changing your Gradus admin email address',
      },
    });
  } catch (error) {
    console.error('[admin-auth] Failed to send new email verification OTP:', error.message);
    throw new Error('We could not send a verification code to the new email. Please try again later.');
  }

  session.otpHash = newOtpHash;
  session.otpExpiresAt = otpExpiresAt;
  session.status = 'NEW_OTP_PENDING';
  session.email = newEmail;
  await session.save();

  const response = { sessionId: session._id.toString(), newEmail };
  if (emailResult?.mocked && deliveryMode !== 'live') {
    response.devOtp = newOtp;
  }

  res.status(200).json(response);
});

const verifyAdminEmailChangeNew = asyncHandler(async (req, res) => {
  const { sessionId, otp } = req.body;

  if (!Types.ObjectId.isValid(sessionId)) {
    res.status(400);
    throw new Error('Invalid session identifier.');
  }

  const session = await VerificationSession.findById(sessionId).select('+otpHash');

  if (!session || session.type !== 'ADMIN_EMAIL_CHANGE') {
    res.status(400);
    throw new Error('Email change session could not be found.');
  }

  if (session.user.toString() !== req.admin._id.toString()) {
    res.status(403);
    throw new Error('You are not allowed to access this session.');
  }

  if (session.status !== 'NEW_OTP_PENDING') {
    res.status(400);
    throw new Error('New email verification is not ready yet.');
  }

  if (!session.otpHash || session.otpExpiresAt?.getTime() < Date.now()) {
    await session.deleteOne();
    res.status(410);
    throw new Error('The verification code has expired. Please restart the email change process.');
  }

  const isMatch = await bcrypt.compare(otp, session.otpHash);
  if (!isMatch) {
    res.status(401);
    throw new Error('Invalid verification code.');
  }

  const newEmail = session.payload?.newEmail;
  if (!newEmail) {
    await session.deleteOne();
    res.status(400);
    throw new Error('New email information is missing. Please restart the process.');
  }

  const conflictingAdmin = await AdminUser.findOne({ email: newEmail });
  if (conflictingAdmin && conflictingAdmin._id.toString() !== req.admin._id.toString()) {
    await session.deleteOne();
    res.status(409);
    throw new Error('Another admin already uses this email address.');
  }

  const admin = await AdminUser.findById(req.admin._id);
  if (!admin) {
    await session.deleteOne();
    res.status(404);
    throw new Error('Admin account not found.');
  }

  admin.email = newEmail;
  admin.emailVerified = true;
  await admin.save();

  await session.deleteOne();

  res.status(200).json({ admin: admin.toJSON() });
});

const getAdminSignupSession = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;

  if (!Types.ObjectId.isValid(sessionId)) {
    res.status(400);
    throw new Error('Invalid session identifier.');
  }

  const session = await VerificationSession.findById(sessionId);

  if (!session || session.type !== 'ADMIN_SIGNUP') {
    res.status(404);
    throw new Error('Signup session not found.');
  }

  res.status(200).json({
    sessionId: session._id.toString(),
    email: session.email,
    status: session.status,
    approvalRespondedAt: session.approvalRespondedAt,
    createdAt: session.createdAt,
  });
});

module.exports = {
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
};
