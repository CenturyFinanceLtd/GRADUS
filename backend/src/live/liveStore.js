/*
  Supabase-backed store for live session metadata and participants
  - Migrated from Mongoose
*/
const { v4: uuidv4 } = require("uuid");
const supabase = require("../config/supabase");

// --- HELPER MAPPERS ---

const mapSession = (row) => {
  if (!row) return null;
  return {
    _id: row.id, // Keep _id for compat, but it's a UUID now
    id: row.id,
    title: row.title,
    status: row.status,
    scheduledFor: row.scheduled_for,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    hostAdminId: row.host_admin_id,
    hostDisplayName: row.host_display_name,
    hostSecret: row.host_secret,
    courseId: row.course_id,
    courseName: row.course_name,
    courseSlug: row.course_slug,
    allowStudentAudio: row.allow_student_audio,
    allowStudentVideo: row.allow_student_video,
    allowStudentScreenShare: row.allow_student_screen_share,
    waitingRoomEnabled: row.waiting_room_enabled,
    locked: row.locked,
    passcodeHash: row.passcode_hash,
    meetingToken: row.meeting_token,
    bannedUserIds: row.banned_user_ids || [],
    screenShareOwner: row.screen_share_owner,
    lastActivityAt: row.last_activity_at,
    // Computed/Virtual fields logic removed here, handled in snapshot
    isLive: row.status === "live",
    isJoinable: row.status !== "ended",
  };
};

const mapParticipant = (row) => {
  if (!row) return null;
  return {
    _id: row.id,
    id: row.id,
    session: row.session_id,
    role: row.role,
    displayName: row.display_name,
    userId: row.user_id,
    adminId: row.admin_id,
    signalingKey: row.signaling_key,
    connected: row.connected,
    waiting: row.waiting,
    roomId: row.room_id,
    metadata: row.metadata || {},
    joinedAt: row.joined_at,
    lastSeenAt: row.last_seen_at,
  };
};

const mapRoom = (row) => ({
  id: row.id,
  _id: row.id,
  session: row.session_id,
  name: row.name,
  slug: row.slug,
});

const mapEvent = (row) => ({
  id: row.id,
  _id: row.id,
  session: row.session_id,
  participantId: row.participant_id,
  role: row.role,
  kind: row.kind,
  data: row.data || {},
  createdAt: row.created_at,
});

const mapMessage = (row) => ({
  id: row.id,
  _id: row.id,
  session: row.session_id,
  participant: row.participant_id,
  senderRole: row.sender_role,
  senderDisplayName: row.sender_display_name,
  message: row.message,
  createdAt: row.created_at,
});

const mapRecording = (row) => ({
  id: row.id,
  _id: row.id,
  session: row.session_id,
  adminId: row.admin_id,
  participantId: row.participant_id,
  url: row.url,
  publicId: row.public_id,
  bytes: row.bytes,
  durationMs: row.duration_ms,
  format: row.format,
  createdAt: row.created_at,
});

// --- SNAPSHOT BUILDERS ---

const toParticipantSnapshot = (
  participant,
  { includeSignalingKey = false } = {}
) => {
  if (!participant) return null;
  const snapshot = {
    id: participant.id,
    sessionId: participant.session,
    displayName: participant.displayName,
    role: participant.role,
    userId: participant.userId,
    adminId: participant.adminId,
    joinedAt: participant.joinedAt,
    lastSeenAt: participant.lastSeenAt,
    connected: Boolean(participant.connected),
    waiting: Boolean(participant.waiting),
    roomId: participant.roomId,
    metadata: participant.metadata,
  };
  if (includeSignalingKey) snapshot.signalingKey = participant.signalingKey;
  return snapshot;
};

