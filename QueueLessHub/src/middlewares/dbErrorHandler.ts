import { ErrorRequestHandler, NextFunction, Request, Response } from 'express';

type DbErrorWithMeta = {
  name?: string;
  code?: number;
  path?: string;
  value?: unknown;
  keyValue?: Record<string, unknown>;
  errors?: Record<string, { message: string }>;
};

/**
 * Middleware to handle MongoDB / Mongoose errors and return friendly HTTP responses.
 */
const dbErrorHandler: ErrorRequestHandler = (
  error,
  _request: Request,
  response: Response,
  next: NextFunction
) => {
  const dbError = error as DbErrorWithMeta;

  if (dbError?.name === 'ValidationError') {
    const details: Record<string, string> = {};
    Object.keys(dbError.errors || {}).forEach((key) => {
      details[key] = dbError.errors?.[key]?.message ?? 'Invalid value';
    });
    response.status(400).json({ error: 'Validation error', details });
    return;
  }

  if (dbError?.name === 'CastError') {
    response.status(400).json({ error: 'Invalid value', path: dbError.path, value: dbError.value });
    return;
  }

  if (dbError?.code === 11000 || dbError?.code === 11001) {
    const key = dbError.keyValue ? Object.keys(dbError.keyValue)[0] : null;
    response.status(409).json({ error: 'Duplicate key', field: key, keyValue: dbError.keyValue });
    return;
  }

  if (dbError?.name === 'MongoServerError' && dbError?.code === 11000) {
    const key = dbError.keyValue ? Object.keys(dbError.keyValue)[0] : null;
    response.status(409).json({ error: 'Duplicate key', field: key, keyValue: dbError.keyValue });
    return;
  }

  next(error);
};

export default dbErrorHandler;
