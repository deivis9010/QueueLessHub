import AppointmentService from './appointment.service';
import ClientService from './client.service';
import ConversationService from './conversation.service';
import DoctorService from './doctor.service';
import type { Conversation } from '../types/conversation.types';
import type { Client } from '../types/client.types';
import type { Availability } from '../types/availability.types';
import type {
  WhatsAppButton,
  WhatsAppRow,
  ChatFlowInput,
  WhatsAppTextMessage,
  WhatsAppInteractiveMessage,
  WhatsAppPayload,
} from '../types/whatsapp.types';

type DoctorRecord = {
  _id: string;
  name: string;
  specialty?: string;
};

type AppointmentRecord = {
  _id: string;
  date: Date;
  availability?: Availability;
  client?: Client;
  free?: boolean;
  status?: string;
  confirmed?: boolean;
};

const createTextMessage = (to: string, text: string): WhatsAppTextMessage => ({
  messaging_product: 'whatsapp',
  recipient_type: 'individual',
  to,
  type: 'text',
  text: { body: text },
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
      sections: [{ title: 'Options', rows }],
    },
  },
});

/**
 * Interface para objetos que contienen una propiedad _id
 * Usada para extraer IDs de objetos populados por MongoDB
 */
interface HasObjectId {
  _id: string | { toString(): string };
}

/**
 * Type guard para verificar si un valor tiene propiedad _id
 */
const hasObjectId = (value: unknown): value is HasObjectId => {
  return value !== null && typeof value === 'object' && '_id' in value;
};

/**
 * Helper para extraer el ID de un valor que puede ser un string o un objeto con _id.
 * Evita los problemas de serialización cuando MongoDB popula relaciones.
 * @param value - Puede ser un string (ID directo) o un objeto con propiedad _id (populado)
 * @returns El ID como string, o string vacío si no se puede extraer
 */
const extractObjectId = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (hasObjectId(value)) {
    return typeof value._id === 'string' ? value._id : String(value._id);
  }
  return '';
};

