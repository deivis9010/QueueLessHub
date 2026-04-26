/**
 * URL Validation Middleware
 * Protects against SSRF, Open Redirect, and malicious URL attacks
 */

import { URL } from 'url';
import type { Request, Response, NextFunction } from 'express';
import type { ValidatedRequest } from '../types/auth.types';

/**
 * Blocked protocols that could be dangerous
 */
const BLOCKED_PROTOCOLS = [
  'file:',
  'ftp:',
  'gopher:',
  'data:',
  'dict:',
  'ldap:',
  'sftp:',
  'tftp:',
  'telnet:',
];

/**
 * Private/Internal IP ranges to block (prevents SSRF to internal networks)
 */
const PRIVATE_IP_RANGES = [
  /^127\./, // Loopback
  /^10\./, // Private Class A
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // Private Class B
  /^192\.168\./, // Private Class C
  /^169\.254\./, // Link-local
  /^::1$/, // IPv6 loopback
  /^fc00:/, // IPv6 private
  /^fe80:/, // IPv6 link-local
  /^localhost$/i, // localhost
];

/**
 * Metadata endpoints (AWS, GCP, Azure) - CRITICAL to block
 */
const METADATA_ENDPOINTS = [
  '169.254.169.254', // AWS/GCP metadata
  'metadata.google.internal', // GCP
  '100.100.100.200', // Alibaba Cloud
];

interface ValidationResult {
  isValid: boolean;
  error?: string;
  parsedUrl?: URL;
}

/**
 * Validates if a URL is safe to use
 * @param {string} urlString - URL to validate
 * @returns {Object} { isValid: boolean, error?: string, parsedUrl?: Object }
 */
const validateUrl = (urlString: string | unknown): ValidationResult => {
  if (!urlString || typeof urlString !== 'string') {
    return { isValid: false, error: 'URL is required and must be a string' };
  }

  // Remove whitespace
  const trimmedUrl = urlString.trim();

  // Basic length check (prevent DoS)
  if (trimmedUrl.length > 2048) {
    return { isValid: false, error: 'URL is too long (max 2048 characters)' };
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(trimmedUrl);
  } catch (error) {
    return { isValid: false, error: 'Invalid URL format' };
  }

  // Check protocol
  if (BLOCKED_PROTOCOLS.includes(parsedUrl.protocol)) {
    return {
      isValid: false,
      error: `Protocol ${parsedUrl.protocol} is not allowed`,
    };
  }

  // Only allow HTTP and HTTPS
  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    return { isValid: false, error: 'Only HTTP and HTTPS protocols are allowed' };
  }

  // Check for metadata endpoints (SSRF prevention)
  if (METADATA_ENDPOINTS.some((endpoint) => parsedUrl.hostname?.includes(endpoint))) {
    console.warn(`[SECURITY] Blocked metadata endpoint attempt: ${trimmedUrl}`);
    return { isValid: false, error: 'Access to metadata endpoints is forbidden' };
  }

  // Check for private/internal IPs (SSRF prevention)
  if (PRIVATE_IP_RANGES.some((range) => range.test(parsedUrl.hostname || ''))) {
    console.warn(`[SECURITY] Blocked private IP access attempt: ${trimmedUrl}`);
    return { isValid: false, error: 'Access to private/internal networks is forbidden' };
  }

  // Check for suspicious patterns
  if (parsedUrl.hostname === '' || parsedUrl.hostname === 'localhost') {
    return { isValid: false, error: 'Invalid hostname' };
  }

  // Check for encoded characters that might bypass filters
  if (/%00|%0[aA]|%0[dD]/.test(trimmedUrl)) {
    console.warn(`[SECURITY] Blocked URL with null bytes: ${trimmedUrl}`);
    return { isValid: false, error: 'URL contains invalid encoded characters' };
  }

  return { isValid: true, parsedUrl };
};

/**
 * Middleware to validate URLs in request body
 * Usage: app.post('/api/webhook', validateUrlInBody('webhookUrl'), handler)
 */
