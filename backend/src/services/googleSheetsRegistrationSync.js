/*
  Google Sheets sync for event registrations
  - Creates or reuses a spreadsheet per event
  - Appends each registration as a row with consistent headers
*/
const { google } = require('googleapis');

const SHEET_MIME = 'application/vnd.google-apps.spreadsheet';
const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive',
];

const HEADER_ROW = ['Name', 'Email', 'Phone', 'State', 'Qualification', 'Event', 'Submitted'];
const DEFAULT_EVENT_NAME = 'Event Registrations';
const DETAIL_SHEET_TITLE = 'Event Details';

const sheetCache = new Map();
let warnedMissingConfig = false;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1500;

const getGoogleAuth = () => {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKeyRaw = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  const subject = process.env.GOOGLE_WORKSPACE_IMPERSONATE_EMAIL;

  if (!clientEmail || !privateKeyRaw) {
    if (!warnedMissingConfig) {
      console.warn(
        '[google-sheets] Skipping sync: GOOGLE_SERVICE_ACCOUNT_EMAIL or GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY not set'
      );
      warnedMissingConfig = true;
    }
    return null;
  }

  const privateKey = privateKeyRaw.replace(/\\n/g, '\n');

  try {
    return new google.auth.JWT({
      email: clientEmail,
      key: privateKey,
      scopes: SCOPES,
      subject: subject || undefined,
    });
  } catch (error) {
    if (!warnedMissingConfig) {
      console.error('[google-sheets] Failed to initialize auth', error?.message);
      warnedMissingConfig = true;
    }
    return null;
  }
};

const getClients = () => {
  const auth = getGoogleAuth();
  if (!auth) return null;

  return {
    drive: google.drive({ version: 'v3', auth }),
    sheets: google.sheets({ version: 'v4', auth }),
  };
};

const sanitizeName = (value = '') => {
  if (value === undefined || value === null) {
    return DEFAULT_EVENT_NAME;
  }
  const trimmed = String(value).trim();
  return trimmed || DEFAULT_EVENT_NAME;
};

const driveSafeName = (value = '') =>
  sanitizeName(value)
    .replace(/[\\/]+/g, ' - ')
    .replace(/\s+/g, ' ')
    .trim() || DEFAULT_EVENT_NAME;

const slugifyName = (value = '') => sanitizeName(value).replace(/[^A-Za-z0-9]+/g, ' ').trim();

const sheetTabTitleForEvent = (eventName) =>
  driveSafeName(eventName).replace(/[\[\]\*\/\\:?]+/g, ' ').trim().slice(0, 99) || DEFAULT_EVENT_NAME;

const buildNameCandidates = (eventName) => {
  const trimmed = sanitizeName(eventName);
  const safe = driveSafeName(eventName);
  const slug = slugifyName(eventName);
  return Array.from(new Set([trimmed, safe, slug, DEFAULT_EVENT_NAME].filter(Boolean)));
};

const boolToText = (value) => {
  if (value === undefined || value === null) return '';
  return value ? 'Yes' : 'No';
};

const joinList = (list, separator = ', ') => {
  if (!Array.isArray(list) || list.length === 0) return '';
  return list
    .map((item) => (item === undefined || item === null ? '' : String(item).trim()))
    .filter(Boolean)
    .join(separator);
};

const formatDateTime = (value, timezone = 'Asia/Kolkata') => {
  if (!value) return '';
  try {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
      return String(value);
    }
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: timezone || 'Asia/Kolkata',
    });
  } catch {
    return String(value);
  }
};

const formatAgendaList = (list) => {
  if (!Array.isArray(list) || list.length === 0) return '';
  return list
    .map((item) => (item === undefined || item === null ? '' : String(item).trim()))
    .filter(Boolean)
    .join('\n');
};

