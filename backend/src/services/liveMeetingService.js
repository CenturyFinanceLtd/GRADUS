const fetch = require('node-fetch');
const dayjs = require('dayjs');
const config = require('../config/env');

const logger = {
  info: (...args) => console.log('[liveMeetingService]', ...args),
  error: (...args) => console.error('[liveMeetingService]', ...args),
};

let cachedTeamsToken = null;
let cachedZoomToken = null;

const isTokenValid = (tokenCache) => {
  if (!tokenCache || !tokenCache.token || !tokenCache.expiresAt) {
    return false;
  }
  return dayjs().isBefore(tokenCache.expiresAt.subtract(1, 'minute'));
};

const requestTeamsAccessToken = async () => {
  const { tenantId, clientId, clientSecret } = config.liveClass.teams;

  if (!tenantId || !clientId || !clientSecret) {
    logger.info('Teams credentials missing, skipping token request.');
    return null;
  }

  const url = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
  const params = new URLSearchParams();
  params.append('client_id', clientId);
  params.append('client_secret', clientSecret);
  params.append('scope', 'https://graph.microsoft.com/.default');
  params.append('grant_type', 'client_credentials');

  const response = await fetch(url, {
    method: 'POST',
    body: params,
  });

  if (!response.ok) {
    const body = await response.text();
    logger.error('Failed to obtain Teams access token:', body);
    throw new Error(`Teams auth failed: ${body}`);
  }

  const tokenData = await response.json();
  cachedTeamsToken = {
    token: tokenData.access_token,
    expiresAt: dayjs().add(tokenData.expires_in || 3500, 'second'),
  };

  return cachedTeamsToken.token;
};

const getTeamsAccessToken = async () => {
  if (isTokenValid(cachedTeamsToken)) {
    return cachedTeamsToken.token;
  }
  return requestTeamsAccessToken();
};

const parseErrorPayload = async (response) => {
  let raw = null;
  try {
    raw = await response.text();
    return raw ? JSON.parse(raw) : {};
  } catch (error) {
    return raw ? { raw } : {};
  }
};

const formatGraphError = (errorPayload) => {
  if (!errorPayload) {
    return 'Unknown Microsoft Graph error.';
  }

  const error = errorPayload.error || errorPayload;
  const parts = [];

  if (error.code) {
    parts.push(`Code: ${error.code}`);
  }

  if (error.message) {
    parts.push(`Message: ${error.message}`);
  }

  if (error.innerError) {
    if (error.innerError['request-id']) {
      parts.push(`Request ID: ${error.innerError['request-id']}`);
    }
    if (error.innerError['date']) {
      parts.push(`Timestamp: ${error.innerError['date']}`);
    }
  }

  if (parts.length === 0 && errorPayload.raw) {
    parts.push(errorPayload.raw);
  }

  return parts.join(' | ') || 'Unknown Microsoft Graph error.';
};

const fetchGraph = async (url, options) => {
  const response = await fetch(url, options);
  const ok = response.ok;
  let payload = null;

  try {
    payload = await response.json();
  } catch (error) {
    try {
      const text = await response.text();
      payload = text ? { raw: text } : null;
    } catch (inner) {
      payload = null;
    }
  }

  return { ok, payload };
};

