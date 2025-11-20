/*
  Lightweight WebSocket signaling server for WebRTC
  - Authenticates participants via short-lived signaling keys
  - Relays offers/answers/ICE candidates between participants in the same session
*/
const { WebSocketServer } = require('ws');
const { URL } = require('url');
const config = require('../config/env');
const {
  verifyParticipantKey,
  setParticipantConnectionState,
  touchParticipant,
  toSessionSnapshot,
  getSessionRecord,
} = require('./liveStore');

const SIGNAL_MESSAGE_TYPES = new Set(['webrtc-offer', 'webrtc-answer', 'webrtc-ice-candidate', 'media-state']);

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

  if (!SIGNAL_MESSAGE_TYPES.has(payload.type)) {
    return false;
  }

  if (!payload.target || typeof payload.target !== 'string') {
    return false;
  }

  return true;
};

const broadcastSessionState = (connections, sessionId) => {
  const session = getSessionRecord(sessionId);
  if (!session) {
    return;
  }

  const snapshot = toSessionSnapshot(session, { includeParticipants: true });
  const sessionConnections = connections.get(sessionId);
  if (!sessionConnections) {
    return;
  }

  sessionConnections.forEach((socket) => {
    sendJson(socket, { type: 'session:update', session: snapshot });
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

  const authenticateUpgrade = (request) => {
    try {
      const requestUrl = new URL(request.url, `http://${request.headers.host}`);
      if (requestUrl.pathname !== signalingPath) {
        return { accepted: false, statusCode: 404, message: 'Not Found' };
      }

      const sessionId = requestUrl.searchParams.get('sessionId');
      const participantId = requestUrl.searchParams.get('participantId');
      const key = requestUrl.searchParams.get('key');

      const verification = verifyParticipantKey(sessionId, participantId, key);
      if (!verification.valid) {
        return { accepted: false, statusCode: 401, message: 'Invalid signaling token' };
      }

      return {
        accepted: true,
        sessionId,
        participantId,
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

  httpServer.on('upgrade', (request, socket, head) => {
    const result = authenticateUpgrade(request);
    if (!result.accepted) {
      rejectUpgrade(socket, result.statusCode || 400, result.message || 'Bad Request');
      return;
    }

    wss.handleUpgrade(request, socket, head, (ws) => {
      ws.liveContext = {
        sessionId: result.sessionId,
        participantId: result.participantId,
      };
      wss.emit('connection', ws, request);
    });
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
    setParticipantConnectionState(sessionId, participantId, true);
    broadcastSessionState(connections, sessionId);

    ws.on('message', (rawMessage) => {
      let payload = null;
      try {
        payload = JSON.parse(rawMessage.toString());
      } catch (_) {
        sendJson(ws, { type: 'error', message: 'Signals must be JSON encoded.' });
        return;
      }

      if (payload.type === 'ping') {
        touchParticipant(sessionId, participantId);
        sendJson(ws, { type: 'pong', timestamp: Date.now() });
        return;
      }

      if (payload.type === 'session:state') {
        broadcastSessionState(connections, sessionId);
        return;
      }

      if (SIGNAL_MESSAGE_TYPES.has(payload.type)) {
        touchParticipant(sessionId, participantId);
        handleForwardMessage(connections, sessionId, participantId, payload);
        return;
      }

      sendJson(ws, { type: 'error', message: 'Unknown signaling message type.' });
    });

    const cleanupConnection = () => {
      const sessionConnectionsSnapshot = connections.get(sessionId);
      if (sessionConnectionsSnapshot) {
        sessionConnectionsSnapshot.delete(participantId);
        if (sessionConnectionsSnapshot.size === 0) {
          connections.delete(sessionId);
        }
      }

      setParticipantConnectionState(sessionId, participantId, false);
      broadcastSessionState(connections, sessionId);
    };

    ws.on('close', cleanupConnection);
    ws.on('error', cleanupConnection);

    const initialSnapshot = toSessionSnapshot(getSessionRecord(sessionId), { includeParticipants: true });
    if (initialSnapshot) {
      sendJson(ws, { type: 'session:update', session: initialSnapshot });
    }
  });

  console.log(`[live-signaling] WebSocket signaling mounted on ${config.serverUrl}${signalingPath}`);
  return wss;
};

module.exports = { attachLiveSignalingServer };
