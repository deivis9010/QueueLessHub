const express = require('express');
const router = express.Router();
const botController = require('../controller/bot.controller');

// Simulación de Webhook tipo WhatsApp
router.post('/webhook', botController.postWebhook);
router.get('/webhook', botController.getWebhook);

module.exports = router;
