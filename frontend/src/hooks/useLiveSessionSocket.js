import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { API_BASE_URL } from '../services/apiClient';

const resolveSocketBaseUrl = () => {
  const withoutApi = API_BASE_URL.replace(/\/api\/?$/, '');
  return withoutApi || API_BASE_URL;
};

const SOCKET_BASE_URL = resolveSocketBaseUrl();

const useLiveSessionSocket = ({ courseId, onSessionStarted, onSessionEnded }) => {
  const socketRef = useRef(null);

  useEffect(() => {
    if (!courseId) {
      return undefined;
    }

    const socket = io(SOCKET_BASE_URL, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
    });
    socketRef.current = socket;

    socket.emit('live-classes:join-course', { courseId });

    if (typeof onSessionStarted === 'function') {
      socket.on('live-session-started', (payload) => {
        if (payload?.session?.courseId === courseId) {
          onSessionStarted(payload.session);
        }
      });
    }

    if (typeof onSessionEnded === 'function') {
      socket.on('live-session-ended', (payload) => {
        if (payload?.session?.courseId === courseId) {
          onSessionEnded(payload.session);
        }
      });
    }

    return () => {
      socket.emit('live-classes:leave-course', { courseId });
      socket.disconnect();
      socketRef.current = null;
    };
  }, [courseId, onSessionStarted, onSessionEnded]);

  return socketRef;
};

export default useLiveSessionSocket;
