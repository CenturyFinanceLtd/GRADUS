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

module.exports = { sendEmail, sendOtpEmail, deliveryMode };
