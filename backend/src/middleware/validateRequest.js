const { validationResult } = require('express-validator');

const validateRequest = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const error = new Error('Validation failed');
    error.details = errors.array().map((err) => ({
      field: err.path,
      message: err.msg,
    }));
    res.status(422);
    return next(error);
  }

  next();
};

module.exports = validateRequest;
