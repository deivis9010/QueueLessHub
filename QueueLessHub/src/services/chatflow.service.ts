import type { ConversationCloseReason, ConversationMessage } from '../types/conversation.types';
import type {
  ChatFlowInput,
  ChatFlowReply,
  WhatsAppButton,
  WhatsAppInteractiveMessage,
  WhatsAppPayload,
  WhatsAppRow,
  WhatsAppTextMessage,
} from '../types/whatsapp.types';

import AppointmentService from './appointment.service';
import ClientService from './client.service';
import ConversationService, { type ConversationAdvance } from './conversation.service';
import ProcessedMessageService from './processed-message.service';

export const TIME_ZONE = 'America/Merida';
export const CONVERSATION_TIMEOUT_MS = 10 * 60 * 1000;
export const MAX_INVALID_INPUTS = 1;

const MAX_LIST_ROWS = 10;
const ROW_TITLE_MAX = 24;
const ROW_DESCRIPTION_MAX = 72;
const OBJECT_ID_PATTERN = /^[a-f\d]{24}$/i;

const DOCTOR_PREFIX = 'doctor_';
const NO_SLOTS_DOCTOR_PREFIX = 'nodoc_';
const SLOT_PREFIX = 'appointment_';
const CANCEL_PREFIX = 'cancel_';
const CANCEL_EXIT_ID = 'cancel_exit';
const CANCEL_ACTION_APPOINTMENT_ID = 'cancel_action_appointment';
const CANCEL_ACTION_FINISH_ID = 'cancel_action_finish';
const CANCEL_ACTION_BACK_ID = 'cancel_action_back';
const STATUS_FINISH_ID = 'status_finish';
const STATUS_BACK_ID = 'status_back';
const STATUS_APPOINTMENT_PREFIX = 'status_appt_';
const FLOW_CANCEL_ID = 'flow_cancel';
const FLOW_CANCEL_KEYWORD = 'cancelar';

const WELCOME_TEXT = 'Hi, welcome to QueueLess. What would you like to do?';
const INVALID_INPUT_TEXT = 'Sorry, I did not understand that. Please choose one of the options below.';
const CANCELLED_TEXT = 'Request cancelled. Send any message to start again.';
const SYSTEM_ERROR_TEXT = 'Something went wrong on our side. Please send any message to start again.';

const MAIN_MENU_BUTTONS: WhatsAppButton[] = [
  { id: 'schedule_app', title: 'Schedule' },
  { id: 'check_status', title: 'My appointment' },
  { id: 'cancel', title: 'Cancel' },
];

export const FLOW_STEPS = [
  'start',
  'awaiting_choice',
  'awaiting_doctor',
  'awaiting_appointment',
  'awaiting_cancel_action',
  'awaiting_cancel_appointment',
  'awaiting_status_list',
] as const;

export type FlowStep = (typeof FLOW_STEPS)[number];

export interface DoctorOption {
  id: string;
  name: string;
  specialty?: string;
  freeSlotCount: number;
}

export interface SlotOption {
  id: string;
  date: Date;
}

export interface AppointmentDetails {
  date: Date;
  doctorName: string;
  specialty?: string;
}

export interface UpcomingAppointment extends AppointmentDetails {
  id: string;
}

/**
 * Data access used by the flow. Kept as an interface so the transitions can be tested without a database.
 */
export interface FlowDeps {
  getDoctorsWithAvailability(): Promise<DoctorOption[]>;
  getFreeSlots(doctorId: string): Promise<SlotOption[]>;
  bookSlot(slotId: string, clientId: string): Promise<AppointmentDetails | null>;
  getUpcomingAppointmentDetails(clientId: string): Promise<UpcomingAppointment[]>;
  getUpcomingAppointments(clientId: string): Promise<SlotOption[]>;
  cancelAppointment(appointmentId: string, clientId: string): Promise<SlotOption | null>;
  cancelPastAppointments(clientId: string): Promise<number>;
}

export interface ConversationSnapshot {
  id: string;
  clientId: string;
  currentStep: FlowStep;
  selectedDoctor: string | null;
  retryCount: number;
  version: number;
  updatedAt?: Date;
}

export interface FlowInput {
  to: string;
  value: string;
}

export interface FlowResult {
  payload: WhatsAppPayload | null;
  step: FlowStep;
  selectedDoctor: string | null;
  retryCount: number;
  closeReason?: ConversationCloseReason;
}