const toSessionSnapshot = async (session, options = {}) => {
  if (!session) return null;
  const {
    includeParticipants = false,
    includeHostSecret = false,
    participants = null,
  } = options;

  let participantList = [];
  if (includeParticipants) {
    participantList =
      participants || (await getParticipantsForSession(session.id));
  }

  const snapshot = {
    id: session.id,
    title: session.title,
    status: session.status,
    scheduledFor: session.scheduledFor,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    startedAt: session.startedAt,
    endedAt: session.endedAt,
    hostAdminId: session.hostAdminId,
    hostDisplayName: session.hostDisplayName,
    courseId: session.courseId,
    courseName: session.courseName,
    courseSlug: session.courseSlug,
    totalParticipantCount: participantList.length,
    activeParticipantCount: participantList.filter((p) => p.connected).length,
    isLive: session.status === "live",
    isJoinable: session.status !== "ended",
    allowStudentAudio: session.allowStudentAudio,
    allowStudentVideo: session.allowStudentVideo,
    allowStudentScreenShare: session.allowStudentScreenShare,
    screenShareOwner: session.screenShareOwner,
    waitingRoomEnabled: session.waitingRoomEnabled,
    locked: session.locked,
    requiresPasscode: Boolean(session.passcodeHash),
  };

  if (includeParticipants) {
    snapshot.participants = participantList.map((p) =>
      toParticipantSnapshot(p)
    );
  }

  if (options.includeRooms) {
    const rooms = await listRoomsForSession(session.id);
    snapshot.rooms = rooms.map((r) => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
    }));
  }

  if (includeHostSecret) {
    snapshot.hostSecret = session.hostSecret;
    snapshot.meetingToken = session.meetingToken;
  }
  return snapshot;
};

// --- CORE OPERATIONS ---

const createSessionRecord = async ({
  title,
  scheduledFor,
  hostAdminId,
  hostDisplayName,
  courseId,
  courseName,
  courseSlug,
  passcodeHash = null,
  waitingRoomEnabled = false,
  locked = false,
}) => {
  const { data, error } = await supabase
    .from("live_sessions")
    .insert([
      {
        title: title?.trim() || "Untitled live class",
        status: "scheduled",
        scheduled_for: scheduledFor || null,
        host_admin_id: hostAdminId,
        host_display_name: hostDisplayName,
        host_secret: uuidv4(),
        meeting_token: uuidv4(),
        course_id: courseId || null,
        course_name: courseName || null,
        course_slug: courseSlug || null,
        passcode_hash: passcodeHash,
        waiting_room_enabled: waitingRoomEnabled,
        locked: locked,
        last_activity_at: new Date(),
      },
    ])
    .select()
    .single();

  if (error) {
    console.error("createSessionRecord Error:", error);
    throw new Error(error.message);
  }
  return mapSession(data);
};

const updateSessionRecord = async (sessionId, updates = {}) => {
  if (!sessionId) return null;
  // Map updates to snake_case
  const payload = {
    ...updates,
    updated_at: new Date(),
    last_activity_at: new Date(),
  };
  const mapped = {};
  if (updates.title !== undefined) mapped.title = updates.title;
  if (updates.status !== undefined) mapped.status = updates.status;
  if (updates.scheduledFor !== undefined)
    mapped.scheduled_for = updates.scheduledFor;
  if (updates.startedAt !== undefined) mapped.started_at = updates.startedAt;
  if (updates.endedAt !== undefined) mapped.ended_at = updates.endedAt;
  if (updates.courseId !== undefined) mapped.course_id = updates.courseId;
  if (updates.courseName !== undefined) mapped.course_name = updates.courseName;
  if (updates.courseSlug !== undefined) mapped.course_slug = updates.courseSlug;
  if (updates.allowStudentAudio !== undefined)
    mapped.allow_student_audio = updates.allowStudentAudio;
  if (updates.allowStudentVideo !== undefined)
    mapped.allow_student_video = updates.allowStudentVideo;
  if (updates.allowStudentScreenShare !== undefined)
    mapped.allow_student_screen_share = updates.allowStudentScreenShare;
  if (updates.waitingRoomEnabled !== undefined)
    mapped.waiting_room_enabled = updates.waitingRoomEnabled;
  if (updates.locked !== undefined) mapped.locked = updates.locked;
  if (updates.passcodeHash !== undefined)
    mapped.passcode_hash = updates.passcodeHash;
  if (updates.meetingToken !== undefined)
    mapped.meeting_token = updates.meetingToken;
  if (updates.$addToSet && updates.$addToSet.bannedUserIds) {
    // Handling array append is tricky with simple updates.
    // Fetch current, append, update.
    const curr = await getSessionRecord(sessionId);
    if (curr) {
      const banned = new Set(curr.bannedUserIds || []);
      banned.add(updates.$addToSet.bannedUserIds);
      mapped.banned_user_ids = Array.from(banned);
      // Clean up special key
    }
  }
  // Fallback for direct assignments from liveService
  if (updates.lastActivityAt) mapped.last_activity_at = updates.lastActivityAt;

  const { data, error } = await supabase
    .from("live_sessions")
    .update(mapped)
    .eq("id", sessionId)
    .select()
    .single();

  if (error) return null;
  return mapSession(data);
};

