const ConversationService = require('./conversation.service');
const AppointmentService = require('./appointment.service');
const ClientService = require('./client.service');
const DoctorService = require('./doctor.service');

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

  let client;
  try {
    client = await ClientService.findByPhone(from);
    if (!client) {
      client = await ClientService.create({
        phone: from,
        name: from,
        status: 'active'
      });
    }
  } catch (err) {
    console.error('Error al procesar usuario:', err);
    return createTextMessage(
      from,
      '❌ Hubo un error al procesar tu usuario. Por favor, intenta más tarde.'
    );
  }

  let conversation;
  try {
    conversation = await ConversationService.findOneActiveNotFinished(client._id);
    if (!conversation) {
      console.log('No se encontró conversación activa, creando una nueva');
      conversation = await ConversationService.create({
        client: client._id,
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
    console.log('conversation.currentStep:', conversation.currentStep);
    switch (conversation.currentStep) {
      case 'start':
        responsePayload = createReplyButtonsMessage(
          from,
          `Hola 👋, ¿qué deseas hacer?`,
          [
            { id: 'schedule_app', title: '📅 Agendar una cita' },
            { id: 'check_status', title: '🔍 Consultar estado' },
            { id: 'cancel', title: '❌ Cancelar una cita' }
          ]
        );
        conversation.currentStep = 'awaiting_choice';
        break;
      case 'awaiting_choice':
        if (processedInput === 'schedule_app') {
          // Mensaje de introducción y lista de doctores en el mismo paso
          const introMessage = createTextMessage(
            from,
            `Perfecto, vamos a agendar tu cita. Primero selecciona el doctor de tu preferencia.`
          );
          const doctors = await DoctorService.getAll();
          const doctorRows = doctors.map(doc => ({
            id: `doctor_${doc._id}`,
            title: doc.name,
            description: doc.specialty || ''
          }));
          const doctorList = createListMessage(
            from,
            `Selecciona el doctor para tu cita:`,
            "Escoger doctor",
            doctorRows
          );
          // WhatsApp API solo acepta un objeto por mensaje, no un array
          // Enviar solo la lista de doctores, el mensaje introductorio se puede incluir como bodyText
          responsePayload = createListMessage(
            from,
            `Perfecto, vamos a agendar tu cita. Selecciona el doctor de tu preferencia:`,
            "Escoger doctor",
            doctorRows
          );
          conversation.currentStep = 'awaiting_doctor';
        } else if (processedInput === 'check_status') {
          try {
            const appointment = await AppointmentService.getNextConfirmedAppointment(client._id);
            let doctorInfo = '';
            if (appointment && appointment.availability) {
              const availability = await AppointmentService.getAvailabilityById(appointment.availability);
              if (availability && availability.doctor) {
                const doctor = await DoctorService.getById(availability.doctor);
                if (doctor) {
                  doctorInfo = ` con el Dr. ${doctor.name} (${doctor.specialty || 'Sin especialidad'})`;
                }
              }
            }
            if (appointment) {
              const now = new Date();
              if (appointment.date < now) {
                // La cita ya pasó, informar y cancelar
                await AppointmentService.update(appointment._id, { confirmed: false, status: 'cancelled' });
                responsePayload = createTextMessage(
                  from,
                  `Tu cita${doctorInfo} del ${appointment.date.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} se ha perdido por no asistencia y ha sido cancelada.`
                );
              } else {
                responsePayload = createTextMessage(
                  from,
                  `Tu próxima cita${doctorInfo} es el ${appointment.date.toLocaleString('es-ES')}`
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
        } else if (processedInput === 'cancel') {
          try {
            // Obtener todas las citas del cliente
            const allAppointments = await AppointmentService.getAllConfirmedAppointmentsForClient(client._id);
            console.log(`Citas encontradas para cancelar: ${allAppointments.length}`);
            const now = new Date();
            // Cancelar automáticamente las citas pasadas
            for (const app of allAppointments.filter(app => app.date < now)) {
              let doctorInfo = '';
              if (app.availability) {
                const availability = await AppointmentService.getAvailabilityById(app.availability);
                if (availability && availability.doctor) {
                  const doctor = await DoctorService.getById(availability.doctor);
                  if (doctor) {
                    doctorInfo = ` con el Dr. ${doctor.name} (${doctor.specialty || 'Sin especialidad'})`;
                  }
                }
              }
              await AppointmentService.update(app._id, { status: 'cancelled', confirmed: false });
              // Opcional: podrías enviar un mensaje por cada cita cancelada automáticamente
              // createTextMessage(from, `Tu cita${doctorInfo} del ${app.date.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} ha sido cancelada automáticamente.`);
            }
            // Filtrar solo las citas futuras
            const futureAppointments = allAppointments.filter(app => app.date >= now);
            if (futureAppointments.length === 0) {
              responsePayload = createTextMessage(
                from,
                'No tienes citas futuras activas para cancelar.'
              );
              conversation.currentStep = 'finished';
            } else {
              // Mostrar lista de citas futuras para cancelar
              const rows = await Promise.all(futureAppointments.slice(0, 10).map(async app => {
                let doctorInfo = '';
                if (app.availability) {
                  const availability = await AppointmentService.getAvailabilityById(app.availability);
                  if (availability && availability.doctor) {
                    const doctor = await DoctorService.getById(availability.doctor);
                    if (doctor) {
                      doctorInfo = `Dr. ${doctor.name} (${doctor.specialty || 'Sin especialidad'})`;
                    }
                  }
                }
                const desc = `${doctorInfo} - Agendada para el ${app.date.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} a las ${app.date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`;
                return {
                  id: `cancel_appointment_${app._id}`,
                  title: app.date.toLocaleString('es-ES', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }),
                  description: desc.length > 72 ? desc.slice(0, 69) + '...' : desc
                };
              }));
              responsePayload = createListMessage(
                from,
                'Selecciona la cita que deseas cancelar:',
                'Cancelar cita',
                rows
              );
              conversation.currentStep = 'awaiting_cancel_appointment';
            }
          } catch (err) {
            console.error('Error al consultar citas para cancelar:', err);
            responsePayload = createTextMessage(
              from,
              '❌ Hubo un error al consultar tus citas. Por favor, intenta más tarde.'
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
      case 'select_doctor':
        // Mostrar lista de doctores
        const doctors = await DoctorService.getAll();
        const doctorRows = doctors.map(doc => ({
          id: `doctor_${doc._id}`,
          title: doc.name,
          description: doc.specialty || ''
        }));
        responsePayload = createListMessage(
          from,
          `Selecciona el doctor para tu cita:`,
          "Escoger doctor",
          doctorRows
        );
        conversation.currentStep = 'awaiting_doctor';
        break;
      case 'awaiting_doctor':
        if (processedInput.startsWith('doctor_')) {
          try {
            const doctorId = processedInput.split('_')[1];
            conversation.selectedDoctor = doctorId;
            // Buscar citas libres para el doctor
            const freeAppointments = await AppointmentService.getAllFreeAppointmentsForDoctor(doctorId);
            if (freeAppointments.length === 0) {
              responsePayload = createTextMessage(
                from,
                `No hay citas disponibles para este doctor. Intenta con otro o en otro momento.`
              );
              conversation.currentStep = 'start';
              delete conversation.selectedDoctor;
              break;
            }
            // Mostrar solo las próximas 10 citas libres
            const rows = freeAppointments.slice(0, 10).map(app => {
              const desc = `Disponible el ${app.date.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} a las ${app.date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`;
              return {
                id: `appointment_${app._id}`,
                title: app.date.toLocaleString('es-ES', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }),
                description: desc.length > 72 ? desc.slice(0, 69) + '...' : desc
              };
            });
            responsePayload = createListMessage(
              from,
              `Selecciona una cita disponible para el doctor:`,
              "Escoger cita",
              rows
            );
            conversation.currentStep = 'awaiting_appointment';
          } catch (error) {
            responsePayload = createTextMessage(
              from,
              '❌ Ocurrió un error al buscar las citas disponibles para este doctor. Por favor, intenta de nuevo o selecciona otro doctor.'
            );
            conversation.currentStep = 'start';
            delete conversation.selectedDoctor;
          }
        } else {
          responsePayload = createTextMessage(
            from,
            `Por favor, selecciona un doctor de la lista.`
          );
        }
        break;
      case 'awaiting_appointment':
        if (processedInput.startsWith('appointment_')) {
          const appointmentId = processedInput.split('_')[1];
          // Asignar la cita al cliente
          const appointment = await AppointmentService.getById(appointmentId);
          console.log('Asignando cita:', appointment);
          if (!appointment || appointment.client || !appointment.free ) {
            responsePayload = createTextMessage(
              from,
              `La cita seleccionada ya no está disponible. Intenta de nuevo.`
            );
            conversation.currentStep = 'start';
            delete conversation.selectedDoctor;
            break;
          }
          // Obtener información del doctor desde la disponibilidad
          let doctorInfo = '';
          if (appointment.availability) {
            const availability = await AppointmentService.getAvailabilityById(appointment.availability);
            if (availability && availability.doctor) {
              const doctor = await DoctorService.getById(availability.doctor);
              if (doctor) {
                doctorInfo = ` con el Dr. ${doctor.name} (${doctor.specialty || 'Sin especialidad'})`;
              }
            }
          }
          // Asignar cliente, cambiar estado y marcar free=false
          await AppointmentService.update(appointmentId, {
            client: client._id,
            // Cambiar estado a 'scheduled' y confirmar la cita
            status: 'scheduled',
            confirmed: true,
            free: false
          });
          responsePayload = createTextMessage(
            from,
            `✅ Tu cita${doctorInfo} ha sido registrada para el ${appointment.date.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} a las ${appointment.date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}. ¡Gracias!`
          );
          conversation.currentStep = 'finished';
          delete conversation.selectedDoctor;
        } else {
          responsePayload = createTextMessage(
            from,
            `Por favor, selecciona una cita disponible de la lista.`
          );
        }
        break;
      case 'awaiting_cancel_appointment':
        if (processedInput.startsWith('cancel_appointment_')) {
          const appointmentId = processedInput.split('_').pop();
          console.log('Cancelando cita:', appointmentId);
          try {
            const appointment = await AppointmentService.getById(appointmentId);
            console.log('Cancelando cita:', JSON.stringify(appointment));
            let doctorInfo = '';
            if (appointment && appointment.availability) {
              const availability = await AppointmentService.getAvailabilityById(appointment.availability);
              if (availability && availability.doctor) {
                const doctor = await DoctorService.getById(availability.doctor);
                if (doctor) {
                  doctorInfo = ` con el Dr. ${doctor.name} (${doctor.specialty || 'Sin especialidad'})`;
                }
              }
            }
            if (
              !appointment ||
              String(appointment.client) !== String(client._id) ||
              appointment.status !== 'scheduled' ||
              !appointment.confirmed
            ) {
              responsePayload = createTextMessage(
                from,
                'La cita seleccionada no es válida para cancelar.'
              );
              conversation.currentStep = 'start';
              break;
            }
            await AppointmentService.update(appointmentId, { status: 'cancelled', confirmed: false });
            const fecha = appointment.date ? appointment.date.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : '';
            responsePayload = createTextMessage(
              from,
              `Tu cita${doctorInfo} del ${fecha} ha sido cancelada.`
            );
            conversation.currentStep = 'finished';
          } catch (err) {
            console.error('Error al cancelar cita:', err);
            responsePayload = createTextMessage(
              from,
              '❌ Hubo un error al cancelar la cita seleccionada. Por favor, intenta más tarde.'
            );
            conversation.currentStep = 'start';
          }
        } else {
          responsePayload = createTextMessage(
            from,
            'Por favor, selecciona una cita válida para cancelar de la lista.'
          );
        }
        break;
      case 'awaiting_date':
        responsePayload = createTextMessage(
          from,
          `Por favor, selecciona primero un doctor para ver las citas disponibles.`
        );
        conversation.currentStep = 'start';
        break;
      default:
        responsePayload = createReplyButtonsMessage(
          from,
          `Hola 👋, ¿qué deseas hacer?`,
          [
            { id: 'schedule_app', title: '📅 Agendar una cita' },
            { id: 'check_status', title: '🔍 Consultar estado' },
            { id: 'cancel', title: '❌ Cancelar una cita' }
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
