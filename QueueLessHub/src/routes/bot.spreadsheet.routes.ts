import express from 'express';

import botSpreadsheetController from '../controller/bot.spreadsheet.controller';

const router = express.Router();

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
router.post('/webhook', botSpreadsheetController.postWebhook);
router.get('/webhook', botSpreadsheetController.getWebhook);

export default router;