const getSessionRecord = async (sessionId) => {
  if (!sessionId) return null;
  const { data, error } = await supabase
    .from("live_sessions")
    .select("*")
    .eq("id", sessionId)
    .single();
  if (error) return null;
  return mapSession(data);
};

const getSessionSnapshot = async (sessionId, options = {}) => {
  const session = await getSessionRecord(sessionId);
  return toSessionSnapshot(session, options);
};

const getParticipantsForSession = async (sessionId) => {
  if (!sessionId) return [];
  const { data, error } = await supabase
    .from("live_participants")
    .select("*")
    .eq("session_id", sessionId);
  if (error) return [];
  return data.map(mapParticipant);
};

const addParticipantRecord = async (sessionId, payload) => {
  const session = await getSessionRecord(sessionId);
  if (!session) return null;

  const timestamp = new Date();
  const { data: participantData, error } = await supabase
    .from("live_participants")
    .insert([
      {
        session_id: sessionId,
        role: payload.role,
        display_name: payload.displayName || "Participant",
        user_id: payload.userId,
        admin_id: payload.adminId,
        joined_at: timestamp,
        last_seen_at: timestamp,
        signaling_key: uuidv4(),
        connected: false,
        waiting: Boolean(payload.waiting),
        room_id: payload.roomId || null,
        metadata: payload.metadata || {},
      },
    ])
    .select()
    .single();

  if (error) throw new Error(error.message);

  // Update session activity
  await supabase
    .from("live_sessions")
    .update({ updated_at: timestamp, last_activity_at: timestamp })
    .eq("id", sessionId);

  return {
    session: session, // Optimistic return (session isn't deeply changed by adding participant record)
    participant: mapParticipant(participantData),
  };
};

const getParticipantRecord = async (sessionId, participantId) => {
  if (!sessionId || !participantId) return null;
  const { data } = await supabase
    .from("live_participants")
    .select("*")
    .eq("id", participantId)
    .eq("session_id", sessionId)
    .single();
  return mapParticipant(data);
};

const removeParticipantRecord = async (sessionId, participantId) => {
  if (!sessionId || !participantId) return false;
  const { error } = await supabase
    .from("live_participants")
    .delete()
    .eq("id", participantId)
    .eq("session_id", sessionId);

  if (!error) {
    await clearScreenShareOwnerIfMatches(sessionId, participantId);
    return true;
  }
  return false;
};

const setParticipantConnectionState = async (
  sessionId,
  participantId,
  connected
) => {
  if (!sessionId || !participantId) return null;
  const timestamp = new Date();
  const { data } = await supabase
    .from("live_participants")
    .update({ connected: Boolean(connected), last_seen_at: timestamp })
    .eq("id", participantId)
    .eq("session_id", sessionId)
    .select()
    .single();

  if (data) {
    await supabase
      .from("live_sessions")
      .update({ updated_at: timestamp, last_activity_at: timestamp })
      .eq("id", sessionId);
    if (!connected)
      await clearScreenShareOwnerIfMatches(sessionId, participantId);
  }
  return mapParticipant(data);
};

const setParticipantWaitingState = async (
  sessionId,
  participantId,
  waiting
) => {
  if (!sessionId || !participantId) return null;
  const timestamp = new Date();
  const { data } = await supabase
    .from("live_participants")
    .update({ waiting: Boolean(waiting), last_seen_at: timestamp })
    .eq("id", participantId)
    .eq("session_id", sessionId)
    .select()
    .single();

  if (data) {
    await supabase
      .from("live_sessions")
      .update({ last_activity_at: timestamp })
      .eq("id", sessionId);
    if (!waiting)
      await clearScreenShareOwnerIfMatches(sessionId, participantId);
  }
  return mapParticipant(data);
};

const createRoomRecord = async (sessionId, { name, slug }) => {
  const { data } = await supabase
    .from("live_rooms")
    .insert([{ session_id: sessionId, name, slug }])
    .select()
    .single();
  return mapRoom(data);
};

const listRoomsForSession = async (sessionId) => {
  const { data } = await supabase
    .from("live_rooms")
    .select("*")
    .eq("session_id", sessionId);
  return (data || []).map(mapRoom);
};

const setParticipantRoom = async (sessionId, participantId, roomId) => {
  const timestamp = new Date();
  const { data } = await supabase
    .from("live_participants")
    .update({
      room_id: roomId || null,
      updated_at: timestamp,
      last_seen_at: timestamp,
    })
    .eq("id", participantId)
    .eq("session_id", sessionId)
    .select()
    .single();

  if (data) {
    await supabase
      .from("live_sessions")
      .update({ last_activity_at: timestamp })
      .eq("id", sessionId);
  }
  return mapParticipant(data);
};

