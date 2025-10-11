const LiveSession = require('../models/LiveSession');

const dropIndexIfExists = async (indexName) => {
  try {
    await LiveSession.collection.dropIndex(indexName);
    console.log(`[liveSessions] Dropped legacy index ${indexName}`);
  } catch (error) {
    if (error.codeName === 'IndexNotFound' || error.message?.includes('index not found')) {
      return;
    }
    console.warn(`[liveSessions] Failed to drop index ${indexName}:`, error.message);
  }
};

const ensureLiveSessionIndexes = async () => {
  if (!LiveSession.collection) {
    return;
  }

  await dropIndexIfExists('meetingCode_1');

  try {
    await LiveSession.syncIndexes();
  } catch (error) {
    console.warn('[liveSessions] Failed to sync indexes:', error.message);
  }
};

module.exports = ensureLiveSessionIndexes;