interface Outcome {
  payload: WhatsAppPayload | null;
  step: FlowStep;
  selectedDoctor: string | null;
  closeReason?: ConversationCloseReason;
  invalid?: boolean;
}

interface Context {
  to: string;
  clientId: string;
  deps: FlowDeps;
}

interface AppointmentRecord {
  _id: unknown;
  date: Date | string;
}

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: TIME_ZONE,
  weekday: 'short',
  month: 'short',
  day: 'numeric',
});

const timeFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: TIME_ZONE,
  hour: 'numeric',
  minute: '2-digit',
});

/**
 * Formats a slot for list rows, e.g. "Thu, Oct 22 10:00 AM".
 */
export const formatSlotTitle = (date: Date): string =>
  `${dateFormatter.format(date)} ${timeFormatter.format(date)}`;

/**
 * Formats an appointment for messages, e.g. "Thu, Oct 22 at 10:00 AM".
 */
export const formatAppointmentDate = (date: Date): string =>
  `${dateFormatter.format(date)} at ${timeFormatter.format(date)}`;

const truncate = (text: string, max: number): string =>
  text.length <= max ? text : `${text.slice(0, max - 3)}...`;

const describeDoctor = (name: string, specialty?: string): string =>
  specialty ? `${name} (${specialty})` : name;

const parseId = (value: string, prefix: string): string | null => {
  if (!value.startsWith(prefix)) {
    return null;
  }
  const id = value.slice(prefix.length);
  return OBJECT_ID_PATTERN.test(id) ? id : null;
};

const isCancelInput = (value: string): boolean =>
  value === FLOW_CANCEL_ID || value.trim().toLowerCase() === FLOW_CANCEL_KEYWORD;

const isExpired = (updatedAt?: Date | null): boolean =>
  !!updatedAt && Date.now() - new Date(updatedAt).getTime() > CONVERSATION_TIMEOUT_MS;

export const createTextMessage = (to: string, text: string): WhatsAppTextMessage => ({
  messaging_product: 'whatsapp',
  recipient_type: 'individual',
  to,
  type: 'text',
  text: { body: text },
});

