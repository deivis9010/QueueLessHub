import express from 'express';
import type { Request, Response, NextFunction } from 'express';

import AuthController from '../controller/auth.controller';
import { validatePasswordMiddleware } from '../middlewares/passwordValidator';
import { validateCsrfToken } from '../middlewares/csrfProtection';

const router = express.Router();

// CSRF validation middleware - skip in test mode for compatibility
const csrfValidationMiddleware =
  process.env.NODE_ENV === 'test'
    ? (req: Request, res: Response, next: NextFunction) => next()
    : validateCsrfToken;

/**
 * @openapi
 * tags:
 *   - name: Auth
 *     description: Authentication endpoints
 */

/**
 * @openapi
 * /api/auth/register:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Register a new user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *               role:
 *                 type: string
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: User created
 */
/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Login and receive a JWT token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Successful login
 */
router.post('/register', validatePasswordMiddleware, AuthController.register);
router.post('/login', AuthController.login);

/**
 * @openapi
 * /api/auth/csrf-token:
 *   get:
 *     tags:
 *       - Auth
 *     summary: Get CSRF token for current session
 *     description: |
 *       Retrieves the CSRF token that has been set in the X-CSRF-Token cookie.
 *       Include the token value in the X-CSRF-Token header for all state-changing operations (POST, PUT, DELETE).
 *     responses:
 *       200:
 *         description: CSRF token retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 csrfToken:
 *                   type: string
 *                   description: The CSRF token to include in X-CSRF-Token header
 *                 message:
 *                   type: string
 */
router.get('/csrf-token', AuthController.getCsrfToken);

/**
 * @openapi
 * /api/auth/refresh:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Refresh access token using refresh token
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: Optional, can be provided in cookie instead
 *     responses:
 *       200:
 *         description: New access token issued
 *       401:
 *         description: Invalid or expired refresh token
 */
router.post('/refresh', AuthController.refresh);

/**
 * @openapi
 * /api/auth/logout:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Logout and revoke refresh token
 *     responses:
 *       200:
 *         description: Logout successful
 */
router.post('/logout', csrfValidationMiddleware, AuthController.logout);

export default router;