const buildEventDetailRows = (event = {}) => {
  const schedule = event.schedule || {};
  const host = event.host || {};
  const cta = event.cta || {};
  const price = event.price || {};
  const meta = event.meta || {};
  const rows = [
    ['Title', event.title || ''],
    ['Subtitle', event.subtitle || ''],
    ['Summary', event.summary || event.description || ''],
    ['Category', event.category || ''],
    ['Event Type', event.eventType || ''],
    ['Mode', event.mode || ''],
    ['Location / Link', event.location || ''],
    ['Timezone', schedule.timezone || 'Asia/Kolkata'],
    ['Starts At', formatDateTime(schedule.start, schedule.timezone)],
    ['Ends At', formatDateTime(schedule.end, schedule.timezone)],
    ['Seat Limit', event.seatLimit || ''],
    ['Recording Available', boolToText(event.recordingAvailable)],
    ['Featured', boolToText(event.isFeatured)],
    ['CTA Label', cta.label || ''],
    ['CTA URL', cta.url || ''],
    ['Host Name', host.name || ''],
    ['Host Title', host.title || ''],
    ['Host Bio', host.bio || ''],
    ['Price Label', price.label || ''],
    ['Price Amount', price.amount === 0 || price.amount ? String(price.amount) : ''],
    ['Price Currency', price.currency || 'INR'],
    ['Is Free', boolToText(price.isFree)],
    ['Tags', joinList(event.tags)],
    ['Highlights', formatAgendaList(meta.highlights)],
    ['Agenda', formatAgendaList(meta.agenda)],
    ['Status', event.status || ''],
  ];

  const filtered = rows.filter(([, value]) => {
    if (value === undefined || value === null) return false;
    if (typeof value === 'string') {
      return value.trim().length > 0;
    }
    return true;
  });

  return [['Field', 'Value'], ...filtered];
};

const ensureHeaderRow = async (clients, spreadsheetId, sheetName) =>
  withRetries(
    () =>
      clients.sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${sheetName}!A1`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [HEADER_ROW],
        },
      }),
    'ensure registration header row'
  );

const clearRegistrationRows = async (clients, spreadsheetId, sheetName) =>
  withRetries(
    () =>
      clients.sheets.spreadsheets.values.clear({
        spreadsheetId,
        range: `${sheetName}!A2:G`,
      }),
    'clear registration rows'
  );

const escapeForDriveQuery = (value = '') => value.replace(/'/g, "\\'");

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isRetryableError = (error) => {
  const status = error?.code || error?.response?.status;
  const message = (error?.message || '').toLowerCase();

  if (status === 429 || status === 500 || status === 503) {
    return true;
  }

  if (message.includes('service is currently unavailable') || message.includes('backend error')) {
    return true;
  }

  return false;
};

const withRetries = async (fn, label) => {
  let attempt = 0;
  let lastError = null;
  while (attempt < MAX_RETRIES) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      attempt += 1;
      if (!isRetryableError(error) || attempt >= MAX_RETRIES) {
        break;
      }
      const waitTime = RETRY_DELAY_MS * attempt;
      console.warn(`[google-sheets] ${label} failed (attempt ${attempt}/${MAX_RETRIES}), retrying in ${waitTime}ms`, error?.message);
      await delay(waitTime);
    }
  }
  throw lastError;
};

const ensureDetailSheet = async (clients, spreadsheetId) => {
  const { sheets } = clients;
  try {
    const metadata = await sheets.spreadsheets.get({
      spreadsheetId,
      fields: 'sheets(properties(title,sheetId))',
    });
    let detailSheet = metadata.data?.sheets?.find(
      (sheet) => sheet?.properties?.title === DETAIL_SHEET_TITLE
    );

    if (!detailSheet) {
      const batchRes = await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [
            {
              addSheet: {
                properties: {
                  title: DETAIL_SHEET_TITLE,
                  gridProperties: {
                    frozenRowCount: 1,
                    columnCount: 2,
                  },
                },
              },
            },
          ],
        },
      });
      detailSheet = batchRes.data?.replies?.[0]?.addSheet?.properties;
    }

    return {
      sheetId: detailSheet?.sheetId,
      sheetName: DETAIL_SHEET_TITLE,
    };
  } catch (error) {
    console.warn('[google-sheets] Failed to ensure event details sheet', error?.message);
    return {
      sheetId: null,
      sheetName: DETAIL_SHEET_TITLE,
    };
  }
};

const updateEventDetailsSheet = async (clients, spreadsheetId, eventData) => {
  if (!eventData) return;

  const rows = buildEventDetailRows(eventData);
  if (rows.length <= 1) return;

  const { sheetName } = await ensureDetailSheet(clients, spreadsheetId);

  await withRetries(
    () =>
      clients.sheets.spreadsheets.values.clear({
        spreadsheetId,
        range: `${sheetName}!A:B`,
      }),
    'clear event details sheet'
  ).catch(() => {});

  await withRetries(
    () =>
      clients.sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${sheetName}!A1:B${rows.length}`,
        valueInputOption: 'RAW',
        requestBody: {
          values: rows,
        },
      }),
    'update event details sheet'
  );
};

