/*
  Lightweight WebSocket signaling server for WebRTC
  - Authenticates participants via short-lived signaling keys
  - Relays offers/answers/ICE candidates between participants in the same session
*/
const { WebSocketServer } = require('ws');
const { URL } = require('url');
const config = require('../config/env');
const liveEvents = require('./liveEvents');
const {
  verifyParticipantKey,
  setParticipantConnectionState,
  touchParticipant,
  toSessionSnapshot,
  getSessionRecord,
  getParticipantRecord,
  setScreenShareOwner,
  clearScreenShareOwnerIfMatches,
  logLiveEvent,
} = require('./liveStore');
const { LiveChatMessage } = require('../models/LiveChatMessage');

const SIGNAL_MESSAGE_TYPES = new Set([
  'webrtc-offer',
  'webrtc-answer',
  'webrtc-ice-candidate',
  'media-state',
  'kick',
]);
const DIRECT_MESSAGE_TYPES = new Set(['webrtc-offer', 'webrtc-answer', 'webrtc-ice-candidate', 'media-state', 'kick']);
const BROADCAST_MESSAGE_TYPES = new Set(['chat:message', 'reaction', 'hand-raise', 'spotlight']);

const sendJson = (ws, payload) => {
  if (!ws || ws.readyState !== ws.OPEN) {
    return;
  }

  try {
    ws.send(JSON.stringify(payload));
  } catch (error) {
    console.warn('[live-signaling] Failed to send payload', error?.message);
  }
};

const validateSignalPayload = (payload) => {
  if (!payload || typeof payload !== 'object') {
    return false;
  }

  if (!DIRECT_MESSAGE_TYPES.has(payload.type)) {
    return false;
  }

  if (!payload.target || typeof payload.target !== 'string') {
    return false;
  }

  return true;
};

const broadcastToSession = (connections, sessionId, message, roomId = null) => {
  const sessionConnections = connections.get(sessionId);
  if (!sessionConnections) {
    return;
  }
  sessionConnections.forEach((socket) => {
    if (roomId && socket.liveContext?.roomId && socket.liveContext.roomId !== roomId) {
      return;
    }
    sendJson(socket, message);
  });
};

const broadcastSessionState = async (connections, sessionId) => {
  const session = await getSessionRecord(sessionId);
  if (!session) {
    return;
  }

  const snapshot = await toSessionSnapshot(session, { includeParticipants: true });
  const sessionConnections = connections.get(sessionId);
  if (!sessionConnections) {
    return;
  }

  sessionConnections.forEach((socket) => {
    sendJson(socket, { type: 'session:update', session: snapshot });
  });
};

const handleShareState = async (connections, sessionId, participantId, ws, active) => {
  const session = await getSessionRecord(sessionId);
  if (!session) {
    return;
  }

  const participant = await getParticipantRecord(sessionId, participantId);
  if (!participant) {
    return;
  }

  const isHost = participant.role === 'instructor';
  const currentOwner = session.screenShareOwner ? String(session.screenShareOwner) : null;

  if (active) {
    if (!isHost && session.allowStudentScreenShare === false) {
      sendJson(ws, { type: 'share:denied', reason: 'disabled' });
      return;
    }

    if (currentOwner && currentOwner !== participantId) {
      if (isHost) {
        liveEvents.emit('participant-command', {
          sessionId,
          participantId: currentOwner,
          payload: { type: 'media-state', data: { screenShare: false } },
        });
      } else {
        sendJson(ws, { type: 'share:denied', reason: 'already-active', owner: currentOwner });
        return;
      }
    }

    await setScreenShareOwner(sessionId, participantId);
  } else {
    await clearScreenShareOwnerIfMatches(sessionId, participantId);
  }

  await broadcastSessionState(connections, sessionId);
  broadcastToSession(connections, sessionId, {
    type: 'share:owner',
    participantId: active ? participantId : null,
  });
};