const createTeamsMeetingViaCalendar = async ({ title, startTime, endDate, token, organizer }) => {
  const url = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(organizer)}/events`;
  const body = {
    subject: title || 'Gradus Live Class',
    start: {
      dateTime: dayjs(startTime).toISOString(),
      timeZone: 'UTC',
    },
    end: {
      dateTime: dayjs(endDate).toISOString(),
      timeZone: 'UTC',
    },
    isOnlineMeeting: true,
    onlineMeetingProvider: 'teamsForBusiness',
    attendees: [],
  };

  const { ok, payload } = await fetchGraph(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!ok) {
    throw new Error(
      `Calendar-based meeting creation failed. ${formatGraphError(payload) || 'Ensure Calendars.ReadWrite permission is granted.'}`
    );
  }

  if (!payload?.onlineMeeting?.joinUrl) {
    throw new Error('Calendar event created, but Teams join URL is missing.');
  }

  return {
    provider: 'teams',
    meetingId: payload.id,
    joinUrl: payload.onlineMeeting.joinUrl,
    startUrl: payload.onlineMeetingUrl || payload.onlineMeeting?.joinUrl,
    password: '',
    organizerEmail: organizer,
    raw: payload,
  };
};

const createTeamsMeeting = async ({ title, startTime, durationMinutes, organizerUserId }) => {
  const token = await getTeamsAccessToken();
  const configuredOrganizer = organizerUserId || config.liveClass.teams.organizerUserId;

  if (!token || !configuredOrganizer) {
    logger.info('Insufficient Teams configuration to create meeting.');
    throw new Error('Teams organizer configuration is incomplete.');
  }

  const startDate = dayjs(startTime);
  const endDate = startDate.add(durationMinutes || 60, 'minute');
  const payload = {
    subject: title || 'Gradus Live Class',
    startDateTime: startDate.toISOString(),
    endDateTime: endDate.toISOString(),
    participants: {
      attendees: [],
    },
  };

  const baseUrl = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(configuredOrganizer)}/onlineMeetings`;

  const { ok, payload: meetingPayload } = await fetchGraph(baseUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!ok) {
    logger.error('Failed to create Teams meeting:', meetingPayload);

    // Try createOrGet fallback for better reliability
    const fallbackPayload = {
      ...payload,
      externalId: `gradus-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    };

    const { ok: fallbackOk, payload: fallbackPayloadResponse } = await fetchGraph(`${baseUrl}/createOrGet`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(fallbackPayload),
    });

    if (!fallbackOk) {
      logger.error('Teams createOrGet failed:', fallbackPayloadResponse);

      // As a last resort, try calendar-based meeting creation (requires Calendars.ReadWrite)
      try {
        return await createTeamsMeetingViaCalendar({
          title,
          startTime,
          endDate,
          token,
          organizer: configuredOrganizer,
        });
      } catch (calendarError) {
        logger.error('Teams calendar fallback failed:', calendarError);
        throw new Error(
          formatGraphError(fallbackPayloadResponse)
            || calendarError.message
            || formatGraphError(meetingPayload)
            || 'Microsoft Teams refused to create the meeting.'
        );
      }
    }

    const meeting = fallbackPayloadResponse;

    return {
      provider: 'teams',
      meetingId: meeting.id,
      joinUrl: meeting.joinWebUrl,
      startUrl: meeting.joinWebUrl,
      password: '',
      organizerEmail: meeting.organizer?.emailAddress?.address || configuredOrganizer || '',
      raw: meeting,
    };
  }

  const meeting = meetingPayload;

  return {
    provider: 'teams',
    meetingId: meeting.id,
    joinUrl: meeting.joinWebUrl,
    startUrl: meeting.joinWebUrl,
    password: '',
    organizerEmail: meeting.organizer?.emailAddress?.address || configuredOrganizer || '',
    raw: meeting,
  };
};

const requestZoomAccessToken = async () => {
  const { accountId, clientId, clientSecret } = config.liveClass.zoom;

  if (!accountId || !clientId || !clientSecret) {
    logger.info('Zoom credentials missing, skipping token request.');
    throw new Error('Zoom configuration missing.');
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const response = await fetch(
    `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${encodeURIComponent(accountId)}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
      },
    }
  );

  if (!response.ok) {
    const body = await response.text();
    logger.error('Failed to obtain Zoom access token:', body);
    throw new Error(`Zoom auth failed: ${body}`);
  }

  const tokenData = await response.json();
  cachedZoomToken = {
    token: tokenData.access_token,
    expiresAt: dayjs().add(tokenData.expires_in || 3500, 'second'),
  };

  return cachedZoomToken.token;
};

const getZoomAccessToken = async () => {
  if (isTokenValid(cachedZoomToken)) {
    return cachedZoomToken.token;
  }
  return requestZoomAccessToken();
};

const createZoomMeeting = async ({ title, startTime, durationMinutes }) => {
  const token = await getZoomAccessToken();
  const { userId } = config.liveClass.zoom;

  if (!token || !userId) {
    logger.info('Insufficient Zoom configuration to create meeting.');
    throw new Error('Zoom organizer configuration is incomplete.');
  }

  const response = await fetch(`https://api.zoom.us/v2/users/${encodeURIComponent(userId)}/meetings`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      topic: title || 'Gradus Live Class',
      type: 2,
      start_time: dayjs(startTime).toISOString(),
      duration: durationMinutes || 60,
      settings: {
        join_before_host: false,
        waiting_room: false,
        approval_type: 2,
        mute_upon_entry: true,
        auto_recording: 'cloud',
      },
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    logger.error('Failed to create Zoom meeting:', body);
    throw new Error(body || 'Zoom meeting creation failed');
  }

  const meeting = await response.json();

  return {
    provider: 'zoom',
    meetingId: String(meeting.id),
    joinUrl: meeting.join_url,
    startUrl: meeting.start_url,
    password: meeting.password || '',
    organizerEmail: meeting.host_email || '',
    raw: meeting,
  };
};

const createLiveMeeting = async ({ provider, title, startTime, durationMinutes, organizerUserId }) => {
  const normalizedProvider = (provider || config.liveClass.defaultProvider || 'teams').toLowerCase();

  if (normalizedProvider === 'teams') {
    return createTeamsMeeting({ title, startTime, durationMinutes, organizerUserId });
  }

  if (normalizedProvider === 'zoom') {
    return createZoomMeeting({ title, startTime, durationMinutes });
  }

  throw new Error(`Unsupported live meeting provider: ${provider}`);
};

module.exports = {
  createLiveMeeting,
};
