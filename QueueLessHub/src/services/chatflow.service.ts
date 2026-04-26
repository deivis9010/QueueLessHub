import AppointmentService from './appointment.service';
import ClientService from './client.service';
import ConversationService from './conversation.service';
import DoctorService from './doctor.service';
import type { ConversationMessage } from '../types/conversation.types';
import type { HydratedDocument } from 'mongoose';
import type {
  WhatsAppButton,
  WhatsAppRow,
  ChatFlowInput,
  WhatsAppTextMessage,
  WhatsAppInteractiveMessage,
  WhatsAppPayload,
} from '../types/whatsapp.types';

// Loose conversation type to accommodate Mongoose documents (ObjectId/_id types)
type ConversationLoose = {
  _id?: unknown;
  id?: unknown;
  client?: unknown;
  state?: string;
  currentStep?: string;
  selectedDoctor?: string | null;
  messages?: Array<Partial<ConversationMessage>>;
  createdAt?: Date;
  updatedAt?: Date;
  save?: () => Promise<unknown>;
};

type DoctorRecord = {
  _id: unknown;
  name?: unknown;
  specialty?: unknown;
};

type AppointmentRecord = {
  _id: unknown;
  date: unknown;
  availability?: unknown;
  client?: unknown;
  free?: boolean;
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
      sections: [
        {
          title: 'Options',
          rows,
        },
      ],
    },
  },
});

