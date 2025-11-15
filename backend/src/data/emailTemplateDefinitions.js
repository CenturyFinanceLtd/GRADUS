/*
  Email template definitions
  - Provides fallback content + variable metadata for each templated email
  - Admins can override subject/html/text via the admin dashboard
*/

const EVENT_REGISTRATION_HTML = `
  <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1F2933;">
    <h2 style="color: #0B5394; margin-bottom: 12px;">You're registered!</h2>
    <p>Hi {{participantName}},</p>
    <p>Your registration for <strong>{{eventTitle}}</strong> is confirmed! We're excited to have you join us.</p>
    <div style="margin: 20px 0; padding: 16px; border-radius: 16px; background: #f8fafc;">
      <p style="margin: 0 0 6px; font-weight: 600;">Here's a quick snapshot:</p>
      <ul style="list-style: none; padding: 0; margin: 0;">
        <li style="margin-bottom: 6px;">📅 <strong>Date:</strong> {{eventDate}}</li>
        <li style="margin-bottom: 6px;">⏰ <strong>Time:</strong> {{eventTime}}</li>
        <li style="margin-bottom: 6px;">📍 <strong>Online link:</strong> {{onlineLinkHtml}}</li>
      </ul>
    </div>
    <p>We'll send reminders and updates as the event gets closer. Need anything? Just reply to this email.</p>
    <p style="margin-top: 24px;">See you there,<br/>{{hostName}}</p>
  </div>
`;

const EVENT_REGISTRATION_TEXT = [
  'Hi {{participantName}},',
  '',
  'Your registration for {{eventTitle}} is confirmed! We’re excited to have you join us.',
  '',
  'Here’s a quick snapshot of what you need to know:',
  '📅 Date: {{eventDate}}',
  '⏰ Time: {{eventTime}}',
  '📍 Online Link: {{onlineLink}}',
  '',
  'We’ll send reminders and updates as the event gets closer. If you need anything, just reply to this email!',
  '',
  'See you there,',
  '{{hostName}}',
].join('\n');

const emailTemplateDefinitions = {
  event_registration: {
    key: 'event_registration',
    name: 'Event Registration Confirmation',
    description:
      'Sent instantly when someone registers for a public event/masterclass. Editing this template updates the confirmation email participants receive.',
    variables: [
      { token: 'participantName', label: 'Participant full name' },
      { token: 'eventTitle', label: 'Event title/name' },
      { token: 'eventDate', label: 'Formatted event date (e.g., Friday, 21 Nov 2025)' },
      { token: 'eventTime', label: 'Formatted event time (e.g., 10:00 AM Asia/Kolkata)' },
      { token: 'onlineLink', label: 'Join link or placeholder message (plain text)' },
      { token: 'onlineLinkHtml', label: 'Join link rendered as HTML anchor tag' },
      { token: 'hostName', label: 'Host name or "Team Gradus"' },
    ],
    subject: "You're registered for {{eventTitle}}!",
    text: EVENT_REGISTRATION_TEXT,
    html: EVENT_REGISTRATION_HTML,
  },
};

module.exports = emailTemplateDefinitions;