const handleForwardMessage = (connections, sessionId, participantId, payload) => {
  const sessionConnections = connections.get(sessionId);
  if (!sessionConnections) {
    return;
  }

  const senderSocket = sessionConnections.get(participantId);

  if (!validateSignalPayload(payload)) {
    sendJson(senderSocket, {
      type: 'error',
      message: 'Invalid signaling payload.',
    });
    return;
  }

  const targetSocket = sessionConnections.get(payload.target);
  if (!targetSocket) {
    sendJson(senderSocket, {
      type: 'target-unavailable',
      target: payload.target,
    });
    return;
  }

  sendJson(targetSocket, {
    type: payload.type,
    from: participantId,
    data: payload.data,
  });
};

const attachLiveSignalingServer = (httpServer) => {
  if (!httpServer) {
    throw new Error('HTTP server instance is required to attach the live signaling server.');
  }

  const signalingPath = config.live?.signalingPath || '/live-signaling';
  const wss = new WebSocketServer({ noServer: true });
  const connections = new Map();

  const authenticateUpgrade = async (request) => {
    try {
      const requestUrl = new URL(request.url, `http://${request.headers.host}`);
      if (requestUrl.pathname !== signalingPath) {
        return { accepted: false, statusCode: 404, message: 'Not Found' };
      }

      const sessionId = requestUrl.searchParams.get('sessionId');
      const participantId = requestUrl.searchParams.get('participantId');
      const key = requestUrl.searchParams.get('key');

      const verification = await verifyParticipantKey(sessionId, participantId, key);
      if (!verification.valid) {
        return { accepted: false, statusCode: 401, message: 'Invalid signaling token' };
      }
      if (verification.participant?.waiting) {
        return { accepted: false, statusCode: 403, message: 'Waiting for instructor admission' };
      }

      const roomId = verification.participant?.roomId ? String(verification.participant.roomId) : null;
      return {
        accepted: true,
        sessionId,
        participantId,
        roomId,
      };
    } catch (error) {
      return { accepted: false, statusCode: 400, message: error?.message || 'Bad Request' };
    }
  };

  const rejectUpgrade = (socket, statusCode, message) => {
    try {
      socket.write(`HTTP/1.1 ${statusCode} ${message}\r\n\r\n`);
    } catch (_) {
      // no-op
    } finally {
      socket.destroy();
    }
  };

  httpServer.on('upgrade', async (request, socket, head) => {
    try {
      const result = await authenticateUpgrade(request);
      if (!result.accepted) {
        rejectUpgrade(socket, result.statusCode || 400, result.message || 'Bad Request');
        return;
      }

      wss.handleUpgrade(request, socket, head, (ws) => {
        ws.liveContext = {
          sessionId: result.sessionId,
          participantId: result.participantId,
          roomId: result.roomId,
        };
        wss.emit('connection', ws, request);
      });
    } catch (error) {
      rejectUpgrade(socket, 400, error?.message || 'Bad Request');
    }
  });

  wss.on('connection', (ws) => {
    const { sessionId, participantId } = ws.liveContext || {};
    if (!sessionId || !participantId) {
      ws.close();
      return;
    }

    let sessionConnections = connections.get(sessionId);
    if (!sessionConnections) {
      sessionConnections = new Map();
      connections.set(sessionId, sessionConnections);
    }

      sessionConnections.set(participantId, ws);
    setParticipantConnectionState(sessionId, participantId, true).catch(() => {});
    broadcastSessionState(connections, sessionId).catch(() => {});

    ws.on('message', async (rawMessage) => {
      let payload = null;
      try {
        payload = JSON.parse(rawMessage.toString());
      } catch (_) {
        sendJson(ws, { type: 'error', message: 'Signals must be JSON encoded.' });
        return;
      }

      if (payload.type === 'ping') {
        await touchParticipant(sessionId, participantId);
        sendJson(ws, { type: 'pong', timestamp: Date.now() });
        return;
      }

      if (payload.type === 'session:state') {
        broadcastSessionState(connections, sessionId).catch(() => {});
        return;
      }

      if (payload.type === 'chat:message') {
        await touchParticipant(sessionId, participantId);
        const text = typeof payload.data?.text === 'string' ? payload.data.text.trim() : '';
        if (!text) {
          sendJson(ws, { type: 'error', message: 'Chat message cannot be empty.' });
          return;
        }
        const truncated = text.slice(0, 500);
        let displayName = 'Participant';
        let senderRole = 'student';
        try {
          const participant = await getParticipantRecord(sessionId, participantId);
          displayName = participant?.displayName || displayName;
          senderRole = participant?.role || 'student';
          // optional persistence
          await LiveChatMessage.create({
            session: sessionId,
            participant: participantId,
            senderDisplayName: displayName,
            senderRole,
            message: truncated,
          });
          await logLiveEvent({
            sessionId,
            participantId,
            role: senderRole,
            kind: 'chat',
            data: { text: truncated },
          });
        } catch (_) {
          // ignore persistence errors
        }
        broadcastToSession(connections, sessionId, {
          type: 'chat:message',
          from: participantId,
          displayName,
          senderRole,
          text: truncated,
          timestamp: Date.now(),
        }, ws.liveContext?.roomId || null);
        return;
      }

      if (payload.type === 'reaction' || payload.type === 'hand-raise' || payload.type === 'spotlight') {
        await touchParticipant(sessionId, participantId);
        const senderRoom = ws.liveContext?.roomId || null;
        broadcastToSession(connections, sessionId, {
          type: payload.type,
          from: participantId,
          data: payload.data || {},
          timestamp: Date.now(),
        }, senderRoom);
        return;
      }

      if (payload.type === 'share:state') {
        await touchParticipant(sessionId, participantId);
        await handleShareState(connections, sessionId, participantId, ws, Boolean(payload.data?.active));
        return;
      }

      if (SIGNAL_MESSAGE_TYPES.has(payload.type)) {
        await touchParticipant(sessionId, participantId);
        handleForwardMessage(connections, sessionId, participantId, payload);
        return;
      }

      sendJson(ws, { type: 'error', message: 'Unknown signaling message type.' });
    });

    const cleanupConnection = async () => {
      const sessionConnectionsSnapshot = connections.get(sessionId);
      if (sessionConnectionsSnapshot) {
        sessionConnectionsSnapshot.delete(participantId);
        if (sessionConnectionsSnapshot.size === 0) {
          connections.delete(sessionId);
        }
      }

      await setParticipantConnectionState(sessionId, participantId, false);
      await broadcastSessionState(connections, sessionId);
    };

    ws.on('close', () => {
      cleanupConnection();
      logLiveEvent({
        sessionId,
        participantId,
        kind: 'disconnect',
      }).catch(() => {});
    });
    ws.on('error', () => {
      cleanupConnection();
      logLiveEvent({
        sessionId,
        participantId,
        kind: 'disconnect',
      }).catch(() => {});
    });

    (async () => {
      const initialSnapshot = await toSessionSnapshot(await getSessionRecord(sessionId), { includeParticipants: true });
      if (initialSnapshot) {
        sendJson(ws, { type: 'session:update', session: initialSnapshot });
      }
    })().catch(() => {});
  });

  console.log(`[live-signaling] WebSocket signaling mounted on ${config.serverUrl}${signalingPath}`);

  liveEvents.on('session-updated', (sessionId) => {
    broadcastSessionState(connections, sessionId).catch(() => {});
  });

  liveEvents.on('participant-command', ({ sessionId, participantId, payload }) => {
    const sessionConnections = connections.get(sessionId);
    if (!sessionConnections) {
      return;
    }
    const targetSocket = sessionConnections.get(participantId);
    if (targetSocket) {
      sendJson(targetSocket, payload);
    }
  });

  liveEvents.on('participant-room-changed', ({ sessionId, participantId, roomId }) => {
    const sessionConnections = connections.get(sessionId);
    if (!sessionConnections) return;
    const ws = sessionConnections.get(participantId);
    if (ws) {
      ws.liveContext = { ...(ws.liveContext || {}), roomId: roomId || null };
    }
  });

  return wss;
};

module.exports = { attachLiveSignalingServer };