const handleChatFlow = async ({
  from,
  text,
  type,
  interactive,
}: ChatFlowInput): Promise<WhatsAppPayload> => {
  if (!from || !text) {
    throw new Error('Faltan datos');
  }

  let client;

  try {
    client = await ClientService.findByPhone(from);
    if (!client) {
      client = await ClientService.create({
        phone: from,
        name: from,
        status: 'active',
      });
    }
  } catch (error) {
    console.error('Error al procesar usuario:', error);
    return createTextMessage(
      from,
      '❌ There was an error processing your user. Please try again later.'
    );
  }

  let conversation: HydratedDocument<ConversationLoose> | null = null;

  try {
    conversation = await ConversationService.findOneActiveNotFinished(client._id.toString());
    const now = new Date();

    if (conversation) {
      const lastUpdate = conversation.updatedAt || conversation.createdAt;
      const diffMs = now.getTime() - new Date(lastUpdate).getTime();
      if (diffMs > 10 * 60 * 1000) {
        conversation.state = 'finished';
        conversation.currentStep = 'start';
        await conversation.save();
        conversation = null;
      }
    }

    if (!conversation) {
      console.log('No se encontró conversación activa o estaba expirada, creando una nueva');
      conversation = await ConversationService.create({
        client: client._id.toString(),
        state: 'active',
        currentStep: 'start',
        messages: [],
      });
    }
  } catch (error) {
    return createTextMessage(
      from,
      '❌ There was an error starting the conversation. Please try again later.'
    );
  }

  let processedInput = text.trim().toLowerCase();

  if (conversation) {
    if (!Array.isArray(conversation.messages)) {
      conversation.messages = [] as ConversationMessage[];
    }
    conversation.messages.push({
      from: 'user',
      text,
      timestamp: new Date(),
    });
  }

  if (type === 'interactive' && interactive) {
    if (interactive.type === 'button_reply') {
      processedInput = interactive.button_reply?.id || processedInput;
    } else if (interactive.type === 'list_reply') {
      processedInput = interactive.list_reply?.id || processedInput;
    }
  }

  let responsePayload: WhatsAppPayload;

  try {
    console.log('conversation.currentStep:', conversation.currentStep);

    if (['schedule_app', 'check_status', 'cancel'].includes(processedInput)) {
      conversation.currentStep = 'awaiting_choice';
    }

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
          const doctors = (await DoctorService.getAll()) as DoctorRecord[];
          const doctorRows = doctors.map((doctor) => ({
            id: `doctor_${String(doctor._id)}`,
            title: String(doctor.name ?? ''),
            description: String(doctor.specialty ?? ''),
          }));

          responsePayload = createListMessage(
            from,
            "Perfect, let's schedule your appointment. Please select your preferred doctor:",
            'Choose doctor',
            doctorRows
          );
          conversation.currentStep = 'awaiting_doctor';
        } else if (processedInput === 'check_status') {
          try {
            const appointment = await AppointmentService.getNextConfirmedAppointment(
              client._id.toString()
            );
            let doctorInfo = '';

            if (appointment && appointment.availability) {
              const availability = await AppointmentService.getAvailabilityById(
                String(appointment.availability)
              );
              if (availability && availability.doctor) {
                const doctor = await DoctorService.getById(String(availability.doctor));
                if (doctor) {
                  doctorInfo = ` with Dr. ${doctor.name} (${doctor.specialty || 'No specialty'})`;
                }
              }
            }

            if (appointment) {
              const appointmentDate = new Date(
                (appointment as AppointmentRecord).date as string | number | Date
              );
              const now = new Date();
              if (appointmentDate < now) {
                await AppointmentService.update(String(appointment._id), {
                  confirmed: false,
                  status: 'cancelled',
                });
                responsePayload = createTextMessage(
                  from,
                  `Your appointment${doctorInfo} on ${appointmentDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} was missed and has been cancelled.`
                );
              } else {
                responsePayload = createTextMessage(
                  from,
                  `Your next appointment${doctorInfo} is on ${appointmentDate.toLocaleString('en-US')}`
                );
              }
            } else {
              responsePayload = createTextMessage(from, 'You have no scheduled appointments.');
            }

            conversation.currentStep = 'finished';
          } catch (error) {
            console.error('Error al consultar citas:', error);
            responsePayload = createTextMessage(
              from,
              '❌ There was an error checking your appointments. Please try again later.'
            );
            conversation.currentStep = 'start';
          }
        } else if (processedInput === 'cancel') {
          try {
            const allAppointments = (await AppointmentService.getAllConfirmedAppointmentsForClient(
              client._id.toString()
            )) as AppointmentRecord[];
            console.log(`Citas encontradas para cancelar: ${allAppointments.length}`);
            const now = new Date();

            for (const appointment of allAppointments.filter(
              (item) => new Date(item.date as string | number | Date) < now
            )) {
              if (appointment.availability) {
                const availability = await AppointmentService.getAvailabilityById(
                  String(appointment.availability)
                );
                if (availability && availability.doctor) {
                  await DoctorService.getById(String(availability.doctor));
                }
              }

              await AppointmentService.update(String(appointment._id), {
                status: 'cancelled',
                confirmed: false,
              });
            }

            const futureAppointments = allAppointments.filter(
              (item) => new Date(item.date as string | number | Date) >= now
            );
            if (futureAppointments.length === 0) {
              responsePayload = createTextMessage(
                from,
                'You have no upcoming active appointments to cancel.'
              );
              conversation.currentStep = 'finished';
            } else {
              const rows = await Promise.all(
                futureAppointments.slice(0, 10).map(async (appointment) => {
                  let doctorInfo = '';

                  if (appointment.availability) {
                    const availability = await AppointmentService.getAvailabilityById(
                      String(appointment.availability)
                    );
                    if (availability && availability.doctor) {
                      const doctor = await DoctorService.getById(String(availability.doctor));
                      if (doctor) {
                        doctorInfo = `Dr. ${doctor.name} (${doctor.specialty || 'No specialty'})`;
                      }
                    }
                  }

                  const appointmentDate = new Date(appointment.date as string | number | Date);
                  const desc = `${doctorInfo} - Scheduled for ${appointmentDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} at ${appointmentDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
                  return {
                    id: `cancel_appointment_${String(appointment._id)}`,
                    title: appointmentDate.toLocaleString('en-US', {
                      weekday: 'short',
                      day: '2-digit',
                      month: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    }),
                    description: desc.length > 72 ? `${desc.slice(0, 69)}...` : desc,
                  };
                })
              );

              responsePayload = createListMessage(
                from,
                'Select the appointment you want to cancel:',
                'Cancel appointment',
                rows
              );
              conversation.currentStep = 'awaiting_cancel_appointment';
            }
          } catch (error) {
            console.error('Error checking appointments to cancel:', error);
            responsePayload = createTextMessage(
              from,
              '❌ There was an error checking your appointments. Please try again later.'
            );
            conversation.currentStep = 'start';
          }
        } else {
          responsePayload = createTextMessage(
            from,
            "I didn't understand your choice. Please select one of the previous options."
          );
        }
        break;
      case 'select_doctor': {
        const doctors = (await DoctorService.getAll()) as DoctorRecord[];
        const doctorRows = doctors.map((doctor) => ({
          id: `doctor_${String(doctor._id)}`,
          title: String(doctor.name ?? ''),
          description: String(doctor.specialty ?? ''),
        }));

        responsePayload = createListMessage(
          from,
          'Select the doctor for your appointment:',
          'Choose doctor',
          doctorRows
        );
        conversation.currentStep = 'awaiting_doctor';
        break;
      }
      case 'awaiting_doctor':
        if (processedInput.startsWith('doctor_')) {
          try {
            const doctorId = processedInput.split('_')[1];
            conversation.selectedDoctor = doctorId;
            const freeAppointments = (await AppointmentService.getAllFreeAppointmentsForDoctor(
              doctorId
            )) as AppointmentRecord[];
            if (freeAppointments.length === 0) {
              responsePayload = createTextMessage(
                from,
                'There are no available appointments for this doctor. Try another or at a different time.'
              );
              conversation.currentStep = 'start';
              conversation.selectedDoctor = undefined;
              break;
            }

            const rows = freeAppointments.slice(0, 10).map((appointment) => {
              const appointmentDate = new Date(appointment.date as string | number | Date);
              const desc = `Available on ${appointmentDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} at ${appointmentDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
              return {
                id: `appointment_${String(appointment._id)}`,
                title: appointmentDate.toLocaleString('en-US', {
                  weekday: 'short',
                  day: '2-digit',
                  month: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                }),
                description: desc.length > 72 ? `${desc.slice(0, 69)}...` : desc,
              };
            });

            responsePayload = createListMessage(
              from,
              'Select an available appointment for the doctor:',
              'Choose appointment',
              rows
            );
            conversation.currentStep = 'awaiting_appointment';
          } catch (error) {
            responsePayload = createTextMessage(
              from,
              '❌ An error occurred while searching for available appointments for this doctor. Please try again or select another doctor.'
            );
            conversation.currentStep = 'start';
            conversation.selectedDoctor = undefined;
          }
        } else {
          responsePayload = createTextMessage(from, 'Please select a doctor from the list.');
        }
        break;
      case 'awaiting_appointment':
        if (processedInput.startsWith('appointment_')) {
          const appointmentId = processedInput.split('_')[1];
          const appointment = (await AppointmentService.getById(
            appointmentId
          )) as AppointmentRecord | null;
          console.log('Asignando cita:', appointment);
          if (!appointment || appointment.client || !appointment.free) {
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
            const availability = await AppointmentService.getAvailabilityById(
              String(appointment.availability)
            );
            if (availability && availability.doctor) {
              const doctor = await DoctorService.getById(String(availability.doctor));
              if (doctor) {
                doctorInfo = ` with Dr. ${doctor.name} (${doctor.specialty || 'No specialty'})`;
              }
            }
          }

          await AppointmentService.update(appointmentId, {
            client: client._id.toString(),
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
          responsePayload = createTextMessage(from, 'Please select an appointment from the list.');
        }
        break;
      case 'awaiting_cancel_appointment':
        if (processedInput.startsWith('cancel_appointment_')) {
          const appointmentId = processedInput.replace('cancel_appointment_', '');
          const appointment = await AppointmentService.getById(appointmentId);
          if (!appointment) {
            responsePayload = createTextMessage(
              from,
              'The selected appointment was not found. Please try again.'
            );
            conversation.currentStep = 'start';
            break;
          }

          if (appointment.client && String(appointment.client) !== String(client._id)) {
            responsePayload = createTextMessage(
              from,
              'The selected appointment is not valid for cancellation. Please select a valid appointment from the list.'
            );
            conversation.currentStep = 'start';
            break;
          }

          await AppointmentService.update(appointmentId, {
            status: 'cancelled',
            confirmed: false,
            free: true,
            client: null,
          });
          responsePayload = createTextMessage(
            from,
            'Your appointment has been cancelled successfully.'
          );
          conversation.currentStep = 'finished';
        } else {
          responsePayload = createTextMessage(from, 'Please select an appointment from the list.');
        }
        break;
      case 'finished':
        responsePayload = createTextMessage(
          from,
          'To start a new request, please choose one of the available options.'
        );
        conversation.currentStep = 'start';
        break;
      default:
        responsePayload = createTextMessage(from, 'Hi 👋, what do you need?');
        conversation.currentStep = 'awaiting_choice';
        break;
    }

    await conversation.save();
  } catch (error) {
    console.error('Error en handleChatFlow:', error);
    responsePayload = createTextMessage(
      from,
      '❌ There was an error processing your request. Please try again later.'
    );
    if (conversation) {
      conversation.currentStep = 'start';
      try {
        await conversation.save();
      } catch (saveError) {
        console.error('Error al guardar el estado de la conversación tras un fallo:', saveError);
      }
    }
  }

  return responsePayload;
};

export { handleChatFlow, createTextMessage, createReplyButtonsMessage, createListMessage };
