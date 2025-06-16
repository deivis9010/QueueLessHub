const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Appointment = require('../models/Appointment');
const Conversation = require('../models/Conversation');
const { handleWebhook } = require('../controller/botController');

// Simulación de Webhook tipo WhatsApp
router.post('/webhook', handleWebhook);

// Endpoints de testing
router.get('/appointments', async (req, res) => {
  const appointments = await Appointment.find().populate('user');
  res.json(appointments);
});

router.get('/users', async (req, res) => {
  const users = await User.find();
  res.json(users);
});

module.exports = router;
