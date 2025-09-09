/**
 * Middleware to handle MongoDB / Mongoose errors and return friendly HTTP responses.
 */
module.exports = function dbErrorHandler(err, req, res, next) {
  // Mongoose validation error
  if (err && err.name === 'ValidationError') {
    const details = {};
    Object.keys(err.errors || {}).forEach((key) => {
      details[key] = err.errors[key].message;
    });
    return res.status(400).json({ error: 'Validation error', details });
  }

  // Mongoose cast error (invalid ObjectId or bad cast)
  if (err && err.name === 'CastError') {
    return res.status(400).json({ error: 'Invalid value', path: err.path, value: err.value });
  }

  // Duplicate key error from MongoDB
  // err.code === 11000 is the common duplicate key error code
  if (err && (err.code === 11000 || err.code === 11001)) {
    // Try to pull a useful field name from the error payload
    const key = err.keyValue ? Object.keys(err.keyValue)[0] : null;
    return res.status(409).json({ error: 'Duplicate key', field: key, keyValue: err.keyValue });
  }

  // MongoServerError (newer driver) with codeName 'DuplicateKey'
  if (err && err.name === 'MongoServerError' && err.code === 11000) {
    const key = err.keyValue ? Object.keys(err.keyValue)[0] : null;
    return res.status(409).json({ error: 'Duplicate key', field: key, keyValue: err.keyValue });
  }

  // Not a DB error we specially handle; pass to the next error handler
  return next(err);
};
