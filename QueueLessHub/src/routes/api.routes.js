const express = require('express');
const router = express.Router();
const User = require('../models/user.model');
const Appointment = require('../models/appointment.model');
const Conversation = require('../models/conversation.model');

const botController = require('../controller/bot.controller');
// Simulación de Webhook tipo WhatsApp
router.post('/webhook', botController.postWebhook);

router.get('/webhook', botController.getWebhook);




// Endpoints de testing
router.get('/appointments', async (req, res) => {
  const appointments = await Appointment.find().populate('user');
  res.json(appointments);
});

router.get('/users', async (req, res) => {
  console.log('🔗 Endpoint /users accedido');
  const users = await User.find();
  res.json(users);
});

module.exports = router;
