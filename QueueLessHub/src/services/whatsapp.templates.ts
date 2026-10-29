/**
 * Meta-approved message templates.
 *
 * Templates are required for business-initiated messages (outside the 24h customer service window).
 * The `body` text is the source of truth for submitting each template to Meta. Keep it in sync with
 * what is approved in WhatsApp Manager. Sending is not wired yet; these definitions are inert until used.
 */

import type { WhatsAppTemplateMessage } from '../types/whatsapp.types';

export const TEMPLATE_LANGUAGE_CODE = 'en_US';

export interface WhatsAppTemplateDefinition {
  name: string;
  category: 'UTILITY';
  body: string;
  /** Labels for each {{n}} placeholder, in order. */
  parameters: string[];
}

export type WhatsAppTemplateKey = 'appointmentReminder' | 'appointmentCancelled';

export const WHATSAPP_TEMPLATES: Record<WhatsAppTemplateKey, WhatsAppTemplateDefinition> = {
  appointmentReminder: {
    name: 'appointment_reminder',
    category: 'UTILITY',
    body: 'Hi {{1}}, this is a reminder of your appointment with {{2}} on {{3}}. If you need help, reply to this message.',
    parameters: ['patient_name', 'doctor_name', 'appointment_date'],
  },
  appointmentCancelled: {
    name: 'appointment_cancelled',
    category: 'UTILITY',
    body: 'Hi {{1}}, your appointment with {{2}} on {{3}} has been cancelled. To book a new one, reply to this message.',
    parameters: ['patient_name', 'doctor_name', 'appointment_date'],
  },
};

// Meta rejects parameters with line breaks, tabs, or more than four consecutive spaces.
const INVALID_PARAMETER_PATTERN = /[\r\n\t]| {5,}/;

export const buildTemplateMessage = (
  to: string,
  template: WhatsAppTemplateDefinition,
  values: string[]
): WhatsAppTemplateMessage => {
  if (values.length !== template.parameters.length) {
    throw new Error(
      `Template ${template.name} expects ${template.parameters.length} parameters, received ${values.length}`
    );
  }

  values.forEach((value, index) => {
    const label = template.parameters[index];
    if (value.trim().length === 0) {
      throw new Error(`Template ${template.name} parameter ${label} must not be empty`);
    }
    if (INVALID_PARAMETER_PATTERN.test(value)) {
      throw new Error(`Template ${template.name} parameter ${label} contains unsupported whitespace`);
    }
  });

  return {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'template',
    template: {
      name: template.name,
      language: { code: TEMPLATE_LANGUAGE_CODE },
      components: [
        {
          type: 'body',
          parameters: values.map((text) => ({ type: 'text', text })),
        },
      ],
    },
  };
};
