import { Device } from 'mediasoup-client';

const buildWsUrl = () => {
  const env = import.meta.env;
  if (env && env.VITE_SFU_WS_URL) {
    return env.VITE_SFU_WS_URL;
  }
  if (env && env.VITE_API_BASE_URL) {
    return env.VITE_API_BASE_URL.replace(/^http/i, 'ws').replace(/\/api$/i, '') + '/ws/sfu';
  }
  if (typeof window !== 'undefined') {
    return `${window.location.origin.replace(/^http/i, 'ws')}/ws/sfu`;
  }
  return 'ws://localhost:5000/ws/sfu';
};

export class LiveSfuClient {
  constructor({ role, roomId, wsUrl } = {}) {
    this.role = role;
    this.roomId = roomId;
    this.wsUrl = wsUrl || buildWsUrl();
    this.device = null;
    this.ws = null;
    this.producerTransport = null;
    this.consumerTransport = null;
    this.producer = null;
    this.consumers = new Map();
    this.iceServers = [];
  }

  async connect() {
    this.ws = new WebSocket(this.wsUrl);
    return new Promise((resolve, reject) => {
      this.ws.onopen = () => {
        this.send({ action: 'join', data: { role: this.role, roomId: this.roomId } });
      };
      this.ws.onerror = reject;
      this.ws.onmessage = async (event) => {
        const msg = JSON.parse(event.data);
        if (msg.action === 'joined') {
          this.device = new Device();
          await this.device.load({ routerRtpCapabilities: msg.data.routerRtpCapabilities });
          this.iceServers = msg.data.iceServers || [];
          resolve();
        }
      };
    });
  }

  send(message) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  async createSendTransport() {
    this.send({ action: 'createTransport' });
    const transportOptions = await this.waitFor('transportCreated');
    const serverTransportId = transportOptions.data.transportId || transportOptions.data.id;
    const transport = this.device.createSendTransport({
      ...transportOptions.data,
      id: transportOptions.data.id || transportOptions.data.transportId,
      iceServers: this.iceServers,
    });
    transport.appData.serverTransportId = serverTransportId;
    this.wireTransport(transport, 'host');
    this.producerTransport = transport;
    return transport;
  }

  async createRecvTransport() {
    this.send({ action: 'createTransport' });
    const transportOptions = await this.waitFor('transportCreated');
    const serverTransportId = transportOptions.data.transportId || transportOptions.data.id;
    const transport = this.device.createRecvTransport({
      ...transportOptions.data,
      id: transportOptions.data.id || transportOptions.data.transportId,
      iceServers: this.iceServers,
    });
    transport.appData.serverTransportId = serverTransportId;
    this.wireTransport(transport, 'viewer');
    this.consumerTransport = transport;
    return transport;
  }

  wireTransport(transport, mode) {
    transport.on('connect', ({ dtlsParameters }, callback, errback) => {
      const transportId = transport.appData.serverTransportId || transport.id;
      this.send({ action: 'connectTransport', data: { transportId, dtlsParameters } });
      this.waitFor('transportConnected', (m) => m.data.transportId === transportId)
        .then(() => callback())
        .catch(errback);
    });

    if (mode === 'host') {
      transport.on('produce', ({ kind, rtpParameters }, callback, errback) => {
        const transportId = transport.appData.serverTransportId || transport.id;
        this.send({
          action: 'produce',
          data: { transportId, kind, rtpParameters },
        });
        this.waitFor('produced')
          .then((msg) => callback({ id: msg.data.producerId }))
          .catch(errback);
      });
    }
  }

  async produce(track) {
    if (!this.producerTransport) {
      await this.createSendTransport();
    }
    this.producer = await this.producerTransport.produce({ track });
    return this.producer;
  }

  async consumeAll(onTrack) {
    if (!this.consumerTransport) {
      await this.createRecvTransport();
    }
    const requestConsume = (producerId) => {
      const transportId = this.consumerTransport.appData.serverTransportId || this.consumerTransport.id;
      this.send({
        action: 'consume',
        data: {
          transportId,
          producerId,
          rtpCapabilities: this.device.rtpCapabilities,
        },
      });
    };

    // Request all current producers
    requestConsume(null);

    this.ws.addEventListener('message', async (event) => {
      const msg = JSON.parse(event.data);
      if (msg.action === 'consumed') {
        const { producerId, id, kind, rtpParameters } = msg.data;
        const consumer = await this.consumerTransport.consume({
          id,
          producerId,
          kind,
          rtpParameters,
          appData: { producerId },
        });
        this.consumers.set(consumer.id, consumer);
        onTrack(consumer.track, consumer);
        this.send({ action: 'resumeConsumer', data: { consumerId: consumer.id } });
      } else if (msg.action === 'producerAdded') {
        requestConsume(msg.data.producerId);
      }
    });
  }

  waitFor(action, matcher) {
    return new Promise((resolve, reject) => {
      const handler = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.action !== action) return;
          if (matcher && !matcher(msg)) return;
          this.ws.removeEventListener('message', handler);
          resolve(msg);
        } catch (err) {
          reject(err);
        }
      };
      this.ws.addEventListener('message', handler);
      setTimeout(() => {
        this.ws.removeEventListener('message', handler);
        reject(new Error(`Timeout waiting for ${action}`));
      }, 10000);
    });
  }
}

export const createLiveSfuClient = (opts) => new LiveSfuClient(opts);
