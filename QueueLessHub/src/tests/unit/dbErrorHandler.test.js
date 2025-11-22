const dbErrorHandler = require('../../middlewares/dbErrorHandler');

describe('dbErrorHandler Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {};
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
  });

  describe('ValidationError', () => {
    it('should handle Mongoose ValidationError', () => {
      const err = {
        name: 'ValidationError',
        errors: {
          username: { message: 'Username is required' },
          email: { message: 'Email is invalid' }
        }
      };

      dbErrorHandler(err, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Validation error',
        details: {
          username: 'Username is required',
          email: 'Email is invalid'
        }
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle ValidationError with no errors object', () => {
      const err = {
        name: 'ValidationError',
        errors: null
      };

      dbErrorHandler(err, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Validation error',
        details: {}
      });
    });
  });

  describe('CastError', () => {
    it('should handle Mongoose CastError', () => {
      const err = {
        name: 'CastError',
        path: '_id',
        value: 'invalid-id'
      };

      dbErrorHandler(err, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Invalid value',
        path: '_id',
        value: 'invalid-id'
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('Duplicate Key Error', () => {
    it('should handle MongoDB duplicate key error (code 11000)', () => {
      const err = {
        code: 11000,
        keyValue: { username: 'testuser' }
      };

      dbErrorHandler(err, req, res, next);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Duplicate key',
        field: 'username',
        keyValue: { username: 'testuser' }
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle MongoDB duplicate key error (code 11001)', () => {
      const err = {
        code: 11001,
        keyValue: { email: 'test@example.com' }
      };

      dbErrorHandler(err, req, res, next);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Duplicate key',
        field: 'email',
        keyValue: { email: 'test@example.com' }
      });
    });

    it('should handle MongoServerError with DuplicateKey', () => {
      const err = {
        name: 'MongoServerError',
        code: 11000,
        keyValue: { phone: '+1234567890' }
      };

      dbErrorHandler(err, req, res, next);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Duplicate key',
        field: 'phone',
        keyValue: { phone: '+1234567890' }
      });
    });

    it('should handle duplicate key error without keyValue', () => {
      const err = {
        code: 11000,
        keyValue: null
      };

      dbErrorHandler(err, req, res, next);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Duplicate key',
        field: null,
        keyValue: null
      });
    });
  });

  describe('Other Errors', () => {
    it('should pass non-DB errors to next middleware', () => {
      const err = new Error('Some other error');

      dbErrorHandler(err, req, res, next);

      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalledWith(err);
    });

    it('should pass unhandled DB errors to next middleware', () => {
      const err = {
        name: 'UnknownDatabaseError',
        message: 'Something went wrong'
      };

      dbErrorHandler(err, req, res, next);

      expect(next).toHaveBeenCalledWith(err);
    });
  });
});
