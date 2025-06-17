// Controlador del bot para manejar la lógica de conversación y webhook
const User = require('../models/user.model');
const Appointment = require('../models/appointment.model');
const Conversation = require('../models/conversation.model');




const axios = require('axios');

exports.getWebhook = (req, res) => {
  const verify_token = process.env.WHATSAPP_TOKEN;

  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  console.log('🔗 Verificando Webhook',mode,token,challenge);

  if (mode && token && mode === 'subscribe' && token === verify_token) {
    console.log('🟢 Webhook verificado');
    res.status(200).send(challenge);
  } else {
    console.log('🔴 Webhook no verificado');
    res.sendStatus(403);
  }
};


exports.postWebhook = async (req, res) => {
  const body = req.body;

  const message = body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
  const from = message?.from;
  const msgBody = message?.text?.body;
  console.log('📬 Mensaje recibido:', body);
  console.log('📬 telefono:', from);
  if (from && msgBody) {
    console.log(`📨 Mensaje de ${from}: ${msgBody}`);

    try {
    await axios.post(
        `https://graph.facebook.com/v23.0/${process.env.PHONE_NUMBER_ID}/messages`, // O v2.20 si eso es lo correcto
        {
            messaging_product: 'whatsapp',
            to: from,
            type: 'text',
            text: { body: `Hola 👋, recibimos tu mensaje: "${msgBody}"` },
        },
        {
            headers: {
                Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
                'Content-Type': 'application/json',
            },
        }
    );
    console.log('✅ Mensaje de respuesta enviado exitosamente.');
} catch (error) {
    console.error('❌ Error al enviar mensaje de WhatsApp:', error.message); // Muestra el mensaje general de Axios
    // ¡ESTA LÍNEA ES FUNDAMENTAL AHORA MISMO!
    if (error.response && error.response.data) {
        console.error('❌ Detalles del error de la API de Meta:', JSON.stringify(error.response.data, null, 2));
    } else {
        console.error('❌ No se recibieron detalles de error específicos de la API de Meta.');
    }
}
  }

  res.sendStatus(200);
};




exports.handleWebhook = async (req, res) => {
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




