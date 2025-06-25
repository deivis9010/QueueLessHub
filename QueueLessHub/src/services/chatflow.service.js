const Conversation = require('../models/conversation.model');
const User = require('../models/user.model');
const Appointment = require('../models/appointment.model');

/**
 * Función auxiliar para generar los próximos N días hábiles (lunes a viernes).
 * @param {number} numDays - Número de días hábiles a generar.
 * @returns {Array<Object>} Un array de objetos con id, title, y description para List Messages.
 */
const generateNextNDays = (numDays) => {
  const dates = [];
  let i = 0;
  let daysChecked = 0;
  // Asegurarse de no exceder el límite de 10 filas para los List Messages de WhatsApp
  const limit = Math.min(numDays, 10);
  while (dates.length < limit && daysChecked < 31) { // Máximo 31 días para evitar bucles infinitos
    const date = new Date();
    date.setDate(date.getDate() + i); // Añade 'i' días a la fecha actual
    const dayOfWeek = date.getDay(); // 0: domingo, 1: lunes, ..., 5: viernes, 6: sábado
    if (dayOfWeek >= 1 && dayOfWeek <= 5) { // Solo lunes a viernes
      // Formato 'YYYY-MM-DD' para el ID
      const dateId = date.toISOString().split('T')[0];

      // Formato legible para el título (más corto para cumplir con el límite de 24 caracteres)
      const weekdayShort = date.toLocaleDateString('es-ES', { weekday: 'short' });
      const dayMonth = date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
      // Nuevo title: "Lun, 01/01" o "Mar, 15/12"
      const shortTitle = `${weekdayShort.charAt(0).toUpperCase() + weekdayShort.slice(1)}, ${dayMonth}`;

      // Formato completo para la descripción
      const optionsFull = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
      const fullDateDescription = date.toLocaleDateString('es-ES', optionsFull);

      dates.push({
        id: `date_${dateId}`, // Prefijo 'date_' para identificar fácilmente
        title: shortTitle, // Título corto para cumplir el límite de WhatsApp
        description: `Disponibilidad para el ${fullDateDescription}` // Descripción completa
      });
    }
    i++;
    daysChecked++;
  }
  return dates;
};

/**
 * Crea un payload de mensaje de texto simple para WhatsApp.
 * @param {string} to - Número de teléfono del destinatario (con prefijo de país).
 * @param {string} text - El texto del mensaje.
 * @returns {Object} El objeto de payload para la API de WhatsApp Business.
 */
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

/**
 * Crea un payload de mensaje con Reply Buttons (botones de respuesta rápida).
 * @param {string} to - Número de teléfono del destinatario.
 * @param {string} bodyText - El texto principal del mensaje.
 * @param {Array<Object>} buttons - Array de objetos { id: string, title: string }. Máx. 3 botones.
 * @returns {Object} El objeto de payload para la API de WhatsApp Business.
 */
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

/**
 * Crea un payload de mensaje con List Message (mensaje de lista).
 * @param {string} to - Número de teléfono del destinatario.
 * @param {string} bodyText - El texto principal del mensaje.
 * @param {string} buttonText - Texto del botón que abre la lista.
 * @param {Array<Object>} rows - Array de objetos { id: string, title: string, description: string }.
 * @returns {Object} El objeto de payload para la API de WhatsApp Business.
 */
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
          title: "Opciones", // Puedes personalizar el título de la sección
          rows: rows
        }]
      }
    }
  };
};