export const createReplyButtonsMessage = (
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

export const createListMessage = (
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

const toResult = (outcome: Outcome, retryCount: number): FlowResult => ({
  payload: outcome.payload,
  step: outcome.step,
  selectedDoctor: outcome.selectedDoctor,
  retryCount,
  closeReason: outcome.closeReason,
});

const menu = (ctx: Context, text: string): Outcome => ({
  payload: createReplyButtonsMessage(ctx.to, text, MAIN_MENU_BUTTONS),
  step: 'awaiting_choice',
  selectedDoctor: null,
});

const closeWith = (ctx: Context, text: string, reason: ConversationCloseReason): Outcome => ({
  payload: createTextMessage(ctx.to, text),
  step: 'start',
  selectedDoctor: null,
  closeReason: reason,
});

const invalid = (): Outcome => ({
  payload: null,
  step: 'start',
  selectedDoctor: null,
  invalid: true,
});

const cancelRow = (): WhatsAppRow => ({
  id: FLOW_CANCEL_ID,
  title: 'Cancel',
  description: 'End this request',
});

const doctorRow = (doctor: DoctorOption): WhatsAppRow => {
  const label = doctor.specialty ?? 'Doctor';
  if (doctor.freeSlotCount === 0) {
    return {
      id: `${NO_SLOTS_DOCTOR_PREFIX}${doctor.id}`,
      title: truncate(doctor.name, ROW_TITLE_MAX),
      description: truncate(`${label} - No open slots`, ROW_DESCRIPTION_MAX),
    };
  }
  return {
    id: `${DOCTOR_PREFIX}${doctor.id}`,
    title: truncate(doctor.name, ROW_TITLE_MAX),
    description: truncate(`${label} - ${doctor.freeSlotCount} open slots`, ROW_DESCRIPTION_MAX),
  };
};

const showDoctors = async (ctx: Context, text: string): Promise<Outcome> => {
  const doctors = await ctx.deps.getDoctorsWithAvailability();

  if (doctors.length === 0) {
    return closeWith(ctx, 'There are no doctors available at the moment. Please try again later.', 'completed');
  }

  // Doctors with open slots come first so they are not cut off by the row limit.
  const sorted = [...doctors].sort((a, b) => Number(b.freeSlotCount > 0) - Number(a.freeSlotCount > 0));
  // One row is reserved for the cancel option.
  const rows: WhatsAppRow[] = [...sorted.slice(0, MAX_LIST_ROWS - 1).map(doctorRow), cancelRow()];

  return {
    payload: createListMessage(ctx.to, text, 'Doctors', rows),
    step: 'awaiting_doctor',
    selectedDoctor: null,
  };
};

const showSlots = async (ctx: Context, doctorId: string | null, text: string): Promise<Outcome> => {
  if (!doctorId) {
    return showDoctors(ctx, text);
  }

  const slots = (await ctx.deps.getFreeSlots(doctorId)).slice(0, MAX_LIST_ROWS);

  if (slots.length === 0) {
    return showDoctors(ctx, 'This doctor has no open time slots. Please choose another doctor:');
  }

  // One row is reserved for the cancel option.
  const rows: WhatsAppRow[] = [
    ...slots.slice(0, MAX_LIST_ROWS - 1).map((slot) => ({
      id: `${SLOT_PREFIX}${slot.id}`,
      title: formatSlotTitle(slot.date),
      description: 'Open slot',
    })),
    cancelRow(),
  ];

  return {
    payload: createListMessage(ctx.to, text, 'Time slots', rows),
    step: 'awaiting_appointment',
    selectedDoctor: doctorId,
  };
};

const showCancelList = async (ctx: Context, text: string): Promise<Outcome> => {
  const appointments = await ctx.deps.getUpcomingAppointments(ctx.clientId);

  if (appointments.length === 0) {
    return closeWith(ctx, 'You have no upcoming appointments to cancel.', 'completed');
  }

  // One row is reserved for the back option.
  const rows: WhatsAppRow[] = appointments.slice(0, MAX_LIST_ROWS - 1).map((appointment) => ({
    id: `${CANCEL_PREFIX}${appointment.id}`,
    title: formatSlotTitle(appointment.date),
    description: 'Tap to cancel this appointment',
  }));
  rows.push({ id: CANCEL_EXIT_ID, title: 'Back', description: 'Return to the main menu' });

  return {
    payload: createListMessage(ctx.to, text, 'Appointments', rows),
    step: 'awaiting_cancel_appointment',
    selectedDoctor: null,
  };
};

const STATUS_MENU_BUTTONS: WhatsAppButton[] = [
  { id: 'schedule_app', title: 'Schedule' },
  { id: 'cancel', title: 'Cancel' },
  { id: STATUS_FINISH_ID, title: 'End chat' },
];

const statusMenu = (ctx: Context, text: string): Outcome => ({
  payload: createReplyButtonsMessage(ctx.to, text, STATUS_MENU_BUTTONS),
  step: 'awaiting_choice',
  selectedDoctor: null,
});

const showStatusList = async (ctx: Context, text: string): Promise<Outcome> => {
  const appointments = await ctx.deps.getUpcomingAppointmentDetails(ctx.clientId);

  if (appointments.length === 0) {
    return statusMenu(ctx, 'You have no upcoming appointments.\n\nWhat would you like to do?');
  }

  // One row is reserved for the back option.
  const rows: WhatsAppRow[] = appointments.slice(0, MAX_LIST_ROWS - 1).map((appointment) => ({
    id: `${STATUS_APPOINTMENT_PREFIX}${appointment.id}`,
    title: formatSlotTitle(appointment.date),
    description: truncate(describeDoctor(appointment.doctorName, appointment.specialty), ROW_DESCRIPTION_MAX),
  }));
  rows.push({ id: STATUS_BACK_ID, title: 'Back', description: 'Return to the main menu' });

  return {
    payload: createListMessage(ctx.to, text, 'Appointments', rows),
    step: 'awaiting_status_list',
    selectedDoctor: null,
  };
};

const checkStatus = async (ctx: Context): Promise<Outcome> => {
  await ctx.deps.cancelPastAppointments(ctx.clientId);
  return showStatusList(ctx, 'These are your upcoming appointments:');
};

const chooseStatusItem = async (value: string, ctx: Context): Promise<Outcome> => {
  if (value === STATUS_BACK_ID) {
    return menu(ctx, 'What would you like to do?');
  }

  const appointmentId = parseId(value, STATUS_APPOINTMENT_PREFIX);
  if (!appointmentId) {
    return invalid();
  }

  const appointments = await ctx.deps.getUpcomingAppointmentDetails(ctx.clientId);
  const selected = appointments.find((appointment) => appointment.id === appointmentId);
  if (!selected) {
    return showStatusList(ctx, 'That appointment is no longer available. Here are your upcoming appointments:');
  }

  return statusMenu(
    ctx,
    `Your appointment is on ${formatAppointmentDate(selected.date)} with ${describeDoctor(selected.doctorName, selected.specialty)}.\n\nWhat would you like to do?`
  );
};

const chooseMenuOption = async (value: string, ctx: Context): Promise<Outcome> => {
  switch (value) {
    case 'schedule_app':
      return showDoctors(ctx, 'Please choose a doctor:');
    case 'check_status':
      return checkStatus(ctx);
    case 'cancel':
      await ctx.deps.cancelPastAppointments(ctx.clientId);
      return showCancelActions(ctx, 'What would you like to do?');
    case STATUS_FINISH_ID:
      return closeWith(ctx, 'Chat finished. Send any message to start again.', 'completed');
    default:
      return invalid();
  }
};

const showCancelActions = (ctx: Context, text: string): Outcome => ({
  payload: createReplyButtonsMessage(ctx.to, text, [
    { id: CANCEL_ACTION_APPOINTMENT_ID, title: 'Cancel appointment' },
    { id: CANCEL_ACTION_FINISH_ID, title: 'End chat' },
    { id: CANCEL_ACTION_BACK_ID, title: 'Back' },
  ]),
  step: 'awaiting_cancel_action',
  selectedDoctor: null,
});

const chooseCancelAction = async (value: string, ctx: Context): Promise<Outcome> => {
  switch (value) {
    case CANCEL_ACTION_APPOINTMENT_ID:
      return showCancelList(ctx, 'Which appointment would you like to cancel?');
    case CANCEL_ACTION_FINISH_ID:
      return closeWith(ctx, 'Chat finished. Send any message to start again.', 'completed');
    case CANCEL_ACTION_BACK_ID:
      return menu(ctx, 'What would you like to do?');
    default:
      return invalid();
  }
};

const chooseDoctor = async (value: string, ctx: Context): Promise<Outcome> => {
  if (value.startsWith(NO_SLOTS_DOCTOR_PREFIX)) {
    return showDoctors(ctx, 'That doctor has no open slots. Please choose another doctor:');
  }

  const doctorId = parseId(value, DOCTOR_PREFIX);
  if (!doctorId) {
    return invalid();
  }
  return showSlots(ctx, doctorId, 'Choose a time slot:');
};

const chooseSlot = async (value: string, selectedDoctor: string | null, ctx: Context): Promise<Outcome> => {
  const slotId = parseId(value, SLOT_PREFIX);
  if (!slotId) {
    return invalid();
  }

  const booked = await ctx.deps.bookSlot(slotId, ctx.clientId);

  if (!booked) {
    return showSlots(ctx, selectedDoctor, 'That time slot is no longer available. Please choose another one:');
  }

  return closeWith(
    ctx,
    `Your appointment is confirmed for ${formatAppointmentDate(booked.date)} with ${describeDoctor(booked.doctorName, booked.specialty)}. See you then!`,
    'completed'
  );
};

const chooseAppointmentToCancel = async (value: string, ctx: Context): Promise<Outcome> => {
  if (value === CANCEL_EXIT_ID) {
    return menu(ctx, 'What would you like to do?');
  }

  const appointmentId = parseId(value, CANCEL_PREFIX);
  if (!appointmentId) {
    return invalid();
  }

  const cancelled = await ctx.deps.cancelAppointment(appointmentId, ctx.clientId);

  if (!cancelled) {
    return showCancelList(ctx, 'That appointment could not be cancelled. Please choose one from the list:');
  }

  return closeWith(
    ctx,
    `Your appointment on ${formatAppointmentDate(cancelled.date)} has been cancelled.`,
    'completed'
  );
};

const transition = async (snapshot: ConversationSnapshot, value: string, ctx: Context): Promise<Outcome> => {
  switch (snapshot.currentStep) {
    case 'awaiting_choice':
      return chooseMenuOption(value, ctx);
    case 'awaiting_doctor':
      return chooseDoctor(value, ctx);
    case 'awaiting_appointment':
      return chooseSlot(value, snapshot.selectedDoctor, ctx);
    case 'awaiting_cancel_action':
      return chooseCancelAction(value, ctx);
    case 'awaiting_cancel_appointment':
      return chooseAppointmentToCancel(value, ctx);
    case 'awaiting_status_list':
      return chooseStatusItem(value, ctx);
    default:
      return invalid();
  }
};

const promptFor = async (
  snapshot: ConversationSnapshot,
  ctx: Context,
  text: string
): Promise<Outcome> => {
  switch (snapshot.currentStep) {
    case 'awaiting_doctor':
      return showDoctors(ctx, text);
    case 'awaiting_appointment':
      return showSlots(ctx, snapshot.selectedDoctor, text);
    case 'awaiting_cancel_action':
      return showCancelActions(ctx, text);
    case 'awaiting_cancel_appointment':
      return showCancelList(ctx, text);
    case 'awaiting_status_list':
      return showStatusList(ctx, text);
    default:
      return menu(ctx, text);
  }
};

/**
 * Pure transition function: computes the reply and the next state for one inbound message.
 * After one invalid input the flow closes silently, so the bot does not keep repeating itself.
 */
export const nextStep = async (
  snapshot: ConversationSnapshot,
  input: FlowInput,
  deps: FlowDeps
): Promise<FlowResult> => {
  const ctx: Context = { to: input.to, clientId: snapshot.clientId, deps };

  if (snapshot.currentStep === 'start') {
    return toResult(menu(ctx, WELCOME_TEXT), 0);
  }

  if (isCancelInput(input.value)) {
    return toResult(closeWith(ctx, CANCELLED_TEXT, 'cancelled'), 0);
  }

  const outcome = await transition(snapshot, input.value, ctx);
  if (!outcome.invalid) {
    return toResult(outcome, 0);
  }

  if (snapshot.retryCount >= MAX_INVALID_INPUTS) {
    return {
      payload: null,
      step: 'start',
      selectedDoctor: null,
      retryCount: 0,
      closeReason: 'invalid_input',
    };
  }

  const reprompt = await promptFor(snapshot, ctx, INVALID_INPUT_TEXT);
  return toResult(reprompt, snapshot.retryCount + 1);
};

const summarizePayload = (payload: WhatsAppPayload): string => {
  if (payload.type === 'text') {
    return payload.text.body;
  }
  if (payload.type === 'interactive') {
    return payload.interactive.body.text;
  }
  return `template:${payload.template.name}`;
};

const toStep = (value: unknown): FlowStep =>
  FLOW_STEPS.find((step) => step === value) ?? 'start';

const toSnapshot = (doc: unknown, clientId: string): ConversationSnapshot => {
  const record = doc as {
    _id: unknown;
    currentStep?: unknown;
    selectedDoctor?: string | null;
    retryCount?: number;
    version?: number;
    updatedAt?: Date;
  };

  return {
    id: String(record._id),
    clientId,
    currentStep: toStep(record.currentStep),
    selectedDoctor: record.selectedDoctor ?? null,
    retryCount: record.retryCount ?? 0,
    version: record.version ?? 0,
    updatedAt: record.updatedAt,
  };
};

const readDoctor = (appointment: unknown): { doctorName: string; specialty?: string } => {
  const populated = appointment as {
    availability?: { doctor?: { name?: unknown; specialty?: unknown } | null } | null;
  };
  const doctor = populated.availability?.doctor;

  return {
    doctorName: typeof doctor?.name === 'string' ? doctor.name : 'your doctor',
    specialty: typeof doctor?.specialty === 'string' ? doctor.specialty : undefined,
  };
};

const flowDeps: FlowDeps = {
  getDoctorsWithAvailability: async () => {
    const doctors = await AppointmentService.getDoctorsWithFreeSlots();
    return doctors.map((doctor) => ({
      id: doctor.id,
      name: doctor.name,
      specialty: doctor.specialty,
      freeSlotCount: doctor.freeSlots.length,
    }));
  },

  getFreeSlots: async (doctorId) => {
    const slots: AppointmentRecord[] = await AppointmentService.getAllFreeAppointmentsForDoctor(doctorId);
    const seen = new Set<number>();
    // Skip duplicate rows that share the same start time so each time slot is listed once.
    return slots
      .map((slot) => ({ id: String(slot._id), date: new Date(slot.date) }))
      .filter((slot) => {
        const time = slot.date.getTime();
        if (seen.has(time)) {
          return false;
        }
        seen.add(time);
        return true;
      });
  },

  bookSlot: async (slotId, clientId) => {
    const booked = await AppointmentService.claimFreeAppointment(slotId, clientId);
    if (!booked) {
      return null;
    }
    return { date: new Date(booked.date), ...readDoctor(booked) };
  },

  getUpcomingAppointmentDetails: async (clientId) => {
    const appointments = await AppointmentService.getAllConfirmedAppointmentsForClient(clientId);
    return appointments.map((appointment) => ({
      id: String(appointment._id),
      date: new Date(appointment.date),
      ...readDoctor(appointment),
    }));
  },

  getUpcomingAppointments: async (clientId) => {
    const appointments: AppointmentRecord[] = await AppointmentService.getAllConfirmedAppointmentsForClient(clientId);
    return appointments.map((appointment) => ({
      id: String(appointment._id),
      date: new Date(appointment.date),
    }));
  },

  cancelAppointment: async (appointmentId, clientId) => {
    const cancelled = await AppointmentService.cancelOwnedAppointment(appointmentId, clientId);
    if (!cancelled) {
      return null;
    }
    return { id: String(cancelled._id), date: new Date(cancelled.date) };
  },

  cancelPastAppointments: (clientId) => AppointmentService.cancelPastAppointments(clientId),
};

const findOrCreateClient = async (phone: string): Promise<string> => {
  const existing = await ClientService.findByPhone(phone);
  if (existing) {
    return String(existing._id);
  }

  try {
    const created = await ClientService.create({ phone, name: phone, status: 'active' });
    return String(created._id);
  } catch (error) {
    // Another webhook delivery may have created the same client concurrently.
    const retried = await ClientService.findByPhone(phone);
    if (retried) {
      return String(retried._id);
    }
    throw error;
  }
};

/**
 * Processes one inbound WhatsApp message and returns the reply to send, or null when nothing should be sent.
 * The reply carries the conversation id so an undelivered reply can be retried or close its conversation.
 */
export const handleChatFlow = async ({ messageId, from, value }: ChatFlowInput): Promise<ChatFlowReply | null> => {
  if (messageId && !(await ProcessedMessageService.claim(messageId))) {
    console.log(`Duplicate WhatsApp message ignored: ${messageId}`);
    return null;
  }

  const clientId = await findOrCreateClient(from);

  let conversation = await ConversationService.findActiveByClient(clientId);
  if (conversation && isExpired(conversation.updatedAt)) {
    await ConversationService.closeConversation(String(conversation._id), 'timeout');
    conversation = null;
  }

  const current =
    conversation ??
    (await ConversationService.create({
      client: clientId,
      state: 'active',
      currentStep: 'start',
      selectedDoctor: null,
      retryCount: 0,
      version: 0,
      messages: [],
    }));
  const snapshot = toSnapshot(current, clientId);

  try {
    const result = await nextStep(snapshot, { to: from, value }, flowDeps);

    const now = new Date();
    const messages: ConversationMessage[] = [{ from: 'user', text: value, timestamp: now }];
    if (result.payload) {
      messages.push({ from: 'bot', text: summarizePayload(result.payload), timestamp: now });
    }

    const closing = result.closeReason
      ? { state: 'closed' as const, closedReason: result.closeReason, closedAt: now }
      : {};

    const update: ConversationAdvance = {
      currentStep: result.step,
      selectedDoctor: result.selectedDoctor,
      retryCount: result.retryCount,
      messages,
      ...closing,
    };

    const saved = await ConversationService.advance(snapshot.id, snapshot.version, update);
    if (!saved) {
      console.warn(`Conversation ${snapshot.id} changed concurrently; reply skipped`);
      return null;
    }

    if (!result.payload) {
      return null;
    }
    return { conversationId: snapshot.id, payload: result.payload };
  } catch (error) {
    console.error('Chat flow error:', error instanceof Error ? error.message : error);

    try {
      await ConversationService.closeConversation(snapshot.id, 'error');
    } catch (closeError) {
      console.error('Failed to close conversation after error:', closeError instanceof Error ? closeError.message : closeError);
    }

    return { conversationId: snapshot.id, payload: createTextMessage(from, SYSTEM_ERROR_TEXT) };
  }
};
