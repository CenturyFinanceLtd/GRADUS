const startSignalingServer = require('./signaling');

const startLiveSfu = (httpServer) => {
  startSignalingServer(httpServer);
};

module.exports = startLiveSfu;

