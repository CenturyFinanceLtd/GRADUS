/*
  Email utilities
  - sendEmail: generic nodemailer wrapper (mocked in non-live delivery mode)
  - sendOtpEmail: formatted OTP mail for verification flows
  - sendAdminApprovalEmail: rich email with approval/rejection links
*/
const nodemailer = require('nodemailer');
const { google } = require('googleapis');
const config = require('../config/env');
const { renderEmailTemplate } = require('../services/emailTemplateService');

const deliveryMode = (config.smtp.deliveryMode || 'live').toLowerCase();
const isLive = deliveryMode === 'live';
const workspaceOAuthEnabled = Boolean(config.smtp.useWorkspaceOAuth);
const workspaceSendAs = config.smtp.workspaceSendAs || config.smtp.user;
const smtpLoginUser = config.smtp.loginUser || workspaceSendAs;
const workspaceImpersonate = config.smtp.workspaceImpersonate || smtpLoginUser;
const SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const SERVICE_ACCOUNT_PRIVATE_KEY = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
  ? process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.replace(/\\n/g, '\n')
  : null;
const WORKSPACE_SMTP_SCOPES = ['https://mail.google.com/'];

let transporter = null;
let cachedWorkspaceToken = null;
let cachedWorkspaceTokenExpiry = 0;
let inflightWorkspaceTokenPromise = null;

if (isLive) {
  transporter = nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: Number(config.smtp.port) === 465,
    requireTLS: true,
  });
}

const getWorkspaceAccessToken = async () => {
  if (!workspaceOAuthEnabled) {
    return null;
  }

  if (!SERVICE_ACCOUNT_EMAIL || !SERVICE_ACCOUNT_PRIVATE_KEY || !workspaceImpersonate) {
    throw new Error(
      'Workspace SMTP OAuth is enabled but service account credentials or impersonation email are missing.'
    );
  }

  const now = Date.now();
  if (cachedWorkspaceToken && cachedWorkspaceTokenExpiry - now > 60 * 1000) {
    return cachedWorkspaceToken;
  }

  if (inflightWorkspaceTokenPromise) {
    return inflightWorkspaceTokenPromise;
  }

  const jwtClient = new google.auth.JWT({
    email: SERVICE_ACCOUNT_EMAIL,
    key: SERVICE_ACCOUNT_PRIVATE_KEY,
    scopes: WORKSPACE_SMTP_SCOPES,
    subject: workspaceImpersonate,
  });

  inflightWorkspaceTokenPromise = jwtClient
    .authorize()
    .then((tokens) => {
      cachedWorkspaceToken = tokens.access_token;
      cachedWorkspaceTokenExpiry = tokens.expiry_date || now + 45 * 60 * 1000;
      inflightWorkspaceTokenPromise = null;
      return cachedWorkspaceToken;
    })
    .catch((error) => {
      inflightWorkspaceTokenPromise = null;
      throw error;
    });

  return inflightWorkspaceTokenPromise;
};

const buildMailAuth = async () => {
  if (!isLive) {
    return null;
  }

  const hasPasswordAuth = Boolean(config.smtp.user && config.smtp.pass);

  if (workspaceOAuthEnabled) {
    try {
      const accessToken = await getWorkspaceAccessToken();
      if (accessToken) {
        return {
          type: 'OAuth2',
          user: workspaceImpersonate,
          accessToken,
        };
      }
      console.warn('[email] Workspace OAuth returned an empty access token, falling back to SMTP password auth.');
    } catch (error) {
      if (!hasPasswordAuth) {
        console.error(
          `[email] Workspace OAuth token retrieval failed and no SMTP_PASS fallback is configured: ${error.message}`
        );
        throw new Error('Unable to authenticate with Workspace SMTP. Check OAuth delegation or set SMTP_PASS.');
      }
      console.warn(
        `[email] Workspace OAuth token retrieval failed, falling back to SMTP password auth: ${error.message}`
      );
    }
  }

  if (!hasPasswordAuth) {
    throw new Error('SMTP_USER and SMTP_PASS are required for password-based SMTP auth.');
  }

  return {
    user: smtpLoginUser,
    pass: config.smtp.pass,
  };
};

