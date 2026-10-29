import type { ConversationSnapshot, FlowDeps } from '../../services/chatflow.service';
import {
  CONVERSATION_TIMEOUT_MS,
  MAX_INVALID_INPUTS,
  formatAppointmentDate,
  formatSlotTitle,
  nextStep,
} from '../../services/chatflow.service';

const CLIENT_ID = '64b000000000000000000001';
const DOCTOR_ID = '64b000000000000000000002';
const SLOT_ID = '64b000000000000000000003';
const APPOINTMENT_ID = '64b000000000000000000004';
// 16:00 UTC is 10:00 AM in America/Merida (UTC-6, no DST). Thursday, October 23, 2025.
const SLOT_DATE = new Date('2025-10-23T16:00:00Z');

type TextPayload = { type: 'text'; text: { body: string } };
type InteractivePayloadShape = {
  type: 'interactive';
  interactive: {
    type: string;
    body: { text: string };
    action: {
      buttons?: Array<{ reply: { id: string } }>;
      sections?: Array<{ rows: Array<{ id: string; title: string; description?: string }> }>;
    };
  };
};

const bodyOf = (payload: unknown): string => {
  const candidate = payload as TextPayload | InteractivePayloadShape;
  return candidate.type === 'text' ? candidate.text.body : candidate.interactive.body.text;
};

const rowsOf = (payload: unknown) => (payload as InteractivePayloadShape).interactive.action.sections?.[0].rows ?? [];

const buttonIdsOf = (payload: unknown): string[] =>
  ((payload as InteractivePayloadShape).interactive.action.buttons ?? []).map((button) => button.reply.id);

const makeDeps = (overrides: Partial<FlowDeps> = {}): FlowDeps => ({
  getDoctorsWithAvailability: jest.fn().mockResolvedValue([]),
  getFreeSlots: jest.fn().mockResolvedValue([]),
  bookSlot: jest.fn().mockResolvedValue(null),
  getUpcomingAppointmentDetails: jest.fn().mockResolvedValue([]),
  getUpcomingAppointments: jest.fn().mockResolvedValue([]),
  cancelAppointment: jest.fn().mockResolvedValue(null),
  cancelPastAppointments: jest.fn().mockResolvedValue(0),
  ...overrides,
});

const makeSnapshot = (overrides: Partial<ConversationSnapshot> = {}): ConversationSnapshot => ({
  id: 'conversation-1',
  clientId: CLIENT_ID,
  currentStep: 'awaiting_choice',
  selectedDoctor: null,
  retryCount: 0,
  version: 0,
  ...overrides,
});

const input = (value: string) => ({ to: '+1234567890', value });

