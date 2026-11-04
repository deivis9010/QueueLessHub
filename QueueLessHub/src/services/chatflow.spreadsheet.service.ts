import path from 'path';

import { google } from 'googleapis';
import type {
  WhatsAppButton,
  WhatsAppRow,
  WhatsAppTextMessage,
  WhatsAppInteractiveMessage,
} from '../types/whatsapp.types';

const CREDENTIALS_PATH = path.join(__dirname, '../../google-credentials.json');
const SPREADSHEET_ID = process.env.SPREADSHEET_ID || 'TU_SPREADSHEET_ID';
const SHEET_NAME = process.env.SHEET_NAME || 'Sheet1';

type SpreadsheetUserState = {
  step: string;
  data: Record<string, string>;
  lastUpdate: number;
};

type SpreadsheetInput = {
  from: string;
  text: string;
};

type SpreadsheetResult = {
  responsePayload: WhatsAppTextMessage;
  collectedData?: Record<string, string>;
};

// A Map keeps phone numbers as plain keys, so they can never touch Object.prototype.
const userStates = new Map<string, SpreadsheetUserState>();

const createTextMessage = (to: string, text: string): WhatsAppTextMessage => ({
  messaging_product: 'whatsapp',
  recipient_type: 'individual',
  to,
  type: 'text',
  text: {
    body: text,
  },
});

const createReplyButtonsMessage = (
  to: string,
  bodyText: string,
  buttons: WhatsAppButton[]
): WhatsAppInteractiveMessage => ({
  messaging_product: 'whatsapp',
  recipient_type: 'individual',
  to,
  type: 'interactive',
  interactive: {
    type: 'button',
    body: { text: bodyText },
    action: {
      buttons: buttons.map((button) => ({
        type: 'reply',
        reply: { id: button.id, title: button.title },
      })),
    },
  },
});

const createListMessage = (
  to: string,
  bodyText: string,
  buttonText: string,
  rows: WhatsAppRow[]
): WhatsAppInteractiveMessage => ({
  messaging_product: 'whatsapp',
  recipient_type: 'individual',
  to,
  type: 'interactive',
  interactive: {
    type: 'list',
    body: { text: bodyText },
    action: {
      button: buttonText,
      sections: [
        {
          title: 'Options',
          rows,
        },
      ],
    },
  },
});

