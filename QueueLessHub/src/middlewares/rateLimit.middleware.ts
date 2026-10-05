import rateLimit from 'express-rate-limit';
import { NextFunction, Request, RequestHandler, Response } from 'express';

const isTestEnvironment = process.env.NODE_ENV === 'test';
const noopLimiter: RequestHandler = (_req: Request, _res: Response, next: NextFunction): void => {
  next();
};

/**
 * Skip function for webhook routes that come through ngrok
 * Skip rate limiting for both webhook verification (GET) and event processing (POST) requests
 */
const skipWebhookVerification = (req: Request): boolean => {
  // Skip rate limiting for any webhook requests (GET verification or POST events)
  return req.path.includes('/api/bot/webhook');
};

/**
 * General Rate Limiter for the entire API
 * Moderate limit for general application usage
 */
const generalLimiter = isTestEnvironment
  ? noopLimiter
  : rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 100,
      skip: skipWebhookVerification,
      message: {
        error: 'Too many requests from this IP, please try again later.',
        retryAfter: '15 minutes',
      },
      standardHeaders: true,
      legacyHeaders: false,
      handler: (_request: Request, response: Response) => {
        response.status(429).json({
          error: 'Too many requests from this IP',
          message: 'You have exceeded the request limit. Please try again later.',
          retryAfter: '15 minutes',
        });
      },
    });

/**
 * Strict Rate Limiter for Authentication
 * Prevents brute force attacks on login/registration
 */
const authLimiter = isTestEnvironment
  ? noopLimiter
  : rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 5,
      skipSuccessfulRequests: true,
      message: {
        error: 'Too many authentication attempts',
        retryAfter: '15 minutes',
      },
      handler: (request: Request, response: Response) => {
        console.warn(`[RATE LIMIT] Excessive authentication attempts from IP: ${request.ip}`);
        response.status(429).json({
          error: 'Too many authentication attempts',
          message: 'You have exceeded the login attempt limit. Please try again in 15 minutes.',
          retryAfter: '15 minutes',
        });
      },
    });

/**
 * Rate Limiter for Appointment Creation
 * Prevents spam in appointment creation
 */
const appointmentCreationLimiter = isTestEnvironment
  ? noopLimiter
  : rateLimit({
      windowMs: 60 * 60 * 1000,
      max: 10,
      message: {
        error: 'Appointment creation limit reached',
        retryAfter: '1 hour',
      },
      handler: (request: Request, response: Response) => {
        console.warn(`[RATE LIMIT] Excessive appointment creation attempts from IP: ${request.ip}`);
        response.status(429).json({
          error: 'Appointment creation limit reached',
          message:
            'You have reached the limit of appointments you can create per hour. Please try again later.',
          retryAfter: '1 hour',
        });
      },
    });

/**
 * Rate Limiter for WhatsApp/Bot Webhook
 * Higher limit since these are automated external services
 */
const webhookLimiter = isTestEnvironment
  ? noopLimiter
  : rateLimit({
      windowMs: 1 * 60 * 1000,
      max: 30,
      message: {
        error: 'Too many webhook requests',
        retryAfter: '1 minute',
      },
      handler: (request: Request, response: Response) => {
        console.warn(`[RATE LIMIT] Webhook limit exceeded from IP: ${request.ip}`);
        response.status(429).json({
          error: 'Too many webhook requests',
          message: 'The messages per minute limit has been exceeded.',
          retryAfter: '1 minute',
        });
      },
    });

/**
 * Rate Limiter for Read Operations
 * Moderate limit for queries (GET)
 */
const readLimiter = isTestEnvironment
  ? noopLimiter
  : rateLimit({
      windowMs: 5 * 60 * 1000,
      max: 50,
      message: {
        error: 'Too many queries',
        retryAfter: '5 minutes',
      },
      handler: (_request: Request, response: Response) => {
        response.status(429).json({
          error: 'Too many queries',
          message: 'You have exceeded the query limit. Please try again in a few minutes.',
          retryAfter: '5 minutes',
        });
      },
    });

/**
 * Rate Limiter for Write Operations
 * More restrictive limit for POST/PUT/DELETE
 */
const writeLimiter = isTestEnvironment
  ? noopLimiter
  : rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 20,
      message: {
        error: 'Too many write operations',
        retryAfter: '15 minutes',
      },
      handler: (request: Request, response: Response) => {
        console.warn(`[RATE LIMIT] Excessive write operations from IP: ${request.ip}`);
        response.status(429).json({
          error: 'Too many write operations',
          message: 'You have exceeded the operations limit. Please try again later.',
          retryAfter: '15 minutes',
        });
      },
    });

export {
  generalLimiter,
  authLimiter,
  appointmentCreationLimiter,
  webhookLimiter,
  readLimiter,
  writeLimiter,
};