const handleChatFlow = async ({
  from,
  text,
  type,
  interactive,
}: ChatFlowInput): Promise<WhatsAppPayload> => {
  if (!from || !text) throw new Error('Faltan datos');

  let client: Client | null = null;
  try {
    client = (await ClientService.findByPhone(from)) as unknown as Client | null;
    if (!client) {
      client = (await ClientService.create({
        phone: from,
        name: from,
        status: 'active',
      })) as unknown as Client;
    }
  } catch (error) {
    return createTextMessage(from, '❌ Error processing user.');
  }

  let conversation: Conversation | null = null;
  try {
    conversation = (await ConversationService.findOneActiveNotFinished(
      String((client as Client)._id)
    )) as unknown as Conversation | null;
    const now = new Date();

    if (conversation) {
      console.log(`Existing conversation found for client ${client._id}, last updated at ${conversation.updatedAt}, created at ${conversation.createdAt}`);
      const lastUpdateValue = conversation.updatedAt ?? conversation.createdAt ?? now;
      const diffMs = now.getTime() - new Date(lastUpdateValue).getTime();
      if (diffMs > 10 * 60 * 1000) {
        conversation.state = 'finished';
        await conversation.save();
        conversation = null;
      }
    }

    if (!conversation) {
      conversation = (await ConversationService.create({
        client: String((client as Client)._id),
        state: 'active',
        currentStep: 'start',
        messages: [],
      })) as unknown as Conversation;
    }
  } catch (error) {
    return createTextMessage(from, '❌ Error starting conversation.');
  }

  // Ensure client and conversation exist for following logic
  if (!client || !client._id) {
    return createTextMessage(from, '❌ There was an error processing your user.');
  }

  if (!conversation) {
    return createTextMessage(from, '❌ There was an error starting the conversation.');
  }

  let processedInput = text.trim().toLowerCase();
  if (type === 'interactive' && interactive) {
    processedInput = interactive.button_reply?.id || interactive.list_reply?.id || processedInput;
  }

  let responsePayload: WhatsAppPayload;

  try {
    if (['schedule_app', 'check_status', 'cancel'].includes(processedInput)) {
      conversation.currentStep = 'awaiting_choice';
    }
    console.log(`Processing input for conversation ${conversation._id}, current step: ${conversation.currentStep}, processed input: ${processedInput}`);
    console.log('Processed input details:', { type, interactive, processedInput });
    switch (conversation.currentStep) {
      case 'start':
        responsePayload = createReplyButtonsMessage(from, 'Hi 👋, what do you need?', [
          { id: 'schedule_app', title: '📅 Schedule' },
          { id: 'check_status', title: '🔍 Status' },
          { id: 'cancel', title: '❌ Cancel' },
        ]);
        conversation.currentStep = 'awaiting_choice';
        break;

      case 'awaiting_choice':
        if (processedInput === 'schedule_app') {
          const doctors = (await DoctorService.getAll()) as unknown as DoctorRecord[];
          const doctorRows = doctors.map((doc) => ({
            id: `doctor_${String(doc._id)}`,
            title: doc.name.slice(0, 24),
            description: (doc.specialty || '').slice(0, 72),
          }));

          responsePayload = createListMessage(
            from,
            "Perfect, let's schedule. Please select a doctor:",
            'Choose doctor',
            doctorRows
          );
          conversation.currentStep = 'awaiting_doctor';
        } else if (processedInput === 'check_status') {
          try {
            // First, auto-cancel any past appointments
            const allAppointments = (await AppointmentService.getAllConfirmedAppointmentsForClient(
              String(client._id)
            )) as unknown as AppointmentRecord[];
            const now = new Date();
            let missedAppointmentsCount = 0;

            for (const app of allAppointments) {
              if (new Date(app.date) < now && app.status !== 'cancelled') {
                try {
                  await AppointmentService.update(String(app._id), {
                    confirmed: false,
                    status: 'cancelled',
                  });
                  missedAppointmentsCount++;
                } catch (e) {
                  console.error('Error auto-cancelling past appointment:', e);
                }
              }
            }

            // Then get the next future appointment
            const appointment = (await AppointmentService.getNextConfirmedAppointment(
              String(client._id)
            )) as unknown as AppointmentRecord | null;

            // If there are future appointments, show the next one
            if (appointment) {
              let doctorInfo = '';
              if (appointment.availability) {
                const availability = (await AppointmentService.getAvailabilityById(
                  extractObjectId(appointment.availability)
                )) as unknown as Availability | null;
                if (availability && availability.doctor) {
                  const doctor = (await DoctorService.getById(
                    String(availability.doctor)
                  )) as unknown as DoctorRecord | null;
                  if (doctor) {
                    doctorInfo = ` with Dr. ${doctor.name} (${doctor.specialty || 'No specialty'})`;
                  }
                }
              }

              const appointmentDate = new Date(appointment.date);
              responsePayload = createTextMessage(
                from,
                `Your next appointment${doctorInfo} is on ${appointmentDate.toLocaleString('en-US')}`
              );
              conversation.currentStep = 'finished';
            } else if (missedAppointmentsCount > 0) {
              // If no future appointments but we cancelled some past ones, notify user
              responsePayload = createTextMessage(
                from,
                `You missed ${missedAppointmentsCount} appointment(s) and they have been cancelled. You have no future appointments scheduled.`
              );
              conversation.currentStep = 'finished';
            } else {
              // No appointments at all
              responsePayload = createTextMessage(from, 'You have no scheduled appointments.');
              conversation.currentStep = 'finished';
            }
          } catch (err) {
            console.error('Error checking appointment status:', err);
            responsePayload = createTextMessage(
              from,
              '❌ There was an error checking your appointments. Please try again later.'
            );
            conversation.currentStep = 'start';
            break;
          }
        } else if (processedInput === 'cancel') {
          const appointments = (await AppointmentService.getAllConfirmedAppointmentsForClient(
            String(client._id)
          )) as unknown as AppointmentRecord[];
          const now = new Date();

          // Cancel past confirmed appointments automatically
          for (const app of appointments) {
            if (new Date(app.date) < now) {
              try {
                await AppointmentService.update(String(app._id), {
                  confirmed: false,
                  status: 'cancelled',
                });
              } catch (e) {
                console.error('Error cancelling past appointment:', e);
              }
            }
          }

          const futureApps = appointments.filter((app) => new Date(app.date) >= now);

          if (futureApps.length === 0) {
            responsePayload = createTextMessage(
              from,
              'You have no upcoming active appointments to cancel.'
            );
            conversation.currentStep = 'finished';
          } else {
            const rows = futureApps.slice(0, 9).map((app) => ({
              id: `cancel_appointment_${String(app._id)}`,
              title: new Date(app.date).toLocaleDateString(),
              description: 'Click to cancel this appointment',
            }));
            // Add exit option
            rows.push({
              id: 'cancel_exit',
              title: '↩️ Back',
              description: 'Return to main menu',
            });
            responsePayload = createListMessage(
              from,
              'Select an appointment to cancel or go back:',
              'Cancel app',
              rows
            );
            conversation.currentStep = 'awaiting_cancel_appointment';
          }
        } else {
          // Invalid input - regenerate menu instead of just informing user
          responsePayload = createReplyButtonsMessage(from, "❌ I didn't understand. Please select an option:", [
            { id: 'schedule_app', title: '📅 Schedule' },
            { id: 'check_status', title: '🔍 Status' },
            { id: 'cancel', title: '❌ Cancel' },
          ]);
          conversation.currentStep = 'awaiting_choice';
        }
        break;

      case 'awaiting_doctor':
        if (processedInput.startsWith('doctor_')) {
          const doctorId = processedInput.split('_')[1];
          conversation.selectedDoctor = doctorId;
          try {
            const freeApps = (await AppointmentService.getAllFreeAppointmentsForDoctor(
              doctorId
            )) as unknown as AppointmentRecord[];

            if (freeApps.length === 0) {
              responsePayload = createTextMessage(
                from,
                'There are no available appointments for this doctor.'
              );
              conversation.currentStep = 'start';
              conversation.selectedDoctor = undefined;
            } else {
              const rows = freeApps.slice(0, 10).map((app) => ({
                id: `appointment_${String(app._id)}`,
                title: new Date(app.date).toLocaleDateString(),
                description: new Date(app.date).toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                }),
              }));
              responsePayload = createListMessage(from, 'Select a slot:', 'Choose slot', rows);
              conversation.currentStep = 'awaiting_appointment';
            }
          } catch (err) {
            responsePayload = createTextMessage(
              from,
              '❌ An error occurred while searching for available appointments for this doctor. Please try again or select another doctor.'
            );
            conversation.currentStep = 'start';
            conversation.selectedDoctor = undefined;
          }
        } else {
          // Invalid input - regenerate doctor list instead of just informing user
          try {
            const doctors = (await DoctorService.getAll()) as unknown as DoctorRecord[];
            const doctorRows = doctors.map((doc) => ({
              id: `doctor_${String(doc._id)}`,
              title: doc.name.slice(0, 24),
              description: (doc.specialty || '').slice(0, 72),
            }));

            responsePayload = createListMessage(
              from,
              "❌ Invalid selection. Please select a doctor:",
              'Choose doctor',
              doctorRows
            );
            conversation.currentStep = 'awaiting_doctor';
          } catch (err) {
            console.error('Error regenerating doctor list:', err);
            responsePayload = createTextMessage(
              from,
              '❌ An error occurred. Please try again later.'
            );
            conversation.currentStep = 'start';
          }
        }
        break;

      case 'awaiting_appointment':
        if (processedInput.startsWith('appointment_')) {
          const appId = processedInput.split('_')[1];
          const appointment = (await AppointmentService.getById(
            appId
          )) as unknown as AppointmentRecord | null;

          if (!appointment || (appointment.client as unknown) || appointment.free === false) {
            responsePayload = createTextMessage(
              from,
              'The selected appointment is no longer available. Please try again.'
            );
            conversation.currentStep = 'start';
            conversation.selectedDoctor = undefined;
            break;
          }

          let doctorInfo = '';
          if (appointment.availability) {
            const availability = (await AppointmentService.getAvailabilityById(
              extractObjectId(appointment.availability)
            )) as unknown as Availability | null;
            if (availability && availability.doctor) {
              const doctor = (await DoctorService.getById(
                String(availability.doctor)
              )) as unknown as DoctorRecord | null;
              if (doctor) {
                doctorInfo = ` with Dr. ${doctor.name} (${doctor.specialty || 'No specialty'})`;
              }
            }
          }

          await AppointmentService.update(appId, {
            client: String((client as Client)._id),
            status: 'scheduled',
            confirmed: true,
            free: false,
          });

          responsePayload = createTextMessage(
            from,
            `Your appointment${doctorInfo} has been scheduled successfully.`
          );
          conversation.currentStep = 'finished';
          conversation.selectedDoctor = undefined;
        } else {
          // Invalid input - regenerate appointment list instead of just informing user
          try {
            const doctorId = conversation.selectedDoctor;
            if (!doctorId) {
              responsePayload = createTextMessage(
                from,
                '❌ No doctor selected. Please start over.'
              );
              conversation.currentStep = 'start';
              break;
            }

            const freeApps = (await AppointmentService.getAllFreeAppointmentsForDoctor(
              doctorId
            )) as unknown as AppointmentRecord[];

            if (freeApps.length === 0) {
              responsePayload = createTextMessage(
                from,
                'There are no available appointments for this doctor.'
              );
              conversation.currentStep = 'start';
              conversation.selectedDoctor = undefined;
            } else {
              const rows = freeApps.slice(0, 10).map((app) => ({
                id: `appointment_${String(app._id)}`,
                title: new Date(app.date).toLocaleDateString(),
                description: new Date(app.date).toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                }),
              }));
              responsePayload = createListMessage(
                from,
                "❌ Invalid selection. Please select a slot:",
                'Choose slot',
                rows
              );
              conversation.currentStep = 'awaiting_appointment';
            }
          } catch (err) {
            console.error('Error regenerating appointment list:', err);
            responsePayload = createTextMessage(
              from,
              '❌ An error occurred. Please try again later.'
            );
            conversation.currentStep = 'start';
            conversation.selectedDoctor = undefined;
          }
        }
        break;

      case 'awaiting_cancel_appointment':
        if (processedInput === 'cancel_exit') {
          // User wants to go back to main menu
          responsePayload = createReplyButtonsMessage(from, 'What do you need?', [
            { id: 'schedule_app', title: '📅 Schedule' },
            { id: 'check_status', title: '🔍 Status' },
            { id: 'cancel', title: '❌ Cancel' },
          ]);
          conversation.currentStep = 'awaiting_choice';
        } else if (processedInput.startsWith('cancel_appointment_')) {
          const appId = processedInput.replace('cancel_appointment_', '');
          try {
            const appointment = (await AppointmentService.getById(
              appId
            )) as unknown as AppointmentRecord | null;

            if (!appointment) {
              responsePayload = createTextMessage(
                from,
                'The selected appointment was not found. Please try again.'
              );
              conversation.currentStep = 'awaiting_cancel_appointment';
              break;
            }

            // Validate that appointment belongs to this client
            // Handle both direct client ID and populated client object
            const appointmentClientId = typeof appointment.client === 'string' 
              ? appointment.client 
              : appointment.client?._id 
              ? String(appointment.client._id)
              : null;
              
            if (
              !appointmentClientId ||
              appointmentClientId !== String((client as Client)._id)
            ) {
              responsePayload = createTextMessage(
                from,
                'The selected appointment is not valid for cancellation. Please select a valid appointment from the list.'
              );
              conversation.currentStep = 'awaiting_cancel_appointment';
              break;
            }

            await AppointmentService.update(appId, {
              status: 'cancelled',
              confirmed: false,
              free: true,
              client: null,
            });
            responsePayload = createTextMessage(
              from,
              '✅ Your appointment has been cancelled successfully.'
            );
            conversation.currentStep = 'finished';
          } catch (err) {
            console.error('Error cancelling appointment:', err);
            responsePayload = createTextMessage(
              from,
              '❌ There was an error cancelling the appointment. Please try again later.'
            );
            conversation.currentStep = 'start';
          }
        } else {
          // Invalid input - regenerate cancellation list with exit option
          try {
            const appointments = (await AppointmentService.getAllConfirmedAppointmentsForClient(
              String(client._id)
            )) as unknown as AppointmentRecord[];
            const now = new Date();

            // Auto-cancel past appointments
            for (const app of appointments) {
              if (new Date(app.date) < now) {
                try {
                  await AppointmentService.update(String(app._id), {
                    confirmed: false,
                    status: 'cancelled',
                  });
                } catch (e) {
                  console.error('Error auto-cancelling past appointment:', e);
                }
              }
            }

            const futureApps = appointments.filter((app) => new Date(app.date) >= now);

            if (futureApps.length === 0) {
              responsePayload = createTextMessage(
                from,
                'You have no upcoming active appointments to cancel.'
              );
              conversation.currentStep = 'finished';
            } else {
              const rows = futureApps.slice(0, 9).map((app) => ({
                id: `cancel_appointment_${String(app._id)}`,
                title: new Date(app.date).toLocaleDateString(),
                description: 'Click to cancel this appointment',
              }));
              // Add exit option
              rows.push({
                id: 'cancel_exit',
                title: '↩️ Back',
                description: 'Return to main menu',
              });
              responsePayload = createListMessage(
                from,
                'Select an appointment to cancel or go back:',
                'Cancel app',
                rows
              );
              conversation.currentStep = 'awaiting_cancel_appointment';
            }
          } catch (err) {
            console.error('Error regenerating cancellation list:', err);
            responsePayload = createTextMessage(
              from,
              '❌ An error occurred. Please try again later.'
            );
            conversation.currentStep = 'start';
          }
        }
        break;

      case 'finished':
        responsePayload = createTextMessage(from, 'To start a new request, send any message.');
        conversation.currentStep = 'start';
        break;

      default:
        responsePayload = createTextMessage(from, 'Hi 👋, what do you need?');
        conversation.currentStep = 'awaiting_choice';
        break;
    }

    conversation.messages.push({ from: 'user', text, timestamp: new Date() });
    await conversation.save();
    return responsePayload;
  } catch (error) {
    console.error('Flow Error:', error);
    if (conversation) {
      conversation.currentStep = 'start';
      try {
        await conversation.save();
      } catch (errSave) {
        console.error(
          'Error saving conversation after flow error:',
          errSave && (errSave as Error).message ? (errSave as Error).message : errSave
        );
      }
    }
    return createTextMessage(from, '❌ An error occurred. Flow restarted.');
  }
};

export { handleChatFlow, createTextMessage, createReplyButtonsMessage, createListMessage };
