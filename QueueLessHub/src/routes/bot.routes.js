const express = require('express');
const router = express.Router();
const botController = require('../controller/bot.controller');

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
// Simulación de Webhook tipo WhatsApp
router.post('/webhook', botController.postWebhook);
router.get('/webhook', botController.getWebhook);

module.exports = router;
