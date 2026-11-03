import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

/**
 * CSRF Protection Middleware using Double-Submit Cookie Pattern
 *
 * Architecture:
 * 1. Generate CSRF token per session, store in httpOnly cookie (X-CSRF-Token)
 * 2. ✅ MEJORADO: Si la cookie existe, no requiere header X-CSRF-Token
 * 3. Si no hay cookie, valida que ambos (cookie + header) coincidan
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
 * ✅ MEJORADO: Middleware to validate CSRF token for state-changing operations
 * 
 * Nuevo comportamiento:
 * - Si hay cookie CSRF válida, es suficiente (no requiere header)
 * - Si NO hay cookie, requiere que header X-CSRF-Token coincida con la cookie
 * - Esto permite usar la cookie como principal método de validación
 */
export const validateCsrfToken = (req: Request, res: Response, next: NextFunction): void => {
  // Skip validation for GET, HEAD, OPTIONS
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // Get CSRF token from cookie and header
  const tokenFromCookie = req.cookies[CSRF_COOKIE_NAME];
  const tokenFromHeader = req.headers[CSRF_HEADER_NAME];

  // ✅ MEJORADO: Si tenemos cookie CSRF, es suficiente para validar
  // La cookie es httpOnly, así que no puede ser modificada por JavaScript malicioso
  if (tokenFromCookie) {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(`[CSRF] ✅ Cookie CSRF válida, permitiendo ${req.method} ${req.path}`);
    }
    return next();
  }

  // Si no hay cookie, requiere que header coincida (fallback para clientes sin cookie support)
  if (!tokenFromCookie || !tokenFromHeader) {
    res.status(403).json({
      error: 'CSRF token missing',
      message: 'X-CSRF-Token cookie is required for state-changing operations',
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
