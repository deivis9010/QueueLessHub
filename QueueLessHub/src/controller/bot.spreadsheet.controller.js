// Controlador alternativo para flujo con Google Spreadsheet

const { handleChatFlowSpreadsheet } = require('../services/chatflow.spreadsheet.service');
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
    const body = req.body;
    if (body.object === 'whatsapp_business_account' && body.entry && body.entry[0] && body.entry[0].changes && body.entry[0].changes[0] && body.entry[0].changes[0].value.messages) {
      const message = body.entry[0].changes[0].value.messages[0];
      const from = message.from;
      const type = message.type;
      let text = '';
      let interactive = null;
      if (type === 'text') {
        text = message.text.body;
      } else if (type === 'interactive') {
        interactive = message.interactive;
        text = interactive.button_reply?.id || interactive.list_reply?.id || '';
      } else {
        console.log(`Tipo de mensaje no soportado: ${type}`);
        return res.sendStatus(200);
      }
      console.log(`Mensaje recibido de ${from}: ${text} (Tipo: ${type})`);
      // Llama a la función de flujo alternativo
      const { responsePayload } = await handleChatFlowSpreadsheet({ from, text });
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
      return res.status(200).send('Evento de webhook no procesado (no es un mensaje).');
    }
  } catch (error) {
    console.error('Error al procesar webhook:', error.response ? error.response.data : error.message);
    res.status(500).send('Error interno del servidor.');
  }
};
