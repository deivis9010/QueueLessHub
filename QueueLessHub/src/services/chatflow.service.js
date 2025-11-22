const ConversationService = require('./conversation.service');
const AppointmentService = require('./appointment.service');
const ClientService = require('./client.service');
const DoctorService = require('./doctor.service');



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
          title: "Options", // Puedes personalizar el título de la sección
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
      '❌ There was an error processing your user. Please try again later.'
    );
  }

  let conversation;
  try {
    conversation = await ConversationService.findOneActiveNotFinished(client._id);
    const now = new Date();
    if (conversation) {
      // Si han pasado más de 10 minutos desde el último mensaje, cancelar y crear nueva conversación
      const lastUpdate = conversation.updatedAt || conversation.createdAt;
      const diffMs = now - new Date(lastUpdate);
      if (diffMs > 10 * 60 * 1000) { // 10 minutos en ms
        conversation.state = 'finished';
        conversation.currentStep = 'start';
        await conversation.save();
        conversation = null;
      }
    }
    if (!conversation) {
      console.log('No se encontró conversación activa o estaba expirada, creando una nueva');
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
      '❌ There was an error starting the conversation. Please try again later.'
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

    // Permitir comandos principales en cualquier paso
    if (["schedule_app", "check_status", "cancel"].includes(processedInput)) {
      conversation.currentStep = "awaiting_choice";
    }

    switch (conversation.currentStep) {
      case 'start':
        responsePayload = createReplyButtonsMessage(
          from,
          `Hi 👋, what do you need?`,
          [
            { id: 'schedule_app', title: '📅 Schedule' },
            { id: 'check_status', title: '🔍 Status' },
            { id: 'cancel', title: '❌ Cancel' }
          ]
        );
        conversation.currentStep = 'awaiting_choice';
        break;
      case 'awaiting_choice':
        if (processedInput === 'schedule_app') {
          // Mensaje de introducción y lista de doctores en el mismo paso
            const introMessage = createTextMessage(
            from,
            `Perfect, let's schedule your appointment. First, select your preferred doctor.`
            );
          const doctors = await DoctorService.getAll();
          const doctorRows = doctors.map(doc => ({
            id: `doctor_${doc._id}`,
            title: doc.name,
            description: doc.specialty || ''
          }));
            const doctorList = createListMessage(
            from,
            `Select the doctor for your appointment:`,
            "Choose doctor",
            doctorRows
            );
          // WhatsApp API solo acepta un objeto por mensaje, no un array
          // Enviar solo la lista de doctores, el mensaje introductorio se puede incluir como bodyText
            responsePayload = createListMessage(
            from,
            `Perfect, let's schedule your appointment. Please select your preferred doctor:`,
            "Choose doctor",
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
                    doctorInfo = ` with Dr. ${doctor.name} (${doctor.specialty || 'No specialty'})`;
                }
              }
            }
            if (appointment) {
              const now = new Date();
                if (appointment.date < now) {
                // The appointment has already passed, inform and cancel
                await AppointmentService.update(appointment._id, { confirmed: false, status: 'cancelled' });
                responsePayload = createTextMessage(
                  from,
                  `Your appointment${doctorInfo} on ${appointment.date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} was missed and has been cancelled.`
                );
                } else {
                responsePayload = createTextMessage(
                  from,
                  `Your next appointment${doctorInfo} is on ${appointment.date.toLocaleString('en-US')}`
                );
                }
              } else {
                responsePayload = createTextMessage(
                from,
                'You have no scheduled appointments.'
                );
            }
            conversation.currentStep = 'finished';
          } catch (err) {
            console.error('Error al consultar citas:', err);
            responsePayload = createTextMessage(
              from,
              '❌ There was an error checking your appointments. Please try again later.'
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
                    doctorInfo = ` with Dr. ${doctor.name} (${doctor.specialty || 'No specialty'})`;
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
                'You have no upcoming active appointments to cancel.'
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
                      doctorInfo = `Dr. ${doctor.name} (${doctor.specialty || 'No specialty'})`;
                    }
                  }
                }
                const desc = `${doctorInfo} - Scheduled for ${app.date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} at ${app.date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
                return {
                  id: `cancel_appointment_${app._id}`,
                  title: app.date.toLocaleString('en-US', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }),
                  description: desc.length > 72 ? desc.slice(0, 69) + '...' : desc
                };
              }));
              responsePayload = createListMessage(
                from,
                'Select the appointment you want to cancel:',
                'Cancel appointment',
                rows
              );
              conversation.currentStep = 'awaiting_cancel_appointment';
            }
          } catch (err) {
            console.error('Error checking appointments to cancel:', err);
            responsePayload = createTextMessage(
              from,
              '❌ There was an error checking your appointments. Please try again later.'
            );
            conversation.currentStep = 'start';
          }
        } else {
          responsePayload = createTextMessage(
            from,
            `I didn't understand your choice. Please select one of the previous options.`
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
          `Select the doctor for your appointment:`,
          "Choose doctor",
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
                `There are no available appointments for this doctor. Try another or at a different time.`
              );
              conversation.currentStep = 'start';
              delete conversation.selectedDoctor;
              break;
            }
            // Mostrar solo las próximas 10 citas libres
            const rows = freeAppointments.slice(0, 10).map(app => {
              const desc = `Available on ${app.date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} at ${app.date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
              return {
                id: `appointment_${app._id}`,
                title: app.date.toLocaleString('en-US', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }),
                description: desc.length > 72 ? desc.slice(0, 69) + '...' : desc
              };
            });
            responsePayload = createListMessage(
              from,
              `Select an available appointment for the doctor:`,
              "Choose appointment",
              rows
            );
            conversation.currentStep = 'awaiting_appointment';
          } catch (error) {
            responsePayload = createTextMessage(
              from,
              '❌ An error occurred while searching for available appointments for this doctor. Please try again or select another doctor.'
            );
            conversation.currentStep = 'start';
            delete conversation.selectedDoctor;
          }
        } else {
          responsePayload = createTextMessage(
            from,
            `Please select a doctor from the list.`
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
              `The selected appointment is no longer available. Please try again.`
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
                doctorInfo = ` with Dr. ${doctor.name} (${doctor.specialty || 'No specialty'})`;
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
            `✅ Your appointment${doctorInfo} has been scheduled for ${appointment.date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} at ${appointment.date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}. Thank you!`
          );
          conversation.currentStep = 'finished';
          delete conversation.selectedDoctor;
        } else {
          responsePayload = createTextMessage(
            from,
            `Please select an available appointment from the list.`
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
                    doctorInfo = ` with Dr. ${doctor.name} (${doctor.specialty || 'No specialty'})`;
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
                'The selected appointment is not valid for cancellation.'
              );
              conversation.currentStep = 'start';
              break;
            }
            await AppointmentService.update(appointmentId, { status: 'cancelled', confirmed: false });
            const fecha = appointment.date ? appointment.date.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : '';
            responsePayload = createTextMessage(
            from,
            `Your appointment${doctorInfo} on ${fecha} has been cancelled.`
          );
            conversation.currentStep = 'finished';
          } catch (err) {
            console.error('Error al cancelar cita:', err);
            responsePayload = createTextMessage(
            from,
            '❌ There was an error cancelling the selected appointment. Please try again later.'
          );
            conversation.currentStep = 'start';
          }
        } else {
          responsePayload = createTextMessage(
            from,
            'Please select a valid appointment to cancel from the list.'
          );
        }
        break;
      case 'awaiting_date':
        responsePayload = createTextMessage(
          from,
          `Please select a doctor first to see available appointments.`
        );
        conversation.currentStep = 'start';
        break;
      default:
        responsePayload = createReplyButtonsMessage(
          from,
          `Hi 👋, what do you need?`,
          [
            { id: 'schedule_app', title: '📅 Schedule' },
            { id: 'check_status', title: '🔍 Status' },
            { id: 'cancel', title: '❌ Cancel' }
          ]
        );
        conversation.currentStep = 'start';
        break;
    }
  } catch (err) {
    responsePayload = createTextMessage(
      from,
      '❌ An unexpected error occurred. The flow will restart. Please try again.'
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
      '❌ There was an error saving the conversation. The flow will restart.'
    );
    if (conversation) {
      conversation.currentStep = 'start';
      conversation.state = 'active';
      try { await conversation.save(); } catch {}
    }
  }

  return responsePayload;
};

module.exports = {
  handleChatFlow,
  createTextMessage,
  createReplyButtonsMessage,
  createListMessage
};