const logLiveEvent = async ({ sessionId, participantId, role, kind, data }) => {
  await supabase.from("live_events").insert([
    {
      session_id: sessionId,
      participant_id: participantId,
      role,
      kind,
      data: data || {},
    },
  ]);
};

const listLiveEvents = async (sessionId, { limit = 500 } = {}) => {
  const { data } = await supabase
    .from("live_events")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data || []).map(mapEvent);
};

const setScreenShareOwner = async (sessionId, participantId) => {
  const normalized = participantId ? String(participantId) : null;
  const { data } = await supabase
    .from("live_sessions")
    .update({ screen_share_owner: normalized, last_activity_at: new Date() })
    .eq("id", sessionId)
    .select()
    .single();
  return mapSession(data);
};

const clearScreenShareOwnerIfMatches = async (sessionId, participantId) => {
  // Concurrency check difficult in simplistic update, trusting optimistic
  const { data } = await supabase
    .from("live_sessions")
    .update({ screen_share_owner: null, last_activity_at: new Date() })
    .eq("id", sessionId)
    .eq("screen_share_owner", participantId) // Only clear if matches
    .select()
    .single();
  return mapSession(data);
};

const verifyParticipantKey = async (sessionId, participantId, key) => {
  if (!sessionId || !participantId || !key) return { valid: false };
  const { data: participant } = await supabase
    .from("live_participants")
    .select("*")
    .eq("id", participantId)
    .eq("session_id", sessionId)
    .eq("signaling_key", key)
    .single();

  if (!participant) return { valid: false };
  const session = await getSessionRecord(sessionId);
  return {
    valid: Boolean(session),
    session,
    participant: mapParticipant(participant),
  };
};

const touchParticipant = async (sessionId, participantId) => {
  const timestamp = new Date();
  await supabase
    .from("live_participants")
    .update({ last_seen_at: timestamp })
    .eq("id", participantId)
    .eq("session_id", sessionId);
  await supabase
    .from("live_sessions")
    .update({ last_activity_at: timestamp })
    .eq("id", sessionId);
};

const listSessionSnapshots = async (options = {}) => {
  // Lists most recent 100 sessions to avoid massive load
  const { data: sessions, error } = await supabase
    .from("live_sessions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error || !sessions) return [];

  const sessionObjects = sessions.map(mapSession);
  return Promise.all(sessionObjects.map((s) => toSessionSnapshot(s, options)));
};

// --- NEW ADDITIONS FOR SERVICE INTEGRATION ---

const createChatMessage = async ({
  sessionId,
  participantId,
  senderRole,
  senderDisplayName,
  message,
}) => {
  const { data } = await supabase
    .from("live_chat_messages")
    .insert([
      {
        session_id: sessionId,
        participant_id: participantId,
        sender_role: senderRole,
        sender_display_name: senderDisplayName,
        message,
      },
    ])
    .select()
    .single();
  return mapMessage(data);
};

const listChatMessages = async (sessionId, limit = 200) => {
  const { data } = await supabase
    .from("live_chat_messages")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true })
    .limit(limit);
  return (data || []).map(mapMessage);
};

const createRecordingRecord = async ({
  sessionId,
  adminId,
  participantId,
  url,
  publicId,
  bytes,
  durationMs,
  format,
}) => {
  const { data } = await supabase
    .from("live_recordings")
    .insert([
      {
        session_id: sessionId,
        admin_id: adminId,
        participant_id: participantId,
        url,
        public_id: publicId,
        bytes,
        duration_ms: durationMs,
        format,
      },
    ])
    .select()
    .single();
  return mapRecording(data);
};

module.exports = {
  createSessionRecord,
  updateSessionRecord,
  getSessionRecord,
  getParticipantsForSession,
  addParticipantRecord,
  getParticipantRecord,
  removeParticipantRecord,
  setParticipantConnectionState,
  setParticipantWaitingState,
  createRoomRecord,
  listRoomsForSession,
  setParticipantRoom,
  logLiveEvent,
  listLiveEvents,
  setScreenShareOwner,
  clearScreenShareOwnerIfMatches,
  verifyParticipantKey,
  touchParticipant,
  listSessionSnapshots,

  createChatMessage,
  listChatMessages,
  createRecordingRecord,

  getSessionSnapshot,
  toSessionSnapshot,
  toParticipantSnapshot,
  LIVE_SESSION_STATUSES: ["scheduled", "live", "ended"],
};
