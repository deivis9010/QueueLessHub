import type { Request, Response } from 'express';

import type { ChatFlowInput, WhatsAppInboundMessage, WhatsAppWebhookBody } from '../types/whatsapp.types';

import { handleChatFlow } from '../services/chatflow.service';
import { enqueueFailedDelivery } from '../services/outbox.service';
import { sendWhatsAppMessage } from '../services/whatsapp.client';

const getWebhook = (req: Request, res: Response): void => {
  const verifyToken = process.env.WHATSAPP_TOKEN;

  // Support both hub.mode and hub_mode (in case of sanitization)
  const mode = req.query['hub.mode'] || req.query['hub_mode'];

  // Support both hub.verify_token and hub_verify_token (in case of sanitization)
  const token = req.query['hub.verify_token'] || req.query['hub_verify_token'];

  // Support both hub.challenge and hub_challenge (in case of sanitization)
  const challenge = req.query['hub.challenge'] || req.query['hub_challenge'];

  console.log('Webhook subscribe verification request, mode:', mode);

  if (mode && token && mode === 'subscribe' && token === verifyToken) {
    console.log('Webhook verified');
    res.status(200).send(String(challenge));
    return;
  }

  console.log('Webhook verification failed: token does not match');
  res.sendStatus(403);
};

/**
 * Collects every inbound message across all entries and changes of the webhook payload.
 */
export const extractInboundMessages = (body: WhatsAppWebhookBody): WhatsAppInboundMessage[] => {
  const messages: WhatsAppInboundMessage[] = [];

  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      messages.push(...(change.value?.messages ?? []));
    }
  }

  return messages;
};

/**
 * Maps a supported inbound message to flow input. Returns null for unsupported or empty messages.
 */
export const toChatFlowInput = (message: WhatsAppInboundMessage): ChatFlowInput | null => {
  let value: string | undefined;

  switch (message.type) {
    case 'text':
      value = message.text?.body?.trim();
      break;
    case 'interactive':
      value = message.interactive?.button_reply?.id ?? message.interactive?.list_reply?.id;
      break;
    case 'button':
      // Quick-reply taps from template messages arrive as type 'button'.
      value = message.button?.payload;
      break;
    default:
      value = undefined;
  }

  if (!value) {
    return null;
  }

  return { messageId: message.id, from: message.from, value };
};

const describeError = (error: unknown): string => (error instanceof Error ? error.message : 'Unknown error');

const postWebhook = async (req: Request, res: Response): Promise<void> => {
  const body = (req.body ?? {}) as WhatsAppWebhookBody;

  if (body.object !== 'whatsapp_business_account') {
    res.sendStatus(200);
    return;
  }

  for (const message of extractInboundMessages(body)) {
    try {
      const input = toChatFlowInput(message);

      if (!input) {
        console.log(`Ignored unsupported or empty message of type: ${message.type}`);
        continue;
      }

      const reply = await handleChatFlow(input);

      if (reply) {
        try {
          await sendWhatsAppMessage(reply.payload);
        } catch (sendError) {
          // Keep the reply in the outbox so it is retried instead of lost. Still answer 200 below.
          console.error(`Send failed for message ${message.id}, queued for retry:`, describeError(sendError));
          await enqueueFailedDelivery({
            conversationId: reply.conversationId,
            to: reply.payload.to,
            payload: reply.payload,
            error: describeError(sendError),
          });
        }
      }
    } catch (error) {
      // Log and continue: WhatsApp retries any non-200 response, which would replay the message.
      console.error(`Error processing WhatsApp message ${message.id}:`, describeError(error));
    }
  }

  res.sendStatus(200);
};

export default {
  getWebhook,
  postWebhook,
};