const sendEmail = async ({ from, to, subject, text, html }) => {
  if (!to) {
    throw new Error('Recipient email address is required');
  }

  const mailOptions = {
    from: from || config.smtp.from || config.smtp.user,
    to,
    subject,
    text,
    html,
  };

  if (!isLive) {
    console.log('[email:mock]', JSON.stringify(mailOptions, null, 2));
    return { mocked: true };
  }

  const auth = await buildMailAuth();
  const info = await transporter.sendMail({ ...mailOptions, auth });
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

  const result = await sendEmail({
    from: config.smtp.verificationFrom,
    to,
    subject: emailSubject,
    text: emailText,
    html: emailHtml,
  });
  if (result.mocked) {
    return { mocked: true, otp };
  }
  return { mocked: false };
};

const sendAdminApprovalEmail = async ({ to, requester, approvalOptions, rejectionUrl, portalName }) => {
  if (!Array.isArray(approvalOptions) || approvalOptions.length === 0) {
    throw new Error('At least one approval option is required');
  }

  if (!rejectionUrl) {
    throw new Error('Rejection URL is required');
  }

  const subject = `${portalName || 'Gradus Admin Portal'}: Approval requested for ${requester.fullName}`;
  const languageText = Array.isArray(requester.languages)
    ? requester.languages.join(', ')
    : requester.languages || 'Not provided';
  const roleDisplay = requester.role || 'To be selected by approver';

  const approvalText = approvalOptions
    .map((option) => `Approve as ${option.label}: ${option.url}`)
    .join('\n');

  const text = `A new admin signup request has been submitted.\n\n`
    + `Full Name: ${requester.fullName}\n`
    + `Email: ${requester.email}\n`
    + `Phone Number: ${requester.phoneNumber}\n`
    + `Department: ${requester.department || 'Not provided'}\n`
    + `Designation: ${requester.designation || 'Not provided'}\n`
    + `Languages: ${languageText}\n`
    + `Role: ${roleDisplay}\n`
    + `Bio: ${requester.bio || 'Not provided'}\n\n`
    + `${approvalText}\n`
    + `Reject: ${rejectionUrl}`;

  const approvalButtonsHtml = approvalOptions
    .map(
      (option) => `
        <a href="${option.url}" style="background: #0B5394; color: #fff; padding: 10px 16px; text-decoration: none; border-radius: 4px; display: inline-block; margin-right: 12px; margin-bottom: 12px;">Approve as ${option.label}</a>
      `
    )
    .join('');

  const approvalLinksHtml = approvalOptions
    .map(
      (option) => `
        <p style="margin: 0; font-size: 14px;">Approve as ${option.label}: <a href="${option.url}">${option.url}</a></p>
      `
    )
    .join('');

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
            <td style="padding: 6px 8px;">${roleDisplay}</td>
          </tr>
          <tr>
            <td style="padding: 6px 8px; font-weight: bold; vertical-align: top;">Bio</td>
            <td style="padding: 6px 8px; white-space: pre-line;">${requester.bio || 'Not provided'}</td>
          </tr>
        </tbody>
      </table>
      <p>Please choose which role to assign to this admin:</p>
      <div style="margin-bottom: 16px;">
        ${approvalButtonsHtml}
      </div>
      <a href="${rejectionUrl}" style="background: #d9534f; color: #fff; padding: 10px 16px; text-decoration: none; border-radius: 4px; display: inline-block;">Reject</a>
      <p style="margin-top: 20px;">If the buttons do not work, you can copy and paste these links into your browser:</p>
      ${approvalLinksHtml}
      <p style="margin: 0; font-size: 14px;">Reject: <a href="${rejectionUrl}">${rejectionUrl}</a></p>
    </div>
  `;

  return sendEmail({ to, subject, text, html });
};

const getFormattedDateParts = (isoString, timezone) => {
  if (!isoString) {
    return { dateLabel: null, timeLabel: null };
  }

  const parsed = new Date(isoString);
  if (Number.isNaN(parsed.getTime())) {
    return { dateLabel: null, timeLabel: null };
  }

  const normalizedTz = timezone?.trim() || 'Asia/Kolkata';
  const getFormatter = (options) => {
    try {
      return new Intl.DateTimeFormat('en-IN', { ...options, timeZone: normalizedTz });
    } catch (error) {
      // Fallback to system timezone if provided timezone is invalid
      return new Intl.DateTimeFormat('en-IN', options);
    }
  };

  const dateLabel = getFormatter({
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(parsed);

  const timeLabel = getFormatter({
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(parsed);

  return { dateLabel, timeLabel };
};

const sendEventRegistrationEmail = async ({
  to,
  name,
  eventTitle,
  startsAt,
  timezone,
  joinUrl,
  hostName,
}) => {
  const displayName = name?.trim() || 'there';
  const normalizedTitle = eventTitle?.trim() || 'the Gradus masterclass';
  const timezoneLabel = timezone?.trim() || '';
  const { dateLabel, timeLabel } = getFormattedDateParts(startsAt, timezoneLabel || undefined);
  const dateDisplay = dateLabel || 'To be announced';
  const timeDisplay = timeLabel
    ? `${timeLabel}${timezoneLabel ? ` (${timezoneLabel})` : ''}`
    : timezoneLabel || 'To be announced';
  const locationText = joinUrl ? joinUrl : 'We will send the joining link soon.';
  const friendlyHostName = hostName?.trim() || 'Team Gradus';

  const templatePayload = {
    participantName: displayName,
    eventTitle: normalizedTitle,
    eventDate: dateDisplay,
    eventTime: timeDisplay,
    onlineLink: joinUrl || locationText,
    onlineLinkHtml: joinUrl ? `<a href="${joinUrl}">${joinUrl}</a>` : locationText,
    hostName: friendlyHostName,
  };

  const rendered = await renderEmailTemplate('event_registration', templatePayload);

  let subject;
  let text;
  let html;

  if (rendered) {
    subject = rendered.subject;
    text = rendered.text;
    html = rendered.html;
  } else {
    subject = `You're registered for ${normalizedTitle}!`;
    text = [
      `Hi ${displayName},`,
      '',
      `Your registration for ${normalizedTitle} is confirmed! We're excited to have you join us.`,
      '',
      "Here's a quick snapshot of what you need to know:",
      `📅 Date: ${dateDisplay}`,
      `⏰ Time: ${timeDisplay}`,
      `📍 Online Link: ${locationText}`,
      '',
      "We'll send reminders and updates as the event gets closer. If you need anything, just reply to this email!",
      '',
      'See you there,',
      friendlyHostName,
    ]
      .filter(Boolean)
      .join('\n');

    html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1F2933;">
        <h2 style="color: #0B5394; margin-bottom: 12px;">You're registered!</h2>
        <p>Hi ${displayName},</p>
        <p>Your registration for <strong>${normalizedTitle}</strong> is confirmed! We're excited to have you join us.</p>
        <div style="margin: 20px 0; padding: 16px; border-radius: 16px; background: #f8fafc;">
          <p style="margin: 0 0 6px; font-weight: 600;">Here's a quick snapshot:</p>
          <ul style="list-style: none; padding: 0; margin: 0;">
            <li style="margin-bottom: 6px;">📅 <strong>Date:</strong> ${dateDisplay}</li>
            <li style="margin-bottom: 6px;">⏰ <strong>Time:</strong> ${timeDisplay}</li>
            <li style="margin-bottom: 6px;">📍 <strong>Online link:</strong> ${
              joinUrl
                ? `<a href="${joinUrl}" style="color: #0B5394;">${joinUrl}</a>`
                : 'We will send the joining link soon.'
            }</li>
          </ul>
        </div>
        <p>We'll send reminders and updates as the event gets closer. Need anything? Just reply to this email.</p>
        ${
          joinUrl
            ? `<div style="margin: 20px 0;">
                <a href="${joinUrl}" style="background: #0B5394; color: #fff; text-decoration: none; padding: 12px 20px; border-radius: 999px; display: inline-block;">Join link</a>
              </div>`
            : ''
        }
        <p>See you there,</p>
        <p style="margin-top: 8px;">${friendlyHostName}</p>
      </div>
    `;
  }

  return sendEmail({ from: config.smtp.registrationFrom, to, subject, text, html });
};

module.exports = { sendEmail, sendOtpEmail, sendAdminApprovalEmail, sendEventRegistrationEmail, deliveryMode };
