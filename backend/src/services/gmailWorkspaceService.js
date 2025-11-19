/*
  Gmail service (Google Workspace)
  - Uses a service account with domain-wide delegation to impersonate shared inboxes
  - Provides helpers to list configured mailboxes, fetch message summaries, and load full messages
*/
const { google } = require('googleapis');
const addressParser = require('nodemailer/lib/addressparser');
const config = require('../config/env');

const GMAIL_SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];
const DEFAULT_LABELS = [
  { id: 'INBOX', name: 'Inbox' },
  { id: 'STARRED', name: 'Starred' },
  { id: 'SNOOZED', name: 'Snoozed' },
  { id: 'IMPORTANT', name: 'Important' },
  { id: 'SENT', name: 'Sent' },
  { id: 'DRAFT', name: 'Drafts' },
  { id: 'SPAM', name: 'Spam' },
  { id: 'TRASH', name: 'Bin' },
  { id: 'CATEGORY_SOCIAL', name: 'Social' },
  { id: 'CATEGORY_PROMOTIONS', name: 'Promotions' },
  { id: 'CATEGORY_UPDATES', name: 'Updates' },
  { id: 'CATEGORY_FORUMS', name: 'Forums' },
];
const LABEL_NAME_FALLBACK = new Map(DEFAULT_LABELS.map((label) => [label.id, label.name]));
const MAX_LIST_PAGE_SIZE = 50;
const DEFAULT_PAGE_SIZE = 15;

class GmailServiceError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.name = 'GmailServiceError';
    this.httpStatus = statusCode;
  }
}

const mailboxCache = new Map();
let authWarningLogged = false;

const getConfiguredMailboxes = () => {
  const mailboxes = Array.isArray(config.gmail?.delegatedInboxes) ? config.gmail.delegatedInboxes : [];
  return mailboxes.map((mailbox) => ({
    email: (mailbox.email || '').toLowerCase(),
    displayName: mailbox.displayName || mailbox.email,
  }));
};

const getServiceAccountCredentials = () => {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const rawKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

  if (!clientEmail || !rawKey) {
    if (!authWarningLogged) {
      console.warn(
        '[gmail] GOOGLE_SERVICE_ACCOUNT_EMAIL or GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY is missing. Gmail inbox will be disabled.'
      );
      authWarningLogged = true;
    }
    return null;
  }

  return {
    clientEmail: clientEmail.trim(),
    privateKey: rawKey.replace(/\\n/g, '\n'),
  };
};

const ensureMailboxAllowed = (email) => {
  const normalized = (email || '').trim().toLowerCase();
  if (!normalized) {
    throw new GmailServiceError('Mailbox email is required.', 400);
  }
  const mailbox = getConfiguredMailboxes().find((entry) => entry.email === normalized);
  if (!mailbox) {
    throw new GmailServiceError('Requested mailbox is not configured.', 404);
  }
  return mailbox;
};

const getDelegatedGmailClient = (email) => {
  const mailbox = ensureMailboxAllowed(email);
  if (mailboxCache.has(mailbox.email)) {
    return { mailbox, gmail: mailboxCache.get(mailbox.email) };
  }

  const credentials = getServiceAccountCredentials();
  if (!credentials) {
    throw new GmailServiceError('Google service account credentials are not configured.', 503);
  }

  const auth = new google.auth.JWT({
    email: credentials.clientEmail,
    key: credentials.privateKey,
    scopes: GMAIL_SCOPES,
    subject: mailbox.email,
  });
  const gmail = google.gmail({ version: 'v1', auth });
  mailboxCache.set(mailbox.email, gmail);
  return { mailbox, gmail };
};

const decodeBase64 = (value) => {
  if (!value) return '';
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(normalized, 'base64').toString('utf-8');
};

const walkMimeTree = (part, visitor) => {
  if (!part) return;
  visitor(part);
  if (Array.isArray(part.parts)) {
    part.parts.forEach((child) => walkMimeTree(child, visitor));
  }
};

