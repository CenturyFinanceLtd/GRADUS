const WebSocket = require('ws');
const { getRoom, createWebRtcTransport } = require('./roomManager');
const liveSfuConfig = require('../config/liveSfu');

const startSignalingServer = (httpServer) => {
  const wss = new WebSocket.Server({ noServer: true });

  // Upgrade HTTP to WS for /ws/sfu
  httpServer.on('upgrade', (request, socket, head) => {
    if (!request.url || !request.url.startsWith('/ws/sfu')) {
      return;
    }
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  });

  const roomPeers = new Map(); // roomId -> Set of sockets

  wss.on('connection', (ws) => {
    let role = null;
    let roomId = null;
    const peerTransports = new Map(); // transportId -> transport

    const send = (message) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
      }
    };

    ws.on('message', async (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        const { action, data = {} } = msg;

        if (action === 'join') {
          role = data.role;
          roomId = data.roomId;
          if (!roomId) {
            send({ action: 'error', error: 'roomId required' });
            return;
          }
          const room = await getRoom(roomId);
          if (!roomPeers.has(roomId)) {
            roomPeers.set(roomId, new Set());
          }
          roomPeers.get(roomId).add(ws);
          send({
            action: 'joined',
            data: {
              routerRtpCapabilities: room.router.rtpCapabilities,
              iceServers: liveSfuConfig.iceServers,
              producers: [...room.producers.keys()],
            },
          });
          return;
        }

        if (!roomId) {
          send({ action: 'error', error: 'Join first' });
          return;
        }

        const room = await getRoom(roomId);

        switch (action) {
          case 'createTransport': {
            const transport = await createWebRtcTransport(room);
            peerTransports.set(transport.appData.transportId, transport);
            send({
              action: 'transportCreated',
              data: {
                id: transport.id,
                transportId: transport.appData.transportId,
                iceParameters: transport.iceParameters,
                iceCandidates: transport.iceCandidates,
                dtlsParameters: transport.dtlsParameters,
              },
            });
            break;
          }
          case 'connectTransport': {
            const { transportId, dtlsParameters } = data;
            const transport = peerTransports.get(transportId) || room.transports.get(transportId);
            if (!transport) {
              send({ action: 'error', error: 'transport not found' });
              break;
            }
            await transport.connect({ dtlsParameters });
            send({ action: 'transportConnected', data: { transportId } });
            break;
          }
          case 'produce': {
            if (role !== 'host') {
              send({ action: 'error', error: 'Only host can produce' });
              break;
            }
            const { transportId, kind, rtpParameters } = data;
            const transport = peerTransports.get(transportId) || room.transports.get(transportId);
            if (!transport) {
              send({ action: 'error', error: 'transport not found' });
              break;
            }
            const producer = await transport.produce({ kind, rtpParameters });
            producer.appData = { roomId, owner: 'host' };
            room.producers.set(producer.id, producer);
            producer.on('transportclose', () => room.producers.delete(producer.id));
            send({ action: 'produced', data: { producerId: producer.id } });
            const peers = roomPeers.get(roomId) || new Set();
            peers.forEach((peer) => {
              if (peer !== ws && peer.readyState === WebSocket.OPEN) {
                peer.send(JSON.stringify({ action: 'producerAdded', data: { producerId: producer.id } }));
              }
            });
            break;
          }
          case 'consume': {
            let { producerId } = data;
            const { transportId, rtpCapabilities } = data;
            const transport = peerTransports.get(transportId) || room.transports.get(transportId);
            if (!producerId) {
              const first = [...room.producers.keys()][0];
              producerId = first;
            }
            const producer = room.producers.get(producerId);
            if (!transport || !producer) {
              send({ action: 'error', error: 'transport or producer not found' });
              break;
            }
            if (!room.router.canConsume({ producerId, rtpCapabilities })) {
              send({ action: 'error', error: 'Cannot consume' });
              break;
            }
            const consumer = await transport.consume({
              producerId,
              rtpCapabilities,
              paused: false,
            });
            room.consumers.set(consumer.id, consumer);
            consumer.on('transportclose', () => room.consumers.delete(consumer.id));
            send({
              action: 'consumed',
              data: {
                producerId,
                id: consumer.id,
                kind: consumer.kind,
                rtpParameters: consumer.rtpParameters,
              },
            });
            break;
          }
          case 'resumeConsumer': {
            const { consumerId } = data;
            const consumer = room.consumers.get(consumerId);
            if (consumer) {
              await consumer.resume();
              send({ action: 'consumerResumed', data: { consumerId } });
            }
            break;
          }
          default:
            send({ action: 'error', error: `Unknown action ${action}` });
        }
      } catch (error) {
        console.error('[sfu] message error', error);
        send({ action: 'error', error: error?.message || 'Server error' });
      }
    });

    ws.on('close', () => {
      peerTransports.forEach((t) => t.close());
      if (roomId && roomPeers.has(roomId)) {
        roomPeers.get(roomId).delete(ws);
      }
    });
  });

  console.log('[sfu] WebSocket signaling enabled at /ws/sfu');
};

module.exports = startSignalingServer;