describe('chat flow transitions', () => {
  describe('start and main menu', () => {
    it('should send the main menu for a new conversation without touching the database', async () => {
      const deps = makeDeps();

      const result = await nextStep(makeSnapshot({ currentStep: 'start' }), input('hola'), deps);

      expect(result.step).toBe('awaiting_choice');
      expect(result.closeReason).toBeUndefined();
      expect(result.payload).not.toBeNull();
      expect(bodyOf(result.payload)).toContain('welcome');
      expect(deps.getDoctorsWithAvailability).not.toHaveBeenCalled();
    });

    it('should show the doctor list when the client chooses to schedule', async () => {
      const deps = makeDeps({
        getDoctorsWithAvailability: jest.fn().mockResolvedValue([{ id: DOCTOR_ID, name: 'Dr. Test', specialty: 'General', freeSlotCount: 2 }]),
      });

      const result = await nextStep(makeSnapshot(), input('schedule_app'), deps);

      expect(result.step).toBe('awaiting_doctor');
      expect(result.closeReason).toBeUndefined();
      expect(rowsOf(result.payload)).toEqual([
        { id: `doctor_${DOCTOR_ID}`, title: 'Dr. Test', description: 'General - 2 open slots' },
        { id: 'flow_cancel', title: 'Cancel', description: 'End this request' },
      ]);
    });

    it('should close the conversation when there are no doctors', async () => {
      const deps = makeDeps({ getDoctorsWithAvailability: jest.fn().mockResolvedValue([]) });

      const result = await nextStep(makeSnapshot(), input('schedule_app'), deps);

      expect(result.closeReason).toBe('completed');
      expect(result.step).toBe('start');
      expect(bodyOf(result.payload)).toContain('no doctors available');
    });

    it('should limit the doctor list to 10 rows', async () => {
      const doctors = Array.from({ length: 12 }, (_, index) => ({
        id: `64b0000000000000000001${String(index).padStart(2, '0')}`,
        name: `Dr. ${index}`,
        freeSlotCount: 1,
      }));
      const deps = makeDeps({ getDoctorsWithAvailability: jest.fn().mockResolvedValue(doctors) });

      const result = await nextStep(makeSnapshot(), input('schedule_app'), deps);

      expect(rowsOf(result.payload)).toHaveLength(10);
    });

    it('should truncate long doctor names to the WhatsApp row title limit', async () => {
      const deps = makeDeps({
        getDoctorsWithAvailability: jest.fn().mockResolvedValue([{ id: DOCTOR_ID, name: 'Dr. Extremely Long Name That Keeps Going', freeSlotCount: 1 }]),
      });

      const result = await nextStep(makeSnapshot(), input('schedule_app'), deps);

      expect(rowsOf(result.payload)[0].title.length).toBeLessThanOrEqual(24);
    });
  });

  describe('scheduling', () => {
    it('should show the free time slots of the chosen doctor', async () => {
      const deps = makeDeps({
        getFreeSlots: jest.fn().mockResolvedValue([{ id: SLOT_ID, date: SLOT_DATE }]),
      });

      const result = await nextStep(makeSnapshot({ currentStep: 'awaiting_doctor' }), input(`doctor_${DOCTOR_ID}`), deps);

      expect(deps.getFreeSlots).toHaveBeenCalledWith(DOCTOR_ID);
      expect(result.step).toBe('awaiting_appointment');
      expect(result.selectedDoctor).toBe(DOCTOR_ID);
      expect(rowsOf(result.payload)[0].id).toBe(`appointment_${SLOT_ID}`);
      expect(rowsOf(result.payload)[0].title).toMatch(/^Thu, Oct 23 10:00\sAM$/);
    });

    it('should go back to the doctor list when the doctor has no free slots', async () => {
      const deps = makeDeps({
        getDoctorsWithAvailability: jest.fn().mockResolvedValue([{ id: DOCTOR_ID, name: 'Dr. Test', freeSlotCount: 0 }]),
      });

      const result = await nextStep(makeSnapshot({ currentStep: 'awaiting_doctor' }), input(`doctor_${DOCTOR_ID}`), deps);

      expect(result.step).toBe('awaiting_doctor');
      expect(bodyOf(result.payload)).toContain('no open time slots');
    });

    it('should confirm the booking and close the conversation', async () => {
      const deps = makeDeps({
        bookSlot: jest.fn().mockResolvedValue({ date: SLOT_DATE, doctorName: 'Dr. Test', specialty: 'General' }),
      });

      const result = await nextStep(
        makeSnapshot({ currentStep: 'awaiting_appointment', selectedDoctor: DOCTOR_ID }),
        input(`appointment_${SLOT_ID}`),
        deps
      );

      expect(deps.bookSlot).toHaveBeenCalledWith(SLOT_ID, CLIENT_ID);
      expect(result.closeReason).toBe('completed');
      expect(bodyOf(result.payload)).toContain('confirmed');
      expect(bodyOf(result.payload)).toMatch(/Thu, Oct 23 at 10:00\sAM with/);
    });

    it('should show fresh slots when the chosen slot was taken by someone else', async () => {
      const deps = makeDeps({
        bookSlot: jest.fn().mockResolvedValue(null),
        getFreeSlots: jest.fn().mockResolvedValue([{ id: APPOINTMENT_ID, date: SLOT_DATE }]),
      });

      const result = await nextStep(
        makeSnapshot({ currentStep: 'awaiting_appointment', selectedDoctor: DOCTOR_ID }),
        input(`appointment_${SLOT_ID}`),
        deps
      );

      expect(result.closeReason).toBeUndefined();
      expect(result.step).toBe('awaiting_appointment');
      expect(bodyOf(result.payload)).toContain('no longer available');
      expect(deps.getFreeSlots).toHaveBeenCalledWith(DOCTOR_ID);
    });
  });

  describe('status and cancellation', () => {
    it('should list the reserved appointments with doctor details and a back row', async () => {
      const deps = makeDeps({
        getUpcomingAppointmentDetails: jest
          .fn()
          .mockResolvedValue([{ id: APPOINTMENT_ID, date: SLOT_DATE, doctorName: 'Dr. Test', specialty: 'General' }]),
      });

      const result = await nextStep(makeSnapshot(), input('check_status'), deps);

      expect(deps.cancelPastAppointments).toHaveBeenCalledWith(CLIENT_ID);
      expect(result.closeReason).toBeUndefined();
      expect(result.step).toBe('awaiting_status_list');
      const rows = rowsOf(result.payload);
      expect(rows[0].id).toBe(`status_appt_${APPOINTMENT_ID}`);
      expect(rows[0].title).toBe(formatSlotTitle(SLOT_DATE));
      expect(rows[0].description).toBe('Dr. Test (General)');
      expect(rows[rows.length - 1].id).toBe('status_back');
    });

    it('should report when there are no upcoming appointments and offer the next actions', async () => {
      const deps = makeDeps();

      const result = await nextStep(makeSnapshot(), input('check_status'), deps);

      expect(result.closeReason).toBeUndefined();
      expect(result.step).toBe('awaiting_choice');
      expect(bodyOf(result.payload)).toContain('You have no upcoming appointments.');
      expect(buttonIdsOf(result.payload)).toEqual(['schedule_app', 'cancel', 'status_finish']);
    });

    it('should return to the main menu when Back is chosen from the appointments list', async () => {
      const deps = makeDeps();

      const result = await nextStep(makeSnapshot({ currentStep: 'awaiting_status_list' }), input('status_back'), deps);

      expect(result.step).toBe('awaiting_choice');
      expect(buttonIdsOf(result.payload)).toEqual(['schedule_app', 'check_status', 'cancel']);
    });

    it('should show the appointment detail and the next actions when a listed appointment is chosen', async () => {
      const deps = makeDeps({
        getUpcomingAppointmentDetails: jest
          .fn()
          .mockResolvedValue([{ id: APPOINTMENT_ID, date: SLOT_DATE, doctorName: 'Dr. Test' }]),
      });

      const result = await nextStep(
        makeSnapshot({ currentStep: 'awaiting_status_list' }),
        input(`status_appt_${APPOINTMENT_ID}`),
        deps
      );

      expect(result.step).toBe('awaiting_choice');
      expect(bodyOf(result.payload)).toMatch(/Thu, Oct 23 at 10:00\sAM with Dr\. Test/);
      expect(buttonIdsOf(result.payload)).toEqual(['schedule_app', 'cancel', 'status_finish']);
    });

    it('should refresh the list when the chosen appointment no longer exists', async () => {
      const deps = makeDeps();

      const result = await nextStep(
        makeSnapshot({ currentStep: 'awaiting_status_list' }),
        input(`status_appt_${APPOINTMENT_ID}`),
        deps
      );

      expect(bodyOf(result.payload)).toContain('You have no upcoming appointments.');
    });

    it('should re-prompt the appointments list on invalid input', async () => {
      const deps = makeDeps({
        getUpcomingAppointmentDetails: jest
          .fn()
          .mockResolvedValue([{ id: APPOINTMENT_ID, date: SLOT_DATE, doctorName: 'Dr. Test' }]),
      });

      const result = await nextStep(makeSnapshot({ currentStep: 'awaiting_status_list' }), input('???'), deps);

      expect(result.step).toBe('awaiting_status_list');
      expect(result.retryCount).toBe(1);
    });

    it('should end the chat when the client picks End chat after the status check', async () => {
      const deps = makeDeps();

      const result = await nextStep(makeSnapshot({ currentStep: 'awaiting_choice' }), input('status_finish'), deps);

      expect(result.closeReason).toBe('completed');
      expect(result.step).toBe('start');
      expect(bodyOf(result.payload)).toContain('Chat finished');
    });

    it('should ask whether to cancel an appointment or end the chat when Cancel is chosen', async () => {
      const deps = makeDeps({
        getUpcomingAppointments: jest.fn().mockResolvedValue([{ id: APPOINTMENT_ID, date: SLOT_DATE }]),
      });

      const result = await nextStep(makeSnapshot(), input('cancel'), deps);

      expect(deps.cancelPastAppointments).toHaveBeenCalledWith(CLIENT_ID);
      expect(result.step).toBe('awaiting_cancel_action');
      expect(result.closeReason).toBeUndefined();
      expect(buttonIdsOf(result.payload)).toEqual(['cancel_action_appointment', 'cancel_action_finish', 'cancel_action_back']);
      expect(deps.getUpcomingAppointments).not.toHaveBeenCalled();
    });

    it('should list upcoming appointments with a back option when Cancel appointment is chosen', async () => {
      const deps = makeDeps({
        getUpcomingAppointments: jest.fn().mockResolvedValue([{ id: APPOINTMENT_ID, date: SLOT_DATE }]),
      });

      const result = await nextStep(
        makeSnapshot({ currentStep: 'awaiting_cancel_action' }),
        input('cancel_action_appointment'),
        deps
      );

      expect(result.step).toBe('awaiting_cancel_appointment');
      const rows = rowsOf(result.payload);
      expect(rows[0].id).toBe(`cancel_${APPOINTMENT_ID}`);
      expect(rows[rows.length - 1].id).toBe('cancel_exit');
      expect(rows.some((row) => row.id === 'cancel_finish')).toBe(false);
      expect(rows.length).toBeLessThanOrEqual(10);
    });

    it('should close the conversation when Cancel appointment is chosen and there is nothing to cancel', async () => {
      const deps = makeDeps();

      const result = await nextStep(
        makeSnapshot({ currentStep: 'awaiting_cancel_action' }),
        input('cancel_action_appointment'),
        deps
      );

      expect(result.closeReason).toBe('completed');
      expect(bodyOf(result.payload)).toContain('no upcoming appointments to cancel');
    });

    it('should end the chat when the client picks End chat from the cancel choice', async () => {
      const deps = makeDeps();

      const result = await nextStep(
        makeSnapshot({ currentStep: 'awaiting_cancel_action' }),
        input('cancel_action_finish'),
        deps
      );

      expect(result.closeReason).toBe('completed');
      expect(result.step).toBe('start');
      expect(bodyOf(result.payload)).toContain('Chat finished');
      expect(deps.cancelAppointment).not.toHaveBeenCalled();
    });

    it('should return to the main menu when the client picks Back from the cancel choice', async () => {
      const deps = makeDeps();

      const result = await nextStep(
        makeSnapshot({ currentStep: 'awaiting_cancel_action' }),
        input('cancel_action_back'),
        deps
      );

      expect(result.step).toBe('awaiting_choice');
      expect(result.closeReason).toBeUndefined();
    });

    it('should count an unknown cancel choice as invalid input', async () => {
      const deps = makeDeps();

      const result = await nextStep(makeSnapshot({ currentStep: 'awaiting_cancel_action' }), input('xyz'), deps);

      expect(result.step).toBe('awaiting_cancel_action');
      expect(result.closeReason).toBeUndefined();
    });

    it('should cancel the chosen appointment and close the conversation', async () => {
      const deps = makeDeps({
        cancelAppointment: jest.fn().mockResolvedValue({ id: APPOINTMENT_ID, date: SLOT_DATE }),
      });

      const result = await nextStep(
        makeSnapshot({ currentStep: 'awaiting_cancel_appointment' }),
        input(`cancel_${APPOINTMENT_ID}`),
        deps
      );

      expect(deps.cancelAppointment).toHaveBeenCalledWith(APPOINTMENT_ID, CLIENT_ID);
      expect(result.closeReason).toBe('completed');
      expect(bodyOf(result.payload)).toContain('has been cancelled');
    });

    it('should show the list again when the appointment cannot be cancelled', async () => {
      const deps = makeDeps({
        getUpcomingAppointments: jest.fn().mockResolvedValue([{ id: APPOINTMENT_ID, date: SLOT_DATE }]),
        cancelAppointment: jest.fn().mockResolvedValue(null),
      });

      const result = await nextStep(
        makeSnapshot({ currentStep: 'awaiting_cancel_appointment' }),
        input(`cancel_${APPOINTMENT_ID}`),
        deps
      );

      expect(result.closeReason).toBeUndefined();
      expect(result.step).toBe('awaiting_cancel_appointment');
      expect(bodyOf(result.payload)).toContain('could not be cancelled');
    });

    it('should return to the main menu when the client picks Back', async () => {
      const deps = makeDeps();

      const result = await nextStep(
        makeSnapshot({ currentStep: 'awaiting_cancel_appointment' }),
        input('cancel_exit'),
        deps
      );

      expect(result.step).toBe('awaiting_choice');
      expect(result.closeReason).toBeUndefined();
      expect(deps.cancelAppointment).not.toHaveBeenCalled();
    });
  });

  describe('invalid input', () => {
    it('should re-prompt once after an invalid input', async () => {
      const deps = makeDeps();

      const result = await nextStep(makeSnapshot(), input('banana'), deps);

      expect(result.payload).not.toBeNull();
      expect(bodyOf(result.payload)).toContain('did not understand');
      expect(result.retryCount).toBe(1);
      expect(result.step).toBe('awaiting_choice');
      expect(result.closeReason).toBeUndefined();
    });

    it('should stay silent and close the conversation after the second invalid input', async () => {
      const deps = makeDeps();

      const result = await nextStep(makeSnapshot({ retryCount: MAX_INVALID_INPUTS }), input('banana'), deps);

      expect(result.payload).toBeNull();
      expect(result.closeReason).toBe('invalid_input');
      expect(result.step).toBe('start');
      expect(result.retryCount).toBe(0);
    });

    it('should reject a doctor id with the wrong format', async () => {
      const deps = makeDeps({ getDoctorsWithAvailability: jest.fn().mockResolvedValue([{ id: DOCTOR_ID, name: 'Dr. Test', freeSlotCount: 1 }]) });

      const result = await nextStep(makeSnapshot({ currentStep: 'awaiting_doctor' }), input('doctor_not-an-id'), deps);

      expect(deps.getFreeSlots).not.toHaveBeenCalled();
      expect(result.retryCount).toBe(1);
      expect(result.step).toBe('awaiting_doctor');
    });

    it('should treat a stale menu tap inside another step as invalid', async () => {
      const deps = makeDeps();

      const result = await nextStep(makeSnapshot({ currentStep: 'awaiting_doctor' }), input('schedule_app'), deps);

      expect(result.retryCount).toBe(1);
      expect(deps.getDoctorsWithAvailability).toHaveBeenCalled();
    });
  });

  describe('doctor availability and cancellation', () => {
    const EMPTY_DOCTOR_ID = '64b000000000000000000005';

    it('should show the open slot count next to each doctor and end the list with a cancel row', async () => {
      const deps = makeDeps({
        getDoctorsWithAvailability: jest.fn().mockResolvedValue([
          { id: DOCTOR_ID, name: 'Dr. Test', specialty: 'General', freeSlotCount: 3 },
        ]),
      });

      const result = await nextStep(makeSnapshot(), input('schedule_app'), deps);

      expect(rowsOf(result.payload)).toEqual([
        { id: `doctor_${DOCTOR_ID}`, title: 'Dr. Test', description: 'General - 3 open slots' },
        { id: 'flow_cancel', title: 'Cancel', description: 'End this request' },
      ]);
    });

    it('should mark doctors without open slots as not selectable and list them after doctors with slots', async () => {
      const deps = makeDeps({
        getDoctorsWithAvailability: jest.fn().mockResolvedValue([
          { id: EMPTY_DOCTOR_ID, name: 'Dr. Empty', specialty: 'Dermatology', freeSlotCount: 0 },
          { id: DOCTOR_ID, name: 'Dr. Test', specialty: 'General', freeSlotCount: 1 },
        ]),
      });

      const result = await nextStep(makeSnapshot(), input('schedule_app'), deps);

      expect(rowsOf(result.payload).map((row) => row.id)).toEqual([
        `doctor_${DOCTOR_ID}`,
        `nodoc_${EMPTY_DOCTOR_ID}`,
        'flow_cancel',
      ]);
      expect(rowsOf(result.payload)[1].description).toBe('Dermatology - No open slots');
    });

    it('should keep the doctor list open when a doctor without slots is tapped', async () => {
      const deps = makeDeps({
        getDoctorsWithAvailability: jest.fn().mockResolvedValue([
          { id: EMPTY_DOCTOR_ID, name: 'Dr. Empty', freeSlotCount: 0 },
        ]),
      });

      const result = await nextStep(
        makeSnapshot({ currentStep: 'awaiting_doctor' }),
        input(`nodoc_${EMPTY_DOCTOR_ID}`),
        deps
      );

      expect(deps.getFreeSlots).not.toHaveBeenCalled();
      expect(result.step).toBe('awaiting_doctor');
      expect(result.retryCount).toBe(0);
      expect(result.closeReason).toBeUndefined();
      expect(bodyOf(result.payload)).toContain('no open slots');
    });

    it('should add a cancel row to the time slot list', async () => {
      const deps = makeDeps({
        getFreeSlots: jest.fn().mockResolvedValue([{ id: SLOT_ID, date: SLOT_DATE }]),
      });

      const result = await nextStep(makeSnapshot({ currentStep: 'awaiting_doctor' }), input(`doctor_${DOCTOR_ID}`), deps);

      const rows = rowsOf(result.payload);
      expect(rows[rows.length - 1].id).toBe('flow_cancel');
    });

    it.each(['awaiting_choice', 'awaiting_doctor', 'awaiting_appointment', 'awaiting_cancel_action', 'awaiting_cancel_appointment', 'awaiting_status_list'] as const)(
      'should close the conversation as cancelled from %s when the client types cancelar',
      async (step) => {
        const deps = makeDeps();

        const result = await nextStep(
          makeSnapshot({ currentStep: step, selectedDoctor: DOCTOR_ID }),
          input(' Cancelar '),
          deps
        );

        expect(result.closeReason).toBe('cancelled');
        expect(result.step).toBe('start');
        expect(result.selectedDoctor).toBeNull();
        expect(bodyOf(result.payload)).toContain('cancelled');
        expect(deps.bookSlot).not.toHaveBeenCalled();
      }
    );

    it('should close the conversation as cancelled when the client taps the cancel row', async () => {
      const deps = makeDeps();

      const result = await nextStep(makeSnapshot({ currentStep: 'awaiting_doctor' }), input('flow_cancel'), deps);

      expect(result.closeReason).toBe('cancelled');
      expect(result.retryCount).toBe(0);
    });

    it('should not count cancelar as an invalid input', async () => {
      const deps = makeDeps();

      const result = await nextStep(
        makeSnapshot({ currentStep: 'awaiting_doctor', retryCount: MAX_INVALID_INPUTS }),
        input('cancelar'),
        deps
      );

      expect(result.closeReason).toBe('cancelled');
      expect(result.closeReason).not.toBe('invalid_input');
    });
  });

  describe('time formatting', () => {
    it('should format the slot title in America/Merida time', () => {
      expect(formatSlotTitle(SLOT_DATE)).toMatch(/^Thu, Oct 23 10:00\sAM$/);
      expect(formatSlotTitle(new Date('2025-10-23T09:30:00Z'))).toMatch(/^Thu, Oct 23 3:30\sAM$/);
    });

    it('should format appointment dates without a time zone label', () => {
      expect(formatAppointmentDate(SLOT_DATE)).toMatch(/^Thu, Oct 23 at 10:00\sAM$/);
    });

    it('should expose a timeout of 10 minutes', () => {
      expect(CONVERSATION_TIMEOUT_MS).toBe(10 * 60 * 1000);
    });
  });
});
