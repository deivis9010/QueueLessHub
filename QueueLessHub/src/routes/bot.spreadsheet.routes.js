const express = require('express');
const router = express.Router();
const botSpreadsheetController = require('../controller/bot.spreadsheet.controller');

/**
 * @openapi
 * tags:
 *   - name: BotSpreadsheet
 *     description: Webhook endpoints for spreadsheet-based bot flow
 */

/**
 * @openapi
 * /api/bot/spreadsheet/webhook:
 *   get:
 *     tags:
 *       - BotSpreadsheet
 *     summary: Verify spreadsheet webhook
 *     responses:
 *       200:
 *         description: Verification challenge returned
 *       403:
 *         description: Verification failed
 *   post:
 *     tags:
 *       - BotSpreadsheet
 *     summary: Receive webhook events for spreadsheet flow
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
// Webhook alternativo para flujo con Google Spreadsheet
router.post('/webhook', botSpreadsheetController.postWebhook);
router.get('/webhook', botSpreadsheetController.getWebhook);

module.exports = router;