const extractBodyAndAttachments = (payload) => {
  const textChunks = [];
  const htmlChunks = [];
  const attachments = [];

  walkMimeTree(payload, (part) => {
    const mimeType = (part.mimeType || '').toLowerCase();
    const bodyData = part.body && part.body.data;

    if (bodyData) {
      const decoded = decodeBase64(bodyData);
      if (mimeType === 'text/plain') {
        textChunks.push(decoded);
      } else if (mimeType === 'text/html') {
        htmlChunks.push(decoded);
      }
    }

    if (part.filename && part.body && part.body.attachmentId) {
      attachments.push({
        filename: part.filename,
        mimeType: part.mimeType,
        size: part.body.size || 0,
        attachmentId: part.body.attachmentId,
      });
    }
  });

  if (!textChunks.length && payload?.body?.data) {
    textChunks.push(decodeBase64(payload.body.data));
  }

  return {
    textBody: textChunks.join('\n').trim() || null,
    htmlBody: htmlChunks.join('\n').trim() || null,
    attachments,
  };
};

const getHeaderValue = (message, headerName) => {
  const headers = message?.payload?.headers;
  if (!Array.isArray(headers)) {
    return '';
  }

  const match = headers.find((header) => header.name && header.name.toLowerCase() === headerName.toLowerCase());
  return match?.value || '';
};

const parseAddressList = (value) => {
  if (!value) return [];
  try {
    return addressParser(value).map((entry) => {
      const email = entry.address || null;
      const hasName = entry.name && entry.name.trim().length > 0;
      let label = '';
      if (email && hasName) {
        label = `${entry.name} <${email}>`;
      } else if (email) {
        label = email;
      } else {
        label = entry.original || entry.name || '';
      }

      return {
        name: hasName ? entry.name : null,
        email,
        value: label,
      };
    });
  } catch {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => ({ name: null, email: item, value: item }));
  }
};

const buildHeaderMap = (message) => {
  const headers = message?.payload?.headers;
  if (!Array.isArray(headers)) {
    return {};
  }
  return headers.reduce((acc, header) => {
    if (header?.name) {
      acc[header.name.toLowerCase()] = header.value || '';
    }
    return acc;
  }, {});
};

const normalizeMessage = (mailboxEmail, message) => {
  if (!message) return null;
  const { textBody, htmlBody, attachments } = extractBodyAndAttachments(message.payload || {});
  const rawFromHeader = getHeaderValue(message, 'From');
  const fromList = parseAddressList(rawFromHeader);
  const replyTo = parseAddressList(getHeaderValue(message, 'Reply-To'));
  const toList = parseAddressList(getHeaderValue(message, 'To'));
  const ccList = parseAddressList(getHeaderValue(message, 'Cc'));
  const bccList = parseAddressList(getHeaderValue(message, 'Bcc'));
  const receivedMs = message.internalDate ? Number(message.internalDate) : null;
  const receivedAt = Number.isFinite(receivedMs) ? new Date(receivedMs).toISOString() : null;
  const labelIds = Array.isArray(message.labelIds) ? message.labelIds : [];

  return {
    id: message.id,
    threadId: message.threadId,
    accountEmail: mailboxEmail,
    historyId: message.historyId,
    labelIds,
    snippet: message.snippet || '',
    subject: getHeaderValue(message, 'Subject') || '(No subject)',
    from: fromList[0] || { name: null, email: null, value: rawFromHeader || '' },
    replyTo,
    to: toList,
    cc: ccList,
    bcc: bccList,
    dateHeader: getHeaderValue(message, 'Date') || null,
    receivedAt,
    internalDate: receivedMs,
    unread: labelIds.includes('UNREAD'),
    starred: labelIds.includes('STARRED'),
    hasAttachments: attachments.length > 0,
    attachments,
    textBody,
    htmlBody,
    sizeEstimate: message.sizeEstimate || null,
    headers: buildHeaderMap(message),
  };
};

const summarizeLabels = async (gmail) => {
  const labelIds = DEFAULT_LABELS.map((label) => label.id);

  const summaries = await Promise.all(
    labelIds.map(async (labelId) => {
      try {
        const { data } = await gmail.users.labels.get({ userId: 'me', id: labelId });
        return {
          id: data.id,
          name: data.name || LABEL_NAME_FALLBACK.get(labelId) || labelId,
          type: data.type,
          messagesTotal: data.messagesTotal ?? null,
          messagesUnread: data.messagesUnread ?? null,
        };
      } catch (error) {
        return {
          id: labelId,
          name: LABEL_NAME_FALLBACK.get(labelId) || labelId,
          error: error?.message || 'Unable to fetch label',
        };
      }
    })
  );

  return summaries;
};

const getMaximumPageSize = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_PAGE_SIZE;
  }
  return Math.max(1, Math.min(MAX_LIST_PAGE_SIZE, Math.floor(parsed)));
};