const handleChatFlow = async ({ from, text, type, interactive }) => {
  if (!from || !text) throw new Error('Faltan datos');

  // 1. Buscar o crear el usuario
  let user = await User.findOne({ phone: from });
  if (!user) {
    user = await User.create({
      phone: from,
      name: from,
      status: 'active'
    });
  }

  // 2. Buscar o crear la conversación
  let conversation = await Conversation.findOne({ user: user._id, state: 'active' });
  if (!conversation) {
    conversation = await Conversation.create({
      user: user._id,
      state: 'active',
      currentStep: 'start',
      messages: []
    });
  }

  // Si el mensaje es interactivo (botón o lista), el "texto" real que debes procesar
  // es el ID del botón/fila, no el 'text' de la propiedad 'text.body'.
  let processedInput = text.trim().toLowerCase(); // Por defecto, si es un mensaje de texto normal
  let messageType = type; // Tipo de mensaje de WhatsApp (text, interactive, etc.)
  let interactiveId = null;
  let interactiveTitle = null;

  if (type === 'interactive' && interactive) {
    if (interactive.type === 'button_reply') {
      interactiveId = interactive.button_reply.id;
      interactiveTitle = interactive.button_reply.title;
      processedInput = interactiveId; // Usamos el ID del botón como input para la lógica
    } else if (interactive.type === 'list_reply') {
      interactiveId = interactive.list_reply.id;
      interactiveTitle = interactive.list_reply.title;
      processedInput = interactiveId; // Usamos el ID de la fila de la lista como input
    }
  }

  let responsePayload; // La respuesta ahora será un objeto JSON

  // 3. Flujo conversacional basado en el currentStep
  switch (conversation.currentStep) {
    case 'start':
      responsePayload = createReplyButtonsMessage(
        from,
        `Hola 👋, ¿qué deseas hacer?`,
        [
          { id: 'agendar_cita', title: '📅 Agendar una cita' },
          { id: 'consultar_estado', title: '🔍 Consultar estado' },
          { id: 'cancelar', title: '❌ Cancelar una cita' }
        ]
      );
      conversation.currentStep = 'awaiting_choice';
      break;

    case 'awaiting_choice':
      if (processedInput === 'agendar_cita') {
        // Limitar a 10 días para cumplir con la API de WhatsApp
        const next10Days = generateNextNDays(10);
        responsePayload = createListMessage(
          from,
          `Perfecto. Por favor, selecciona el día para tu cita de la lista:`,
          "Seleccionar fecha",
          next10Days
        );
        conversation.currentStep = 'awaiting_date';
      } else if (processedInput === 'consultar_estado') {
        responsePayload = createTextMessage(
          from,
          `🔎 Esta funcionalidad estará disponible pronto. Gracias por tu paciencia.`
        );
        conversation.currentStep = 'start'; // Regresar al inicio después del mensaje
      }else if (processedInput === 'cancelar') {
        responsePayload = createTextMessage(
          from,
          `🔎 Esta funcionalidad estará disponible pronto. Gracias por tu paciencia.`
        );
        conversation.currentStep = 'start'; // Regresar al inicio después del mensaje
      }
      
      else {
        // Si el usuario envía texto inesperado o un ID de botón no reconocido
        responsePayload = createTextMessage(
          from,
          `No entendí tu elección. Por favor, selecciona una de las opciones anteriores.`
        );
      }
      break;

    case 'awaiting_date':
      // El processedInput ahora será el ID de la fecha (ej: 'date_2025-06-28')
      if (processedInput.startsWith('date_')) {
        const dateString = processedInput.split('_')[1]; // Extrae '2025-06-28'
        const selectedDate = new Date(dateString + 'T12:00:00Z'); // Añade hora para evitar problemas de zona horaria

        if (!isNaN(selectedDate.getTime())) { // Validar que la fecha sea válida
          await Appointment.create({
            user: user._id,
            date: selectedDate,
            status: 'scheduled'
          });
          responsePayload = createTextMessage(
            from,
            `✅ Tu cita ha sido registrada para el ${selectedDate.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}. ¡Gracias!`
          );
          conversation.currentStep = 'finished'; // Regresar al inicio
        } else {
          // Esto no debería ocurrir si las fechas se generan correctamente, pero es un fallback
          responsePayload = createTextMessage(
            from,
            `❌ Hubo un problema con la fecha seleccionada. Por favor, intenta de nuevo o envía la fecha en formato AAAA-MM-DD.`
          );
          conversation.currentStep = 'awaiting_date';
        }
      } else {
        // Esto captura si el usuario envía texto en lugar de seleccionar de la lista
        responsePayload = createTextMessage(
          from,
          `❌ No entendí la fecha. Por favor, selecciona una opción de la lista.`
        );
        // Puedes volver a enviar la lista para que el usuario elija correctamente
        const next10Days = generateNextNDays(10);
        responsePayload = createListMessage(
          from,
          `Por favor, selecciona el día para tu cita de la lista:`,
          "Seleccionar fecha",
          next10Days
        );
      }
      break;

    default:
      // Si la conversación está en un estado desconocido, reiniciar o mostrar el menú principal
      responsePayload = createReplyButtonsMessage(
        from,
        `Hola 👋, ¿qué deseas hacer?`,
        [
          { id: 'agendar_cita', title: '📅 Agendar una cita' },
          { id: 'consultar_estado', title: '🔍 Consultar estado' }
        ]
      );
      conversation.currentStep = 'start'; // Reiniciar el flujo
      break;
  }
  // Si la conversación está en estado 'finished', marcarla como 'completed' para permitir reiniciar el flujo
  if (conversation.currentStep === 'finished') {
    conversation.state = 'completed';
    
  }
  // 4. Guardar mensaje del usuario y estado de la conversación
  conversation.messages.push({
    from: 'user',
    text: text, // Guardar el texto original recibido
    timestamp: new Date()
  });
  conversation.updatedAt = new Date();
  await conversation.save();

  return responsePayload; // Devolver el payload para que el controlador lo envíe a WhatsApp
};

module.exports = { handleChatFlow };
