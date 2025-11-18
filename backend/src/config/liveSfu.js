/*
  Live SFU configuration
  - Tweak listen IPs/ports and ICE servers to match your deployment
*/
const parseUrls = (value = '') =>
  value
    .split(',')
    .map((u) => u.trim())
    .filter(Boolean);

const config = {
  listenIps: [
    {
      ip: '0.0.0.0',
      announcedIp: process.env.SFU_ANNOUNCED_IP || null,
    },
  ],
  webRtcTransport: {
    // Bump defaults to handle 720/1080p; tune per infra
    initialAvailableOutgoingBitrate: 2_500_000,
    minimumAvailableOutgoingBitrate: 800_000,
    maxIncomingBitrate: 4_000_000,
  },
  listenPort: Number(process.env.SFU_PORT || 4000),
  iceServers: [
    // STUN (fallback to Google if none provided)
    ...(process.env.STUN_URL
      ? [{ urls: parseUrls(process.env.STUN_URL) }]
      : [{ urls: ['stun:stun.l.google.com:19302'] }]),
    // TURN for production traversal
    ...(process.env.TURN_URL
      ? [
          {
            urls: parseUrls(process.env.TURN_URL),
            username: process.env.TURN_USERNAME || '',
            credential: process.env.TURN_PASSWORD || '',
          },
        ]
      : []),
  ],
};

module.exports = config;
