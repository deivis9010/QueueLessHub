import axios from 'axios';

import type { WhatsAppPayload } from '../types/whatsapp.types';

const GRAPH_API_VERSION = 'v26.0';

/** Keeps Meta's error code and message, which axios' generic "status code" message drops. */
const describeGraphError = (error: unknown): string => {
  if (!axios.isAxiosError(error) || !error.response) {
    return error instanceof Error ? error.message : String(error);
  }

  const metaError = (error.response.data as { error?: { message?: string; code?: number } } | undefined)?.error;
  const detail = metaError?.message ? `${metaError.code ?? ''} ${metaError.message}`.trim() : JSON.stringify(error.response.data);
  return `WhatsApp API ${error.response.status}: ${detail}`;
};

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
  ).catch((error: unknown) => {
    throw new Error(describeGraphError(error));
  });
};

export default { sendWhatsAppMessage };
