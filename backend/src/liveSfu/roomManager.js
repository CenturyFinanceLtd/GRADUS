const mediasoup = require('mediasoup');
const { v4: uuidv4 } = require('uuid');
const liveSfuConfig = require('../config/liveSfu');

let worker = null;
let router = null;
const rooms = new Map(); // roomId -> { producers: Map, consumers: Map, transports: Map }

const createWorker = async () => {
  if (worker) return worker;
  worker = await mediasoup.createWorker({
    rtcMinPort: 40000,
    rtcMaxPort: 49999,
  });
  worker.on('died', () => {
    console.error('[sfu] mediasoup worker died');
    process.exit(1);
  });
  return worker;
};

const createRouter = async () => {
  if (router) return router;
  const wrk = await createWorker();
  router = await wrk.createRouter({
    mediaCodecs: [
      {
        kind: 'audio',
        mimeType: 'audio/opus',
        clockRate: 48000,
        channels: 2,
      },
      {
        kind: 'video',
        mimeType: 'video/VP8',
        clockRate: 90000,
        parameters: { 'x-google-start-bitrate': 1000 },
      },
    ],
  });
  return router;
};

const getRoom = async (roomId) => {
  const existing = rooms.get(roomId);
  if (existing) return existing;
  const routerInstance = await createRouter();
  const room = {
    id: roomId,
    router: routerInstance,
    transports: new Map(),
    producers: new Map(),
    consumers: new Map(),
  };
  rooms.set(roomId, room);
  return room;
};

const createWebRtcTransport = async (room) => {
  const transport = await room.router.createWebRtcTransport({
    listenIps: liveSfuConfig.listenIps,
    initialAvailableOutgoingBitrate: liveSfuConfig.webRtcTransport.initialAvailableOutgoingBitrate,
    minimumAvailableOutgoingBitrate: liveSfuConfig.webRtcTransport.minimumAvailableOutgoingBitrate,
    enableUdp: true,
    enableTcp: true,
    preferUdp: true,
    appData: { roomId: room.id },
  });
  if (liveSfuConfig.webRtcTransport.maxIncomingBitrate) {
    await transport.setMaxIncomingBitrate(liveSfuConfig.webRtcTransport.maxIncomingBitrate);
  }
  const id = uuidv4();
  room.transports.set(id, transport);
  transport.appData.transportId = id;
  transport.on('dtlsstatechange', (state) => {
    if (state === 'closed') {
      transport.close();
      room.transports.delete(id);
    }
  });
  return transport;
};

const closeRoom = (roomId) => {
  const room = rooms.get(roomId);
  if (!room) return;
  room.consumers.forEach((c) => c.close());
  room.producers.forEach((p) => p.close());
  room.transports.forEach((t) => t.close());
  rooms.delete(roomId);
};

module.exports = {
  getRoom,
  createWebRtcTransport,
  closeRoom,
};

