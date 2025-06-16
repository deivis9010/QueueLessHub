// Controlador del bot para manejar la lógica de conversación y webhook
const User = require('../models/User');
const Appointment = require('../models/Appointment');
const Conversation = require('../models/Conversation');

const handleWebhook = async (req, res) => {
  const { from, text } = req.body;
  if (!from || !text) return res.status(400).json({ error: 'Faltan datos' });

  let user = await User.findOne({ phone: from });
  if (!user) user = await User.create({ phone: from, name: from });

  // Lógica de conversación mock
  let response = '';
  if (user.step === 0) {
    response = 'Hola, ¿quieres agendar una cita?';
    user.step = 1;
  } else if (user.step === 1 && text.toLowerCase().includes('sí')) {
    response = '¿Qué día quieres tu cita?';
    user.step = 2;
  } else if (user.step === 2) {
    await Appointment.create({ user: user._id, date: new Date(), confirmed: true });
    response = '¡Cita registrada!';
    user.step = 0;
  } else {
    response = 'No entendí, ¿quieres agendar una cita?';
    user.step = 1;
  }
  await user.save();
  await Conversation.findOneAndUpdate(
    { user: user._id },
    { state: `step${user.step}`, lastMessage: text, updatedAt: new Date() },
    { upsert: true }
  );
  res.json({ reply: response });
};

module.exports = { handleWebhook };
