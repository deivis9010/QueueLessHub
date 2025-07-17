const express = require('express');
const router = express.Router();
const botSpreadsheetController = require('../controller/bot.spreadsheet.controller');

// Webhook alternativo para flujo con Google Spreadsheet
router.post('/webhook', botSpreadsheetController.postWebhook);
router.get('/webhook', botSpreadsheetController.getWebhook);

module.exports = router;
