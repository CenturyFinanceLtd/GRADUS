const nodemailer = require('nodemailer');
const config = require('../config/env');

const deliveryMode = (config.smtp.deliveryMode || 'live').toLowerCase();
const isLive = deliveryMode === 'live';

let transporter = null;

if (isLive) {
  transporter = nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: Number(config.smtp.port) === 465,
    auth: {
      user: config.smtp.user,
      pass: config.smtp.pass,
    },
    requireTLS: true,
  });
}

const sendEmail = async ({ to, subject, text, html }) => {
  if (!to) {
    throw new Error('Recipient email address is required');
  }

  const mailOptions = {
    from: config.smtp.from || config.smtp.user,
    to,
    subject,
    text,
    html,
  };

  if (!isLive) {
    console.log('[email:mock]', JSON.stringify(mailOptions, null, 2));
    return { mocked: true };
  }

  const info = await transporter.sendMail(mailOptions);
  return { mocked: false, info };
};

const sendOtpEmail = async ({ to, otp, subject, context }) => {
  const emailSubject = subject || 'Your verification code';
  const emailText = `Your one-time verification code is ${otp}. It will expire in 10 minutes.`;
  const emailHtml = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <h2 style="color: #0B5394;">${context?.title || 'Verification Required'}</h2>
      <p>Use the following one-time password (OTP) to complete ${context?.action || 'your request'}:</p>
      <div style="font-size: 28px; letter-spacing: 8px; font-weight: bold; color: #0B5394;">${otp}</div>
      <p>This code will expire in <strong>10 minutes</strong>. If you did not request this, please ignore this email.</p>
      <p>Regards,<br/>CFL Graduate Support Team</p>
    </div>
  `;

  const result = await sendEmail({ to, subject: emailSubject, text: emailText, html: emailHtml });
  if (result.mocked) {
    return { mocked: true, otp };
  }
  return { mocked: false };
};

const sendAdminApprovalEmail = async ({ to, requester, approvalUrl, rejectionUrl, portalName }) => {
  if (!approvalUrl || !rejectionUrl) {
    throw new Error('Approval and rejection URLs are required');
  }

  const subject = `${portalName || 'Gradus Admin Portal'}: Approval requested for ${requester.fullName}`;
  const languageText = Array.isArray(requester.languages)
    ? requester.languages.join(', ')
    : requester.languages || 'Not provided';

  const text = `A new admin signup request has been submitted.\n\n` +
    `Full Name: ${requester.fullName}\n` +
    `Email: ${requester.email}\n` +
    `Phone Number: ${requester.phoneNumber}\n` +
    `Department: ${requester.department || 'Not provided'}\n` +
    `Designation: ${requester.designation || 'Not provided'}\n` +
    `Languages: ${languageText}\n` +
    `Role: ${requester.role || 'Not provided'}\n` +
    `Bio: ${requester.bio || 'Not provided'}\n\n` +
    `Approve: ${approvalUrl}\nReject: ${rejectionUrl}`;

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <h2 style="color: #0B5394; margin-bottom: 12px;">${portalName || 'Gradus Admin Portal'} - Approval Needed</h2>
      <p>A new admin signup request has been submitted with the following details:</p>
      <table style="border-collapse: collapse; width: 100%; margin-bottom: 16px;">
        <tbody>
          <tr>
            <td style="padding: 6px 8px; font-weight: bold; width: 180px;">Full Name</td>
            <td style="padding: 6px 8px;">${requester.fullName}</td>
          </tr>
          <tr>
            <td style="padding: 6px 8px; font-weight: bold;">Email</td>
            <td style="padding: 6px 8px;"><a href="mailto:${requester.email}">${requester.email}</a></td>
          </tr>
          <tr>
            <td style="padding: 6px 8px; font-weight: bold;">Phone Number</td>
            <td style="padding: 6px 8px;">${requester.phoneNumber}</td>
          </tr>
          <tr>
            <td style="padding: 6px 8px; font-weight: bold;">Department</td>
            <td style="padding: 6px 8px;">${requester.department || 'Not provided'}</td>
          </tr>
          <tr>
            <td style="padding: 6px 8px; font-weight: bold;">Designation</td>
            <td style="padding: 6px 8px;">${requester.designation || 'Not provided'}</td>
          </tr>
          <tr>
            <td style="padding: 6px 8px; font-weight: bold;">Languages</td>
            <td style="padding: 6px 8px;">${languageText}</td>
          </tr>
          <tr>
            <td style="padding: 6px 8px; font-weight: bold;">Role</td>
            <td style="padding: 6px 8px;">${requester.role || 'Not provided'}</td>
          </tr>
          <tr>
            <td style="padding: 6px 8px; font-weight: bold; vertical-align: top;">Bio</td>
            <td style="padding: 6px 8px; white-space: pre-line;">${requester.bio || 'Not provided'}</td>
          </tr>
        </tbody>
      </table>
      <p>Please choose whether to allow this user to continue registration:</p>
      <div style="display: flex; gap: 12px;">
        <a href="${approvalUrl}" style="background: #0B5394; color: #fff; padding: 10px 16px; text-decoration: none; border-radius: 4px;">Approve</a>
        <a href="${rejectionUrl}" style="background: #d9534f; color: #fff; padding: 10px 16px; text-decoration: none; border-radius: 4px;">Reject</a>
      </div>
      <p style="margin-top: 20px;">If the buttons do not work, you can copy and paste these links into your browser:</p>
      <p style="margin: 0; font-size: 14px;">Approve: <a href="${approvalUrl}">${approvalUrl}</a></p>
      <p style="margin: 0; font-size: 14px;">Reject: <a href="${rejectionUrl}">${rejectionUrl}</a></p>
    </div>
  `;

  return sendEmail({ to, subject, text, html });
};

module.exports = { sendEmail, sendOtpEmail, sendAdminApprovalEmail, deliveryMode };