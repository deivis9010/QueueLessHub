import axios from 'axios';

import type { WhatsAppPayload } from '../types/whatsapp.types';

const GRAPH_API_VERSION = 'v19.0';

/**
 * Sends a message through the WhatsApp Cloud API.
 * Throws when credentials are missing or the API call fails.
 */
export const sendWhatsAppMessage = async (payload: WhatsAppPayload): Promise<void> => {
  const phoneNumberId = process.env.PHONE_NUMBER_ID;
  const token = process.env.WHATSAPP_TOKEN;

  if (!phoneNumberId || !token) {
    throw new Error('WhatsApp credentials are not configured (PHONE_NUMBER_ID, WHATSAPP_TOKEN)');
  }

  await axios.post(
    `https://graph.facebook.com/${GRAPH_API_VERSION}/${phoneNumberId}/messages`,
    payload,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  );
};

export default { sendWhatsAppMessage };
