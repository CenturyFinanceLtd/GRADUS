const { Server } = require('socket.io');
const config = require('../config/env');

let ioInstance = null;

const COURSE_ROOM_PREFIX = 'course:';

const buildCourseRoom = (courseId) => `${COURSE_ROOM_PREFIX}${courseId}`;

const initSocket = (httpServer) => {
  if (ioInstance) {
    return ioInstance;
  }

  ioInstance = new Server(httpServer, {
    cors: {
      origin: config.clientOrigins,
      credentials: true,
    },
  });

  ioInstance.on('connection', (socket) => {
    socket.on('live-classes:join-course', ({ courseId }) => {
      if (!courseId) {
        return;
      }
      socket.join(buildCourseRoom(courseId));
    });

    socket.on('live-classes:leave-course', ({ courseId }) => {
      if (!courseId) {
        return;
      }
      socket.leave(buildCourseRoom(courseId));
    });
  });

  return ioInstance;
};

const getSocket = () => {
  if (!ioInstance) {
    throw new Error('Socket.io server has not been initialized yet.');
  }

  return ioInstance;
};

const emitCourseEvent = (courseId, eventName, payload) => {
  if (!ioInstance || !courseId) {
    return;
  }

  ioInstance.to(buildCourseRoom(courseId)).emit(eventName, payload);
};

module.exports = {
  initSocket,
  getSocket,
  emitCourseEvent,
};
