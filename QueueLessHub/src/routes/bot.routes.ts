import express from 'express';

import botController from '../controller/bot.controller';

const router = express.Router();

/**
 * @openapi
 * tags:
 *   - name: Bot
 *     description: Webhook endpoints for WhatsApp simulation
 */

/**
 * @openapi
 * /api/bot/webhook:
 *   get:
 *     tags:
 *       - Bot
 *     summary: Verify webhook (GET verification)
 *     responses:
 *       200:
 *         description: Verification challenge returned
 *       403:
 *         description: Verification failed
 *   post:
 *     tags:
 *       - Bot
 *     summary: Receive webhook events (POST)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Webhook processed
 */
router.post('/webhook', botController.postWebhook);
router.get('/webhook', botController.getWebhook);

export default router;
