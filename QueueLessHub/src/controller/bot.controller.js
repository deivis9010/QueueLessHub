// Controlador del bot para manejar la lógica de conversación y webhook
const User = require('../models/user.model');
const Appointment = require('../models/appointment.model');
const Conversation = require('../models/conversation.model');
const { handleChatFlow } = require('../services/chatflow.service');



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
  try {
    const body = req.body; // El cuerpo del webhook de WhatsApp

    // Asume que solo procesas el primer entry y el primer change
    if (body.object === 'whatsapp_business_account' && body.entry && body.entry[0] && body.entry[0].changes && body.entry[0].changes[0] && body.entry[0].changes[0].value.messages) {
      const message = body.entry[0].changes[0].value.messages[0];
      const from = message.from; // Número de teléfono del remitente
      const type = message.type; // Tipo de mensaje (text, interactive, etc.)

      let text = '';
      let interactive = null;

      // Extraer el contenido del mensaje según el tipo
      if (type === 'text') {
        text = message.text.body;
      } else if (type === 'interactive') {
        interactive = message.interactive;
        // Para mensajes interactivos, el 'text' de la payload entrante a veces es irrelevante o vacío,
        // el dato importante es el id del botón/fila que estará en message.interactive.
        // Puedes pasar un texto dummy o dejarlo vacío, ya que handleChatFlow usará el 'interactive.id'.
        text = interactive.button_reply?.id || interactive.list_reply?.id || '';
      } else {
        // Manejar otros tipos de mensajes si es necesario (audio, imagen, etc.)
        console.log(`Tipo de mensaje no soportado: ${type}`);
        return res.sendStatus(200); // Responder 200 OK para evitar reintentos
      }

      // Llama a tu función de flujo de chat
      const responsePayload = await handleChatFlow({ from, text, type, interactive });

      // Envía la respuesta a la API de WhatsApp
      await axios.post(
        `https://graph.facebook.com/v19.0/${process.env.PHONE_NUMBER_ID}/messages`,
        responsePayload,
        {
          headers: {
            'Authorization': `Bearer ${process.env.WHATSAPP_TOKEN}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return res.status(200).send('Mensaje procesado y respuesta enviada.');

    } else {
      // Si el webhook no es un mensaje (ej: cambio de estado, lectura)
      console.log('Webhook recibido no es un mensaje:', body);
      return res.status(200).send('Evento de webhook no procesado (no es un mensaje).');
    }

  } catch (error) {
    console.error('Error al procesar webhook:', error.response ? error.response.data : error.message);
    res.status(500).send('Error interno del servidor.');
  }
};








