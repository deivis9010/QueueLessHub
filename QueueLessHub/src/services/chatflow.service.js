const ConversationService = require('./conversation.service');
const AppointmentService = require('./appointment.service');
const UserService = require('./user.service');

/**
 * Función auxiliar para generar los próximos N días hábiles (lunes a viernes).
 * @param {number} numDays - Número de días hábiles a generar.
 * @returns {Array<Object>} Un array de objetos con id, title, y description para List Messages.
 */
const generateNextNDays = (numDays) => {
  const dates = [];
  let i = 1; // Comenzar en 1 para saltar el día actual
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

  let user;
  try {
    user = await UserService.findByPhone(from);
    if (!user) {
      user = await UserService.create({
        phone: from,
        name: from,
        status: 'active'
      });
    }
  } catch (err) {
    return createTextMessage(
      from,
      '❌ Hubo un error al procesar tu usuario. Por favor, intenta más tarde.'
    );
  }

  let conversation;
  try {
    conversation = await ConversationService.findOneActiveNotFinished(user._id);
    if (!conversation) {
      conversation = await ConversationService.create({
        user: user._id,
        state: 'active',
        currentStep: 'start',
        messages: []
      });
    }
  } catch (err) {
    return createTextMessage(
      from,
      '❌ Hubo un error al iniciar la conversación. Por favor, intenta más tarde.'
    );
  }

  let processedInput = text.trim().toLowerCase();
  let messageType = type;
  let interactiveId = null;
  let interactiveTitle = null;

  if (type === 'interactive' && interactive) {
    if (interactive.type === 'button_reply') {
      interactiveId = interactive.button_reply.id;
      interactiveTitle = interactive.button_reply.title;
      processedInput = interactiveId;
    } else if (interactive.type === 'list_reply') {
      interactiveId = interactive.list_reply.id;
      interactiveTitle = interactive.list_reply.title;
      processedInput = interactiveId;
    }
  }

  let responsePayload;
  try {
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
          const next10Days = generateNextNDays(10);
          responsePayload = createListMessage(
            from,
            `Perfecto. Por favor, selecciona el día para tu cita de la lista:`,
            "Seleccionar fecha",
            next10Days
          );
          conversation.currentStep = 'awaiting_date';
        } else if (processedInput === 'consultar_estado') {
          try {
            const appointment = await AppointmentService.getNextConfirmedAppointment(user._id);
            if (appointment) {
              const now = new Date();
              if (appointment.date < now) {
                // La cita ya pasó, informar y cancelar
                await AppointmentService.update(appointment._id, { confirmed: false, status: 'cancelled' });
                responsePayload = createTextMessage(
                  from,
                  `Tu cita del ${appointment.date.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} se ha perdido por no asistencia y ha sido cancelada.`
                );
              } else {
                responsePayload = createTextMessage(
                  from,
                  `Tu próxima cita es el ${appointment.date.toLocaleString('es-ES')}`
                );
              }
            } else {
              responsePayload = createTextMessage(
                from,
                'No tienes citas agendadas.'
              );
            }
            conversation.currentStep = 'finished';
          } catch (err) {
            console.error('Error al consultar citas:', err);
            responsePayload = createTextMessage(
              from,
              '❌ Hubo un error al consultar tus citas. Por favor, intenta más tarde.'
            );
            conversation.currentStep = 'start';
          }
        } else if (processedInput === 'cancelar') {
          try {
            const appointment = await AppointmentService.cancelConfirmedAppointment(user._id);
            if (appointment) {
              const fecha = appointment.date ? appointment.date.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : '';
              responsePayload = createTextMessage(
                from,
                `Tu cita del ${fecha} ha sido cancelada.`
              );
            } else {
              responsePayload = createTextMessage(
                from,
                'No tienes citas activas para cancelar.'
              );
            }
            conversation.currentStep = 'finished';
          } catch (err) {
            responsePayload = createTextMessage(
              from,
              '❌ Hubo un error al cancelar tu cita. Por favor, intenta más tarde.'
            );
            conversation.currentStep = 'start';
          }
        } else {
          responsePayload = createTextMessage(
            from,
            `No entendí tu elección. Por favor, selecciona una de las opciones anteriores.`
          );
        }
        break;
      case 'awaiting_date':
        if (processedInput.startsWith('date_')) {
          const dateString = processedInput.split('_')[1];
          const selectedDate = new Date(dateString + 'T12:00:00Z');
          if (!isNaN(selectedDate.getTime())) {
            try {
              await AppointmentService.create({
                user: user._id,
                date: selectedDate,
                status: 'scheduled'
              });
              responsePayload = createTextMessage(
                from,
                `✅ Tu cita ha sido registrada para el ${selectedDate.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}. ¡Gracias!`
              );
              conversation.currentStep = 'finished';
            } catch (error) {
              responsePayload = createTextMessage(
                from,
                `❌ Hubo un problema al agendar tu cita. Por favor, inténtalo de nuevo más tarde.`
              );
              conversation.currentStep = 'start';
            }
          } else {
            responsePayload = createTextMessage(
              from,
              `❌ Hubo un problema con la fecha seleccionada. Por favor, intenta de nuevo o envía la fecha en formato AAAA-MM-DD.`
            );
            conversation.currentStep = 'awaiting_date';
          }
        } else {
          responsePayload = createTextMessage(
            from,
            `❌ No entendí la fecha. Por favor, selecciona una opción de la lista.`
          );
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
        responsePayload = createReplyButtonsMessage(
          from,
          `Hola 👋, ¿qué deseas hacer?`,
          [
            { id: 'agendar_cita', title: '📅 Agendar una cita' },
            { id: 'consultar_estado', title: '🔍 Consultar estado' },
            { id: 'cancelar', title: '❌ Cancelar una cita' }
          ]
        );
        conversation.currentStep = 'start';
        break;
    }
  } catch (err) {
    responsePayload = createTextMessage(
      from,
      '❌ Ocurrió un error inesperado. El flujo se reiniciará. Por favor, intenta de nuevo.'
    );
    conversation.currentStep = 'start';
  }

  // Guardar mensaje y estado de conversación, manejar errores
  try {
    conversation.messages.push({
      from: 'user',
      text: text,
      timestamp: new Date()
    });
    conversation.updatedAt = new Date();
    await conversation.save();
  } catch (err) {
    responsePayload = createTextMessage(
      from,
      '❌ Hubo un error al guardar la conversación. El flujo se reiniciará.'
    );
    if (conversation) {
      conversation.currentStep = 'start';
      conversation.state = 'active';
      try { await conversation.save(); } catch {}
    }
  }

  return responsePayload;
};

module.exports = { handleChatFlow };
