const ConversationService = require('./conversation.service');
const AppointmentService = require('./appointment.service');
const ClientService = require('./client.service');
const DoctorService = require('./doctor.service');



const createTextMessage = (to, text) => {
  return {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: to,
    type: "text",
    text: {
      body: text
    }
  };
};

const createReplyButtonsMessage = (to, bodyText, buttons) => {
  return {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: to,
    type: "interactive",
    interactive: {
      type: "button",
      body: {
        text: bodyText
      },
      action: {
        buttons: buttons.map(btn => ({
          type: "reply",
          reply: {
            id: btn.id,
            title: btn.title
          }
        }))
      }
    }
  };
};

const createListMessage = (to, bodyText, buttonText, rows) => {
  return {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: to,
    type: "interactive",
    interactive: {
      type: "list",
      body: {
        text: bodyText
      },
      action: {
        button: buttonText,
        sections: [{
          title: "Options",
          rows: rows
        }]
      }
    }
  };
};

// Estado conversacional simple en memoria (por usuario)
const userStates = {};


// Integración real con Google Sheets
const { google } = require('googleapis');
const path = require('path');

// Configura la ruta a tu archivo de credenciales
const CREDENTIALS_PATH = path.join(__dirname, '../../google-credentials.json');
const SPREADSHEET_ID = process.env.SPREADSHEET_ID || 'TU_SPREADSHEET_ID'; // Reemplaza por el ID real
const SHEET_NAME = process.env.SHEET_NAME || 'Sheet1'; // Reemplaza por el nombre de tu hoja

async function sendToSpreadsheet(data) {
  try {
    let auth;
    
    // En producción (Vercel), usar credenciales desde variable de entorno
    if (process.env.GOOGLE_CREDENTIALS_JSON) {
      const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
      auth = new google.auth.GoogleAuth({
        credentials: credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });
    } else {
      // En desarrollo local, usar archivo de credenciales
      auth = new google.auth.GoogleAuth({
        keyFile: CREDENTIALS_PATH,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });
    }
    const sheets = google.sheets({ version: 'v4', auth: await auth.getClient() });

    const values = [
      [
        data.phone || '',
        data.name || '',
        data.insurance || '',
        data.insuranceNumber || '',
        data.preferredDateTime || '',
        new Date().toISOString()
      ]
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A1`,
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values }
    });
    console.log('Datos enviados a Google Spreadsheet:', values);
  } catch (err) {
    console.error('Error enviando datos a Google Sheets:', err.message);
  }
}

const handleChatFlowSpreadsheet = async ({ from, text }) => {
  if (!from || !text) throw new Error('Missing data');

  // Control de tiempo de inactividad
  const now = Date.now();
  if (userStates[from] && userStates[from].lastUpdate) {
    const diffMs = now - userStates[from].lastUpdate;
    if (diffMs > 10 * 60 * 1000) {
      // Reiniciar estado si han pasado más de 10 minutos
      delete userStates[from];
    }
  }

  // Inicializar estado si no existe
  if (!userStates[from]) {
    userStates[from] = {
      step: 'start',
      data: {},
      lastUpdate: now
    };
  }
  const state = userStates[from];
  let responsePayload;

  switch (state.step) {
    case 'start':
      responsePayload = createTextMessage(from, 'Hi 👋! To request an appointment, please enter your full name.');
      state.step = 'awaiting_name';
      break;
    case 'awaiting_name':
      const nameRegex = /^[a-zA-ZáéíóúÁÉÍÓÚüÜñÑ\s]{3,}$/;
      if (!nameRegex.test(text.trim())) {
        responsePayload = createTextMessage(from, 'Please enter your full name (only letters, at least 3 characters, no numbers or special characters).');
      } else {
        state.data.name = text.trim();
        responsePayload = createTextMessage(from, 'Which insurance company do you have?');
        state.step = 'awaiting_insurance';
      }
      break;
    case 'awaiting_insurance':
      const insuranceNameRegex = /^[a-zA-ZáéíóúÁÉÍÓÚüÜñÑ\s]{2,}$/;
      if (!insuranceNameRegex.test(text.trim())) {
        responsePayload = createTextMessage(from, 'Please enter the name of your insurance company (only letters, at least 2 characters, no numbers or special characters).');
      } else {
        state.data.insurance = text.trim();
        responsePayload = createTextMessage(from, 'Please enter your insurance number.');
        state.step = 'awaiting_insurance_number';
      }
      break;
    case 'awaiting_insurance_number':
      const insuranceNumberRegex = /^[a-zA-Z0-9\-]{4,}$/;
      if (!insuranceNumberRegex.test(text.trim())) {
        responsePayload = createTextMessage(from, 'Please enter your insurance number (only letters, numbers, or hyphens, at least 4 characters).');
      } else {
        state.data.insuranceNumber = text.trim();
        responsePayload = createTextMessage(from, 'What date and time do you prefer for your appointment? (e.g., 20-07-2025 15:30)');
        state.step = 'awaiting_preferred_datetime';
      }
      break;
    case 'awaiting_preferred_datetime':
      // Formato DD-MM-YYYY HH:MM
      const dateTimeRegex = /^(\d{2}-\d{2}-\d{4})[ T](\d{2}:\d{2})$/;
      const match = text.trim().match(dateTimeRegex);
      if (!match) {
        responsePayload = createTextMessage(from, 'Please enter the date and time in the format DD-MM-YYYY HH:MM (e.g., 20-07-2025 15:30).');
      } else {
        // Validar que la fecha sea en el futuro y no más de 3 meses
        const [dateStr, timeStr] = match.slice(1);
        const [day, month, year] = dateStr.split('-').map(Number);
        const [hour, minute] = timeStr.split(':').map(Number);
        const inputDate = new Date(year, month - 1, day, hour, minute);
        const nowDate = new Date();
        const maxDate = new Date(nowDate.getTime());
        maxDate.setMonth(maxDate.getMonth() + 3);
        if (inputDate <= nowDate) {
          responsePayload = createTextMessage(from, 'The date and time must be in the future. Please try again.');
        } else if (inputDate > maxDate) {
          responsePayload = createTextMessage(from, 'The date cannot be more than 3 months from today. Please enter a valid date.');
        } else {
          state.data.preferredDateTime = text.trim();
          state.data.phone = from;
          // Formatear lastUpdate como DD-MM-YYYY HH:MM
          const pad = n => n < 10 ? '0' + n : n;
          const d = new Date(nowDate.getTime());
          const formattedLastUpdate = `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
          state.data.lastUpdate = formattedLastUpdate;
          responsePayload = createTextMessage(from, 'Thank you! Your information has been received. Our staff will contact you soon to confirm your appointment.');
          state.step = 'finished';
          // Enviar los datos a la spreadsheet
          await sendToSpreadsheet({ ...state.data });
        }
      }
      break;
    case 'finished':
      responsePayload = createTextMessage(from, 'Your request is being processed. Please wait for our staff to contact you.');
      break;
    default:
      responsePayload = createTextMessage(from, 'Hi 👋! To request an appointment, please enter your full name.');
      state.step = 'awaiting_name';
      break;
  }

  // Actualizar timestamp de último mensaje
  state.lastUpdate = now;

  // Si terminó, retorna los datos recolectados (para enviar a Google Sheets)
  if (state.step === 'finished') {
    return { responsePayload, collectedData: { ...state.data } };
  }
  return { responsePayload };
};
module.exports = { handleChatFlowSpreadsheet };
