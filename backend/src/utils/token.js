/*
  JWT helper
  - generateAuthToken: issues a signed token with subject and configured expiry
*/
const jwt = require('jsonwebtoken');
const config = require('../config/env');

const generateAuthToken = (userId) => {
  return jwt.sign(
    {
      sub: userId,
    },
    config.jwtSecret,
    {
      expiresIn: config.jwtExpiresIn,
    }
  );
};

module.exports = generateAuthToken;
