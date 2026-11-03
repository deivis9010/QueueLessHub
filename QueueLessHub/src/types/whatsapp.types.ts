/**
 * WhatsApp message types shared across chatflow services
 */

export interface WhatsAppButton {
  id: string;
  title: string;
}

export interface WhatsAppRow {
  id: string;
  title: string;
  description: string;
}

export interface InteractivePayload {
  type: 'button_reply' | 'list_reply' | string;
  button_reply?: {
    id: string;
    title: string;
  };
  list_reply?: {
    id: string;
    title: string;
  };
}

/**
 * Normalized inbound input for the MongoDB chat flow.
 * `value` is the button/list id for interactive taps, or the trimmed text otherwise.
 */
export interface ChatFlowInput {
  messageId?: string;
  from: string;
  value: string;
}

/**
 * Inbound message as sent by the WhatsApp Cloud API webhook.
 */
export interface WhatsAppInboundMessage {
  id: string;
  from: string;
  type: string;
  text?: { body?: string };
  interactive?: InteractivePayload;
  button?: { payload?: string; text?: string };
}

export interface WhatsAppWebhookBody {
  object?: string;
  entry?: Array<{
    changes?: Array<{
      field?: string;
      value?: { messages?: WhatsAppInboundMessage[] };
    }>;
  }>;
}

export interface WhatsAppTextMessage {
  messaging_product: 'whatsapp';
  recipient_type: 'individual';
  to: string;
  type: 'text';
  text: { body: string };
}

export interface WhatsAppInteractiveMessage {
  messaging_product: 'whatsapp';
  recipient_type: 'individual';
  to: string;
  type: 'interactive';
  interactive: {
    type: 'button' | 'list';
    body: { text: string };
    action: {
      buttons?: Array<{ type: 'reply'; reply: WhatsAppButton }>;
      button?: string;
      sections?: Array<{ title: string; rows: WhatsAppRow[] }>;
    };
  };
}

export interface WhatsAppTemplateMessage {
  messaging_product: 'whatsapp';
  recipient_type: 'individual';
  to: string;
  type: 'template';
  template: {
    name: string;
    language: { code: string };
    components: Array<{
      type: 'body';
      parameters: Array<{ type: 'text'; text: string }>;
    }>;
  };
}

export type WhatsAppPayload = WhatsAppTextMessage | WhatsAppInteractiveMessage | WhatsAppTemplateMessage;

/**
 * Reply produced by the chat flow for one inbound message.
 * `conversationId` lets the outbox close the right conversation if delivery is never successful.
 */
export interface ChatFlowReply {
  conversationId: string;
  payload: WhatsAppPayload;
}
