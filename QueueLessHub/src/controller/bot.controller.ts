import axios from 'axios';
import type { NextFunction, Request, Response } from 'express';

import { handleChatFlow } from '../services/chatflow.service';

const getWebhook = (req: Request, res: Response): void => {
  const verifyToken = process.env.WHATSAPP_TOKEN;
  
  // Support both hub.mode and hub_mode (in case of sanitization)
  const mode = req.query['hub.mode'] || req.query['hub_mode'];
  
  // Support both hub.verify_token and hub_verify_token (in case of sanitization)
  const token = req.query['hub.verify_token'] || req.query['hub_verify_token'];
  
  // Support both hub.challenge and hub_challenge (in case of sanitization)
  const challenge = req.query['hub.challenge'] || req.query['hub_challenge'];

  console.log('🔗 Verificando Webhook subscribe', mode, 'token:', token?.toString().slice(0, 20) + '...', 'challenge:', challenge);
  console.log('Verify token configurado:', verifyToken?.toString().slice(0, 20) + '...');

  if (mode && token && mode === 'subscribe' && token === verifyToken) {
    console.log('🟢 Webhook verificado correctamente');
    res.status(200).send(String(challenge));
    return;
  }

  console.log('🔴 Webhook no verificado - token no coincide');
  res.sendStatus(403);
};

const postWebhook = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const body = req.body;

    if (
      body.object === 'whatsapp_business_account' &&
      body.entry &&
      body.entry[0] &&
      body.entry[0].changes &&
      body.entry[0].changes[0] &&
      body.entry[0].changes[0].value.messages
    ) {
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
        res.sendStatus(200);
        return;
      }

      console.log(`Mensaje recibido de ${from}: ${text} (Tipo: ${type})`);
      const responsePayload = await handleChatFlow({ from, text, type, interactive });

      await axios.post(
        `https://graph.facebook.com/v19.0/${process.env.PHONE_NUMBER_ID}/messages`,
        responsePayload,
        {
          headers: {
            Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
            'Content-Type': 'application/json',
          },
        }
      );

      res.status(200).send('Mensaje procesado y respuesta enviada.');
      return;
    }

    res.status(200).send('Evento de webhook no procesado (no es un mensaje).');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(
      'Error al procesar webhook:',
      (error as { response?: { data?: unknown } })?.response
        ? (error as { response?: { data?: unknown } }).response?.data
        : message
    );
    next(error);
  }
};

export default {
  getWebhook,
  postWebhook,
};