const fetchSheetName = async (sheets, spreadsheetId, fallback) => {
  try {
    const res = await sheets.spreadsheets.get({
      spreadsheetId,
      fields: 'sheets(properties(title,sheetId))',
    });
    const props = res.data?.sheets?.[0]?.properties || {};
    return {
      title: props.title || fallback || 'Sheet1',
      sheetId: props.sheetId,
    };
  } catch (error) {
    console.warn('[google-sheets] Failed to fetch sheet name', error?.message);
    return {
      title: fallback || 'Sheet1',
      sheetId: undefined,
    };
  }
};

const listSheetFiles = async (drive, query) =>
  drive.files.list({
    q: query,
    fields: 'files(id, name)',
    pageSize: 1,
    orderBy: 'createdTime desc',
  });

const findExistingSheet = async (clients, eventName) => {
  const { drive, sheets } = clients;
  const parentFolderId = process.env.GOOGLE_DOCS_PARENT_FOLDER_ID;
  const nameCandidates = buildNameCandidates(eventName);
  const desiredName = driveSafeName(eventName);

  for (const name of nameCandidates) {
    const baseQuery = [`mimeType='${SHEET_MIME}'`, "trashed=false", `name='${escapeForDriveQuery(name)}'`];
    const queries = [];
    if (parentFolderId) {
      queries.push([...baseQuery, `'${parentFolderId}' in parents`].join(' and '));
    }
    queries.push(baseQuery.join(' and '));

    for (const q of queries) {
      const res = await listSheetFiles(drive, q);
      const file = res.data?.files?.[0];
      if (file) {
        const info = await fetchSheetName(sheets, file.id, name);
        if (file.name !== desiredName) {
          try {
            const renameRes = await drive.files.update({
              fileId: file.id,
              requestBody: { name: desiredName },
              fields: 'id,name',
            });
            file.name = renameRes.data?.name || desiredName;
          } catch (error) {
            console.warn('[google-sheets] Failed to rename spreadsheet', {
              fileId: file.id,
              from: file.name,
              to: desiredName,
              error: error?.message,
            });
          }
        }
        return {
          spreadsheetId: file.id,
          sheetName: info.title,
          sheetId: info.sheetId,
          canonicalName: file.name || desiredName,
        };
      }
    }
  }

  return null;
};

const createSheet = async (clients, eventName, eventData) => {
  const { drive, sheets } = clients;
  const spreadsheetTitle = driveSafeName(eventName);
  const sheetName = sheetTabTitleForEvent(eventName);
  const created = await sheets.spreadsheets.create({
    requestBody: {
      properties: { title: spreadsheetTitle },
      sheets: [
        {
          properties: {
            title: sheetName,
            gridProperties: { frozenRowCount: 1 },
          },
        },
        {
          properties: {
            title: DETAIL_SHEET_TITLE,
            gridProperties: { frozenRowCount: 1, columnCount: 2 },
          },
        },
      ],
    },
  });

  const spreadsheetId = created.data.spreadsheetId;
  const sheetId = created.data?.sheets?.[0]?.properties?.sheetId;
  const parentFolderId = process.env.GOOGLE_DOCS_PARENT_FOLDER_ID;
  if (parentFolderId) {
    try {
      await drive.files.update({
        fileId: spreadsheetId,
        addParents: parentFolderId,
        fields: 'id, parents',
      });
    } catch (error) {
      console.warn('[google-sheets] Failed to move sheet into folder', error?.message);
    }
  }

  await ensureHeaderRow(clients, spreadsheetId, sheetName).catch(() => {});

  await updateEventDetailsSheet(clients, spreadsheetId, eventData).catch(() => {});

  return { spreadsheetId, sheetName, sheetId, canonicalName: spreadsheetTitle };
};

