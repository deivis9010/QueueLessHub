const rateLimit = require('express-rate-limit');

/**
 * General Rate Limiter for the entire API
 * Moderate limit for general application usage
 */
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window per IP
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  // Customize the message based on the reached limit
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many requests from this IP',
      message: 'You have exceeded the request limit. Please try again later.',
      retryAfter: '15 minutes'
    });
  }
});

/**
 * Strict Rate Limiter for Authentication
 * Prevents brute force attacks on login/registration
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Only 5 authentication attempts
  skipSuccessfulRequests: true, // Don't count successful requests (200-299)
  message: {
    error: 'Too many authentication attempts',
    retryAfter: '15 minutes'
  },
  handler: (req, res) => {
    console.warn(`[RATE LIMIT] Excessive authentication attempts from IP: ${req.ip}`);
    res.status(429).json({
      error: 'Too many authentication attempts',
      message: 'You have exceeded the login attempt limit. Please try again in 15 minutes.',
      retryAfter: '15 minutes'
    });
  }
});

/**
 * Rate Limiter for Appointment Creation
 * Prevents spam in appointment creation
 */
const appointmentCreationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Maximum 10 appointments per hour per IP
  message: {
    error: 'Appointment creation limit reached',
    retryAfter: '1 hour'
  },
  handler: (req, res) => {
    console.warn(`[RATE LIMIT] Excessive appointment creation attempts from IP: ${req.ip}`);
    res.status(429).json({
      error: 'Appointment creation limit reached',
      message: 'You have reached the limit of appointments you can create per hour. Please try again later.',
      retryAfter: '1 hour'
    });
  }
});

/**
 * Rate Limiter for WhatsApp/Bot Webhook
 * Higher limit since these are automated external services
 */
const webhookLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // 30 messages per minute
  message: {
    error: 'Too many webhook requests',
    retryAfter: '1 minute'
  },
  handler: (req, res) => {
    console.warn(`[RATE LIMIT] Webhook limit exceeded from IP: ${req.ip}`);
    res.status(429).json({
      error: 'Too many webhook requests',
      message: 'The messages per minute limit has been exceeded.',
      retryAfter: '1 minute'
    });
  }
});

/**
 * Rate Limiter for Read Operations
 * Moderate limit for queries (GET)
 */
const readLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 50, // 50 read requests
  message: {
    error: 'Too many queries',
    retryAfter: '5 minutes'
  },
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many queries',
      message: 'You have exceeded the query limit. Please try again in a few minutes.',
      retryAfter: '5 minutes'
    });
  }
});

/**
 * Rate Limiter for Write Operations
 * More restrictive limit for POST/PUT/DELETE
 */
const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 write operations
  message: {
    error: 'Too many write operations',
    retryAfter: '15 minutes'
  },
  handler: (req, res) => {
    console.warn(`[RATE LIMIT] Excessive write operations from IP: ${req.ip}`);
    res.status(429).json({
      error: 'Too many write operations',
      message: 'You have exceeded the operations limit. Please try again later.',
      retryAfter: '15 minutes'
    });
  }
});

module.exports = {
  generalLimiter,
  authLimiter,
  appointmentCreationLimiter,
  webhookLimiter,
  readLimiter,
  writeLimiter
};
