import axios from 'axios';
import type { NextFunction, Request, Response } from 'express';

import { handleChatFlowSpreadsheet } from '../services/chatflow.spreadsheet.service';

const getWebhook = (req: Request, res: Response): void => {
  const verifyToken = process.env.WHATSAPP_TOKEN;
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  const safeChallenge =
    typeof challenge === 'string' && /^[A-Za-z0-9_-]+$/.test(challenge) ? challenge : null;

  console.log('Verificando Webhook, mode:', mode);

  if (mode && token && mode === 'subscribe' && token === verifyToken && safeChallenge !== null) {
    console.log('🟢 Webhook verificado');
    res.status(200).type('text/plain').send(safeChallenge);
    return;
  }

  console.log('🔴 Webhook no verificado');
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
      const { responsePayload } = await handleChatFlowSpreadsheet({ from, text });

      await axios.post(
        `https://graph.facebook.com/v26.0/${process.env.PHONE_NUMBER_ID}/messages`,
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