const ensureSheetForEvent = async (eventName, clients, eventData) => {
  const normalized = driveSafeName(eventName);
  const cacheKey = `drive:${normalized.toLowerCase()}`;

  if (sheetCache.has(cacheKey)) {
    return sheetCache.get(cacheKey);
  }

  let info = await findExistingSheet(clients, eventName);
  if (!info) {
    info = await createSheet(clients, eventName, eventData);
  } else if (eventData) {
    await updateEventDetailsSheet(clients, info.spreadsheetId, eventData).catch(() => {});
  }

  sheetCache.set(cacheKey, info);
  return info;
};

const formatSubmissionTime = (value) => {
  if (!value) return '';
  try {
    const date = value instanceof Date ? value : new Date(value);
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return String(value);
  }
};

const formatRegistrationRow = (registration) => {
  const submittedAt = registration.createdAt || registration.updatedAt || Date.now();

  return [
    registration.name || '',
    registration.email || '',
    registration.phone || '',
    registration.state || '',
    registration.qualification || '',
    registration.course || '',
    formatSubmissionTime(submittedAt),
  ];
};

const parseRowFromRange = (range) => {
  if (!range) return null;
  const match = range.match(/![A-Z]+(\d+)/i);
  if (match && match[1]) {
    return Number(match[1]);
  }
  return null;
};

const syncRegistrationToGoogleSheet = async (registration) => {
  const clients = getClients();
  if (!clients) return false;

  const eventName =
    registration.course ||
    (registration.eventDetails && registration.eventDetails.title) ||
    'Event Registrations';

  try {
    const { spreadsheetId, sheetName } = await ensureSheetForEvent(eventName, clients);
    const row = formatRegistrationRow(registration);
    let rowIndex = Number(registration.sheetRowIndex) || null;

    if (rowIndex) {
      const range = `${sheetName}!A${rowIndex}:G${rowIndex}`;
      await withRetries(
        () =>
          clients.sheets.spreadsheets.values.update({
            spreadsheetId,
            range,
            valueInputOption: 'RAW',
            requestBody: {
              values: [row],
            },
          }),
        'update registration row'
      );
    } else {
      const appendResult = await withRetries(
        () =>
          clients.sheets.spreadsheets.values.append({
            spreadsheetId,
            range: `${sheetName}!A:G`,
            valueInputOption: 'RAW',
            insertDataOption: 'INSERT_ROWS',
            requestBody: {
              values: [row],
            },
          }),
        'append registration'
      );
      rowIndex = parseRowFromRange(appendResult?.data?.updates?.updatedRange);
    }

    return Number.isFinite(rowIndex) ? rowIndex : null;
  } catch (error) {
    console.error('[google-sheets] Failed to sync registration', {
      error: error?.message,
      registrationId: registration._id || registration.id,
      event: eventName,
    });
    return false;
  }
};

const replaceEventRegistrationsSheet = async (eventName, registrations = []) => {
  const clients = getClients();
  if (!clients) return null;

  const { spreadsheetId, sheetName } = await ensureSheetForEvent(eventName, clients);
  await ensureHeaderRow(clients, spreadsheetId, sheetName).catch(() => {});
  await clearRegistrationRows(clients, spreadsheetId, sheetName).catch(() => {});

  if (registrations.length) {
    const rows = registrations.map((registration) => formatRegistrationRow(registration));
    const endRow = registrations.length + 1;
    await withRetries(
      () =>
        clients.sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `${sheetName}!A2:G${endRow}`,
          valueInputOption: 'RAW',
          requestBody: {
            values: rows,
          },
        }),
      'replace registration rows'
    );
  }

  const rowMap = new Map();
  registrations.forEach((registration, index) => {
    if (!registration?._id) return;
    rowMap.set(String(registration._id), index + 2);
  });

  return {
    spreadsheetId,
    sheetName,
    rowMap,
  };
};

const ensureEventSpreadsheet = async (eventInput) => {
  if (!eventInput) return null;
  const eventData = typeof eventInput === 'object' ? eventInput : null;
  const eventName = eventData?.title || eventInput;
  if (!eventName) return null;
  const clients = getClients();
  if (!clients) return null;
  try {
    return await ensureSheetForEvent(eventName, clients, eventData);
  } catch (error) {
    console.error('[google-sheets] Failed to ensure event spreadsheet', {
      event: eventName,
      error: error?.message,
    });
    throw error;
  }
};

module.exports = {
  syncRegistrationToGoogleSheet,
  ensureEventSpreadsheet,
  replaceEventRegistrationsSheet,
};
