/*
  MongoDB connection helper
  - Establishes a Mongoose connection using the configured URI
  - Exits the process if a connection cannot be established
*/
const mongoose = require('mongoose');
const config = require('./env');

const connectDB = async () => {
  try {
    if (!config.mongoUri) {
      throw new Error('MONGODB_URI is not defined in environment variables');
    }

    await mongoose.connect(config.mongoUri, {
      serverSelectionTimeoutMS: 5000,
    });

    console.log('[database] MongoDB connected');
  } catch (error) {
    console.error('[database] MongoDB connection error:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
