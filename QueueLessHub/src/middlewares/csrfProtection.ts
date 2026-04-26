import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

/**
 * CSRF Protection Middleware using Double-Submit Cookie Pattern
 *
 * Architecture:
 * 1. Generate CSRF token per session, store in httpOnly cookie
 * 2. Require token in X-CSRF-Token header for state-changing requests
 * 3. Validate token on server-side before processing
 * 4. Exclude webhook endpoints from CSRF requirement
 */

const CSRF_COOKIE_NAME = 'X-CSRF-Token';
const CSRF_HEADER_NAME = 'x-csrf-token';

/**
 * Generate a new CSRF token
 */
export const generateCsrfToken = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Set CSRF token in httpOnly cookie
 */
export const setCsrfTokenCookie = (res: Response, token: string): void => {
  const isProduction = process.env.NODE_ENV === 'production';
  res.cookie(CSRF_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    path: '/',
  });
};

/**
 * Middleware to generate or refresh CSRF token for GET requests
 */
export const generateCsrfTokenMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Generate new token for each request (session-based)
  const token = generateCsrfToken();
  setCsrfTokenCookie(res, token);

  // Store token in res.locals for endpoint response
  res.locals.csrfToken = token;

  next();
};

/**
 * Middleware to validate CSRF token for state-changing operations
 * Should be applied to POST, PUT, DELETE endpoints
 */
export const validateCsrfToken = (req: Request, res: Response, next: NextFunction): void => {
  // Skip validation for GET, HEAD, OPTIONS
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // Get CSRF token from cookie and header
  const tokenFromCookie = req.cookies[CSRF_COOKIE_NAME];
  const tokenFromHeader = req.headers[CSRF_HEADER_NAME];

  // Validate both tokens exist
  if (!tokenFromCookie || !tokenFromHeader) {
    res.status(403).json({
      error: 'CSRF token missing',
      message: 'X-CSRF-Token header is required for state-changing operations',
    });
    return;
  }

  // Validate tokens match (Double-Submit Cookie Pattern)
  if (tokenFromCookie !== tokenFromHeader) {
    res.status(403).json({
      error: 'CSRF token invalid',
      message: 'X-CSRF-Token header does not match cookie',
    });
    return;
  }

  // Token is valid, proceed
  next();
};

/**
 * Skip CSRF validation for specific routes (e.g., webhooks)
 * Usage: app.post('/webhook', skipCsrf, handleWebhook);
 */
export const skipCsrf = (req: Request, res: Response, next: NextFunction): void => {
  next();
};
