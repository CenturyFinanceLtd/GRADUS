/*
  Google Docs sync for event registrations
  - Creates/uses one doc per event name
  - Appends each registration as a formatted block
*/
const { google } = require('googleapis');

const DOC_MIME = 'application/vnd.google-apps.document';
const SCOPES = [
  'https://www.googleapis.com/auth/documents',
  'https://www.googleapis.com/auth/drive',
];

const docCache = new Map();
let warnedMissingConfig = false;

const getGoogleAuth = () => {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKeyRaw = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  const subject = process.env.GOOGLE_WORKSPACE_IMPERSONATE_EMAIL;

  if (!clientEmail || !privateKeyRaw) {
    if (!warnedMissingConfig) {
      console.warn(
        '[google-docs] Skipping sync: GOOGLE_SERVICE_ACCOUNT_EMAIL or GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY not set'
      );
      warnedMissingConfig = true;
    }
    return null;
  }

  const privateKey = privateKeyRaw.replace(/\\n/g, '\n');

  try {
    return new google.auth.JWT(
      {
        email: clientEmail,
        key: privateKey,
        scopes: SCOPES,
        subject: subject || undefined, // requires domain-wide delegation if set
      }
    );
  } catch (error) {
    if (!warnedMissingConfig) {
      console.error('[google-docs] Failed to initialize auth', error?.message);
      warnedMissingConfig = true;
    }
    return null;
  }
};

const sanitizeName = (value = '') => value.trim() || 'Event Registrations';

const escapeForDriveQuery = (value = '') => value.replace(/'/g, "\\'");

const getClients = () => {
  const auth = getGoogleAuth();
  if (!auth) return null;

  return {
    docs: google.docs({ version: 'v1', auth }),
    drive: google.drive({ version: 'v3', auth }),
  };
};

const findExistingDoc = async (drive, title) => {
  const parentFolderId = process.env.GOOGLE_DOCS_PARENT_FOLDER_ID;
  const query = [
    `mimeType='${DOC_MIME}'`,
    "trashed=false",
    `name='${escapeForDriveQuery(title)}'`,
  ];

  if (parentFolderId) {
    query.push(`'${parentFolderId}' in parents`);
  }

  const res = await drive.files.list({
    q: query.join(' and '),
    fields: 'files(id, name)',
    pageSize: 1,
    orderBy: 'createdTime desc',
  });

  return res.data?.files?.[0]?.id || null;
};

const createDoc = async (docs, drive, title) => {
  const created = await docs.documents.create({
    requestBody: {
      title,
    },
  });
  const documentId = created.data.documentId;
  const parentFolderId = process.env.GOOGLE_DOCS_PARENT_FOLDER_ID;

  if (parentFolderId) {
    try {
      await drive.files.update({
        fileId: documentId,
        addParents: parentFolderId,
        fields: 'id, parents',
      });
    } catch (error) {
      console.warn('[google-docs] Failed to move doc into folder', error?.message);
    }
  }

  const introText = `Event: ${title}\nRegistrations\n==============\n`;
  await docs.documents.batchUpdate({
    documentId,
    requestBody: {
      requests: [
        {
          insertText: {
            endOfSegmentLocation: {},
            text: introText,
          },
        },
      ],
    },
  });

  return documentId;
};

const ensureDocForEvent = async (eventName, clients) => {
  const title = sanitizeName(eventName);
  const cacheKey = title.toLowerCase();

  if (docCache.has(cacheKey)) {
    return docCache.get(cacheKey);
  }

  const { drive, docs } = clients;
  const existingId = await findExistingDoc(drive, title);
  if (existingId) {
    docCache.set(cacheKey, existingId);
    return existingId;
  }

  const newId = await createDoc(docs, drive, title);
  docCache.set(cacheKey, newId);
  return newId;
};

const formatRegistrationBlock = (registration, mode = 'create') => {
  const timestamp =
    (mode === 'update' ? registration.updatedAt : registration.createdAt) || new Date();
  const displayTime =
    timestamp instanceof Date ? timestamp.toISOString() : new Date(timestamp).toISOString();
  const lines = [
    '---',
    `${mode === 'update' ? 'Updated entry' : 'New entry'} - ${displayTime}`,
    `Registration ID: ${registration._id || registration.id || ''}`,
    `Name: ${registration.name || ''}`,
    `Email: ${registration.email || ''}`,
    `Phone: ${registration.phone || ''}`,
    `State: ${registration.state || ''}`,
    `Qualification: ${registration.qualification || ''}`,
    `Event: ${registration.course || ''}`,
    `Message: ${registration.message || ''}`,
  ];

  const details = registration.eventDetails || {};
  if (details.joinUrl) {
    lines.push(`Join URL: ${details.joinUrl}`);
  }
  if (details.startsAt || details.start || details.eventDate) {
    lines.push(`Starts At: ${details.startsAt || details.start || details.eventDate}`);
  }
  if (details.timezone) {
    lines.push(`Timezone: ${details.timezone}`);
  }
  if (details.hostName) {
    lines.push(`Host: ${details.hostName}`);
  }

  lines.push(''); // trailing newline
  return `${lines.join('\n')}\n`;
};

const syncRegistrationToGoogleDoc = async (registration, { mode = 'create' } = {}) => {
  const clients = getClients();
  if (!clients) return false;

  const eventName =
    registration.course ||
    (registration.eventDetails && registration.eventDetails.title) ||
    'Event Registrations';

  try {
    const documentId = await ensureDocForEvent(eventName, clients);
    const textBlock = formatRegistrationBlock(registration, mode);

    await clients.docs.documents.batchUpdate({
      documentId,
      requestBody: {
        requests: [
          {
            insertText: {
              endOfSegmentLocation: {},
              text: textBlock,
            },
          },
        ],
      },
    });

    return true;
  } catch (error) {
    console.error('[google-docs] Failed to append registration', {
      error: error?.message,
      registrationId: registration._id || registration.id,
      event: eventName,
    });
    return false;
  }
};

module.exports = {
  syncRegistrationToGoogleDoc,
};
