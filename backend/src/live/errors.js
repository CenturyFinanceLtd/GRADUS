/*
  Custom error for live classes domain
  - Allows throwing typed errors with HTTP status codes and optional details
*/
class LiveSessionError extends Error {
  constructor(message, statusCode = 400, details) {
    super(message);
    this.name = 'LiveSessionError';
    this.statusCode = statusCode;
    if (details) {
      this.details = details;
    }
  }
}

module.exports = { LiveSessionError };