const listMailboxSummaries = async () => {
  const mailboxes = getConfiguredMailboxes();
  const results = await Promise.all(
    mailboxes.map(async (mailbox) => {
      try {
        const { gmail } = getDelegatedGmailClient(mailbox.email);
        const [profileResponse, labels] = await Promise.all([
          gmail.users.getProfile({ userId: 'me' }),
          summarizeLabels(gmail),
        ]);
        return {
          ...mailbox,
          status: 'connected',
          profile: profileResponse.data,
          labels,
        };
      } catch (error) {
        console.warn(`[gmail] Failed to load mailbox summary for ${mailbox.email}`, error?.message);
        return {
          ...mailbox,
          status: 'error',
          error: error?.message || 'Unable to load mailbox',
        };
      }
    })
  );

  return results;
};

const listMessagesForAccount = async ({ accountEmail, labelId, pageToken, maxResults, query }) => {
  try {
    const { mailbox, gmail } = getDelegatedGmailClient(accountEmail);
    const limit = getMaximumPageSize(maxResults);
    const normalizedLabelId = (labelId || 'INBOX').trim();
    const listParams = {
      userId: 'me',
      maxResults: limit,
      pageToken: pageToken || undefined,
      q: query ? query.trim() : undefined,
    };

    if (normalizedLabelId && !['ALL', 'ALL_MAIL'].includes(normalizedLabelId.toUpperCase())) {
      listParams.labelIds = [normalizedLabelId];
    }

    const { data } = await gmail.users.messages.list(listParams);
    const messageMetas = Array.isArray(data.messages) ? data.messages : [];
    const messages = await Promise.all(
      messageMetas.map(async (meta) => {
        const { data: message } = await gmail.users.messages.get({
          userId: 'me',
          id: meta.id,
          format: 'full',
        });
        return normalizeMessage(mailbox.email, message);
      })
    );

    return {
      account: mailbox,
      labelId: normalizedLabelId || 'ALL',
      messages,
      nextPageToken: data.nextPageToken || null,
      resultSizeEstimate: data.resultSizeEstimate ?? messages.length,
      fetchedAt: new Date().toISOString(),
    };
  } catch (error) {
    if (error instanceof GmailServiceError) {
      throw error;
    }
    console.error('[gmail] Failed to fetch messages', error?.message);
    throw new GmailServiceError('Unable to load Gmail messages.', 502);
  }
};

const getMessageById = async ({ accountEmail, messageId }) => {
  if (!messageId) {
    throw new GmailServiceError('Message ID is required.', 400);
  }

  try {
    const { mailbox, gmail } = getDelegatedGmailClient(accountEmail);
    const { data } = await gmail.users.messages.get({
      userId: 'me',
      id: messageId,
      format: 'full',
    });
    return {
      account: mailbox,
      message: normalizeMessage(mailbox.email, data),
      fetchedAt: new Date().toISOString(),
    };
  } catch (error) {
    if (error instanceof GmailServiceError) {
      throw error;
    }
    if (error?.code === 404) {
      throw new GmailServiceError('Message not found.', 404);
    }
    console.error('[gmail] Failed to load message', error?.message);
    throw new GmailServiceError('Unable to load Gmail message.', 502);
  }
};

const getSupportedLabels = () => DEFAULT_LABELS.slice();

const getAttachmentData = async ({ accountEmail, messageId, attachmentId }) => {
  if (!messageId || !attachmentId) {
    throw new GmailServiceError('Message ID and attachment ID are required.', 400);
  }

  try {
    const { mailbox, gmail } = getDelegatedGmailClient(accountEmail);
    const { data } = await gmail.users.messages.attachments.get({
      userId: 'me',
      messageId,
      id: attachmentId,
    });

    if (!data || !data.data) {
      throw new GmailServiceError('Attachment data not available.', 404);
    }

    return {
      account: mailbox,
      attachment: {
        attachmentId,
        size: data.size ?? null,
        data: data.data,
      },
    };
  } catch (error) {
    if (error instanceof GmailServiceError) {
      throw error;
    }
    if (error?.code === 404) {
      throw new GmailServiceError('Attachment not found.', 404);
    }
    console.error('[gmail] Failed to load attachment', error?.message);
    throw new GmailServiceError('Unable to download attachment.', 502);
  }
};

module.exports = {
  GmailServiceError,
  getConfiguredMailboxes,
  getSupportedLabels,
  listMailboxSummaries,
  listMessagesForAccount,
  getMessageById,
  getAttachmentData,
};
