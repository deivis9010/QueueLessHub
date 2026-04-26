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

export interface ChatFlowInput {
  from: string;
  text: string;
  type?: string;
  interactive?: InteractivePayload | null;
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

export type WhatsAppPayload = WhatsAppTextMessage | WhatsAppInteractiveMessage;