const validateUrlInBody = (fieldName = 'url') => {
  return (req: ValidatedRequest, res: Response, next: NextFunction): void => {
    const urlToValidate = req.body[fieldName];

    if (!urlToValidate) {
      res.status(400).json({
        error: 'Validation failed',
        message: `Field '${fieldName}' is required`,
      });
      return;
    }

    const validation = validateUrl(urlToValidate);

    if (!validation.isValid) {
      console.warn(
        `[URL_VALIDATOR] Blocked invalid URL in body.${fieldName}: ${urlToValidate} - ${validation.error}`
      );
      res.status(400).json({
        error: 'Invalid URL',
        message: validation.error,
      });
      return;
    }

    // Attach parsed URL to request for later use
    req.validatedUrl = validation.parsedUrl;
    next();
  };
};

/**
 * Middleware to validate URLs in query parameters
 * Usage: app.get('/redirect', validateUrlInQuery('redirect_to'), handler)
 */
const validateUrlInQuery = (paramName = 'url') => {
  return (req: ValidatedRequest, res: Response, next: NextFunction): void => {
    const urlToValidate = req.query[paramName];

    if (!urlToValidate) {
      res.status(400).json({
        error: 'Validation failed',
        message: `Query parameter '${paramName}' is required`,
      });
      return;
    }

    const validation = validateUrl(urlToValidate);

    if (!validation.isValid) {
      console.warn(
        `[URL_VALIDATOR] Blocked invalid URL in query.${paramName}: ${urlToValidate} - ${validation.error}`
      );
      res.status(400).json({
        error: 'Invalid URL',
        message: validation.error,
      });
      return;
    }

    req.validatedUrl = validation.parsedUrl;
    next();
  };
};

/**
 * Validates URLs in webhook configurations (for bot routes)
 * Made optional - only validates if URL is provided
 */
const validateWebhookUrl = (req: ValidatedRequest, res: Response, next: NextFunction): void => {
  const webhookUrl = req.body.webhookUrl || req.body.url || req.body.callback_url;

  if (!webhookUrl) {
    next(); // Optional webhook URL
    return;
  }

  const validation = validateUrl(webhookUrl);

  if (!validation.isValid) {
    console.warn(
      `[WEBHOOK_VALIDATOR] Blocked invalid webhook URL: ${webhookUrl} - ${validation.error}`
    );
    res.status(400).json({
      error: 'Invalid webhook URL',
      message: validation.error,
    });
    return;
  }

  // Additional check: webhook URLs should be HTTPS in production
  if (process.env.NODE_ENV === 'production' && validation.parsedUrl?.protocol !== 'https:') {
    res.status(400).json({
      error: 'Invalid webhook URL',
      message: 'Webhook URLs must use HTTPS in production',
    });
    return;
  }

  req.validatedWebhookUrl = validation.parsedUrl;
  next();
};

/**
 * Whitelist-based URL validator (most secure approach)
 * Only allows URLs from specific domains
 */
const validateUrlWhitelist = (allowedDomains: string[] = []) => {
  return (req: ValidatedRequest, res: Response, next: NextFunction): void => {
    const urlToValidate = req.body.url || req.query.url;

    if (!urlToValidate) {
      res.status(400).json({
        error: 'URL is required',
      });
      return;
    }

    const validation = validateUrl(urlToValidate);

    if (!validation.isValid) {
      res.status(400).json({
        error: 'Invalid URL',
        message: validation.error,
      });
      return;
    }

    // Check against whitelist
    const isAllowed = allowedDomains.some(
      (domain) =>
        validation.parsedUrl?.hostname === domain ||
        validation.parsedUrl?.hostname?.endsWith(`.${domain}`)
    );

    if (!isAllowed) {
      console.warn(`[WHITELIST] Blocked URL from non-whitelisted domain: ${urlToValidate}`);
      res.status(403).json({
        error: 'Forbidden',
        message: 'URL domain is not in the allowed list',
      });
      return;
    }

    req.validatedUrl = validation.parsedUrl;
    next();
  };
};

export {
  validateUrl,
  validateUrlInBody,
  validateUrlInQuery,
  validateWebhookUrl,
  validateUrlWhitelist,
};