async function sendToSpreadsheet(data: Record<string, string>): Promise<void> {
  try {
    let auth;

    if (process.env.GOOGLE_CREDENTIALS_JSON) {
      const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
      auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });
    } else {
      auth = new google.auth.GoogleAuth({
        keyFile: CREDENTIALS_PATH,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });
    }

    const sheets = google.sheets({ version: 'v4', auth });

    const values = [
      [
        data.phone || '',
        data.name || '',
        data.insurance || '',
        data.insuranceNumber || '',
        data.preferredDateTime || '',
        new Date().toISOString(),
      ],
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A1`,
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values },
    });

    console.log('Datos enviados a Google Spreadsheet:', values);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown spreadsheet error';
    console.error('Error enviando datos a Google Sheets:', message);
  }
}

const handleChatFlowSpreadsheet = async ({
  from,
  text,
}: SpreadsheetInput): Promise<SpreadsheetResult> => {
  if (!from || !text) {
    throw new Error('Missing data');
  }

  const now = Date.now();
  const existing = userStates.get(from);
  if (existing && existing.lastUpdate) {
    const diffMs = now - existing.lastUpdate;
    if (diffMs > 10 * 60 * 1000) {
      userStates.delete(from);
    }
  }

  let state = userStates.get(from);
  if (!state) {
    state = {
      step: 'start',
      data: {},
      lastUpdate: now,
    };
    userStates.set(from, state);
  }

  if (state.step !== 'start' && state.step !== 'finished' && text.trim().toLowerCase() === 'cancelar') {
    userStates.delete(from);
    return { responsePayload: createTextMessage(from, 'Request cancelled. Send any message to start again.') };
  }

  let responsePayload: WhatsAppTextMessage;

  switch (state.step) {
    case 'start':
      responsePayload = createTextMessage(
        from,
        'Hi 👋! To request an appointment, please enter your full name.'
      );
      state.step = 'awaiting_name';
      break;
    case 'awaiting_name': {
      const nameRegex = /^[a-zA-ZáéíóúÁÉÍÓÚüÜñÑ\s]{3,}$/;
      if (!nameRegex.test(text.trim())) {
        responsePayload = createTextMessage(
          from,
          'Please enter your full name (only letters, at least 3 characters, no numbers or special characters).'
        );
      } else {
        state.data.name = text.trim();
        responsePayload = createTextMessage(from, 'Which insurance company do you have?');
        state.step = 'awaiting_insurance';
      }
      break;
    }
    case 'awaiting_insurance': {
      const insuranceNameRegex = /^[a-zA-ZáéíóúÁÉÍÓÚüÜñÑ\s]{2,}$/;
      if (!insuranceNameRegex.test(text.trim())) {
        responsePayload = createTextMessage(
          from,
          'Please enter the name of your insurance company (only letters, at least 2 characters, no numbers or special characters).'
        );
      } else {
        state.data.insurance = text.trim();
        responsePayload = createTextMessage(from, 'Please enter your insurance number.');
        state.step = 'awaiting_insurance_number';
      }
      break;
    }
    case 'awaiting_insurance_number': {
      const insuranceNumberRegex = /^[a-zA-Z0-9-]{4,}$/;
      if (!insuranceNumberRegex.test(text.trim())) {
        responsePayload = createTextMessage(
          from,
          'Please enter your insurance number (only letters, numbers, or hyphens, at least 4 characters).'
        );
      } else {
        state.data.insuranceNumber = text.trim();
        responsePayload = createTextMessage(
          from,
          'What date and time do you prefer for your appointment? (e.g., 20-07-2025 15:30)'
        );
        state.step = 'awaiting_preferred_datetime';
      }
      break;
    }
    case 'awaiting_preferred_datetime': {
      const dateTimeRegex = /^(\d{2}-\d{2}-\d{4})[ T](\d{2}:\d{2})$/;
      const match = text.trim().match(dateTimeRegex);
      if (!match) {
        responsePayload = createTextMessage(
          from,
          'Please enter the date and time in the format DD-MM-YYYY HH:MM (e.g., 20-07-2025 15:30).'
        );
      } else {
        const [dateStr, timeStr] = match.slice(1);
        const [day, month, year] = dateStr.split('-').map(Number);
        const [hour, minute] = timeStr.split(':').map(Number);
        const inputDate = new Date(year, month - 1, day, hour, minute);
        const nowDate = new Date();
        const maxDate = new Date(nowDate.getTime());
        maxDate.setMonth(maxDate.getMonth() + 3);

        if (inputDate <= nowDate) {
          responsePayload = createTextMessage(
            from,
            'The date and time must be in the future. Please try again.'
          );
        } else if (inputDate > maxDate) {
          responsePayload = createTextMessage(
            from,
            'The date cannot be more than 3 months from today. Please enter a valid date.'
          );
        } else {
          state.data.preferredDateTime = text.trim();
          state.data.phone = from;
          const pad = (value: number) => (value < 10 ? `0${value}` : String(value));
          const d = new Date(nowDate.getTime());
          state.data.lastUpdate = `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
          responsePayload = createTextMessage(
            from,
            'Thank you! Your information has been received. Our staff will contact you soon to confirm your appointment.'
          );
          state.step = 'finished';
          await sendToSpreadsheet({ ...state.data });
        }
      }
      break;
    }
    case 'finished':
      responsePayload = createTextMessage(
        from,
        'Your request is being processed. Please wait for our staff to contact you.'
      );
      break;
    default:
      responsePayload = createTextMessage(
        from,
        'Hi 👋! To request an appointment, please enter your full name.'
      );
      state.step = 'awaiting_name';
      break;
  }

  state.lastUpdate = now;

  if (state.step === 'finished') {
    return { responsePayload, collectedData: { ...state.data } };
  }

  return { responsePayload };
};

export {
  handleChatFlowSpreadsheet,
  createTextMessage,
  createReplyButtonsMessage,
  createListMessage,
  userStates,
};
