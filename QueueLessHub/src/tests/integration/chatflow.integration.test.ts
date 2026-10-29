import Appointment from '../../models/appointment.model';
import Availability from '../../models/availability.model';
import Client from '../../models/client.model';
import Conversation from '../../models/conversation.model';
import Doctor from '../../models/doctor.model';
import User from '../../models/user.model';
import { handleChatFlow } from '../../services/chatflow.service';

type ListPayload = { interactive: { body: { text: string }; action: { sections: Array<{ rows: Array<{ id: string }> }> } } };
type TextPayload = { text: { body: string } };
type AnyPayload = { type: string } & Partial<ListPayload & TextPayload>;

const bodyOf = (payload: unknown): string => {
  const candidate = payload as AnyPayload;
  return candidate.type === 'text' ? (candidate as TextPayload).text.body : (candidate as ListPayload).interactive.body.text;
};

const rowIdsOf = (payload: unknown): string[] =>
  ((payload as ListPayload).interactive.action.sections[0].rows ?? []).map((row) => row.id);

let messageSequence = 0;
let doctorSequence = 0;

const send = async (from: string, value: string) => {
  const reply = await handleChatFlow({ messageId: `wamid.integration-${++messageSequence}`, from, value });
  return reply?.payload ?? null;
};

/**
 * Creates a doctor with one free appointment two days ahead, at 10:00 AM (16:00 UTC).
 */
const createDoctorWithFreeSlot = async () => {
  doctorSequence += 1;
  const user = await User.create({
    username: `testdoctor${doctorSequence}`,
    password: 'Str0ng!Pass123',
    role: 'doctor',
  });

  const doctor = await Doctor.create({
    name: `Dr. Test ${doctorSequence}`,
    specialty: 'General Medicine',
    phone: `+1555000${String(doctorSequence).padStart(4, '0')}`,
    user: user._id,
  });

  const availability = await Availability.create({
    doctor: doctor._id,
    dayOfWeek: 1,
    startHour: '09:00',
    endHour: '17:00',
    duration: 30,
    active: true,
  });

  const date = new Date();
  date.setUTCDate(date.getUTCDate() + 2);
  date.setUTCHours(16, 0, 0, 0);

  const appointment = await Appointment.create({
    availability: availability._id,
    date,
    hour: '10:00',
    duration: 30,
    status: 'available',
    confirmed: false,
    free: true,
  });

  return { doctor, appointment };
};

describe('ChatFlow Integration Tests', () => {
  it('should start a conversation with the main menu on the first message', async () => {
    const payload = await send('+test1000000001', 'hola');

    expect(bodyOf(payload)).toContain('welcome');

    const client = await Client.findOne({ phone: '+test1000000001' });
    const conversation = await Conversation.findOne({ client: client?._id });
    expect(conversation?.state).toBe('active');
    expect(conversation?.currentStep).toBe('awaiting_choice');
    expect(conversation?.messages).toHaveLength(2);
  });

  it('should ignore a message that was already processed', async () => {
    const first = await handleChatFlow({ messageId: 'wamid.duplicate-1', from: '+test1000000002', value: 'hola' });
    const duplicate = await handleChatFlow({ messageId: 'wamid.duplicate-1', from: '+test1000000002', value: 'hola' });

    expect(first).not.toBeNull();
    expect(duplicate).toBeNull();

    const client = await Client.findOne({ phone: '+test1000000002' });
    const conversation = await Conversation.findOne({ client: client?._id });
    expect(conversation?.messages).toHaveLength(2);
  });

  it('should book a free slot end to end and close the conversation', async () => {
    const phone = '+test1000000003';
    const { doctor, appointment } = await createDoctorWithFreeSlot();

    await send(phone, 'hola');
    const doctorList = await send(phone, 'schedule_app');
    expect(rowIdsOf(doctorList)).toContain(`doctor_${doctor._id}`);

    const slotList = await send(phone, `doctor_${doctor._id}`);
    expect(rowIdsOf(slotList)).toContain(`appointment_${appointment._id}`);

    const confirmation = await send(phone, `appointment_${appointment._id}`);
    expect(bodyOf(confirmation)).toContain('confirmed');

    const booked = await Appointment.findById(appointment._id);
    const client = await Client.findOne({ phone });
    expect(booked?.confirmed).toBe(true);
    expect(booked?.free).toBe(false);
    expect(String(booked?.client)).toBe(String(client?._id));

    const conversation = await Conversation.findOne({ client: client?._id });
    expect(conversation?.state).toBe('closed');
    expect(conversation?.closedReason).toBe('completed');
  });

  it('should prevent double booking when a slot is taken before the second client confirms', async () => {
    const { doctor, appointment } = await createDoctorWithFreeSlot();
    const first = '+test1000000004';
    const second = '+test1000000005';

    // Both clients see the slot while it is still free.
    await send(second, 'hola');
    await send(second, 'schedule_app');
    await send(second, `doctor_${doctor._id}`);

    await send(first, 'hola');
    await send(first, 'schedule_app');
    await send(first, `doctor_${doctor._id}`);
    await send(first, `appointment_${appointment._id}`);

    const secondAttempt = await send(second, `appointment_${appointment._id}`);

    expect(bodyOf(secondAttempt)).toContain('no open time slots');

    const booked = await Appointment.findById(appointment._id);
    const firstClient = await Client.findOne({ phone: first });
    expect(String(booked?.client)).toBe(String(firstClient?._id));

    const secondClient = await Client.findOne({ phone: second });
    const secondConversation = await Conversation.findOne({ client: secondClient?._id, state: 'active' });
    expect(secondConversation).not.toBeNull();
  });

  it('should stay silent after the second invalid input and restart on the next message', async () => {
    const phone = '+test1000000006';

    await send(phone, 'hola');
    const reprompt = await send(phone, 'banana');
    expect(bodyOf(reprompt)).toContain('did not understand');

    const silence = await send(phone, 'banana');
    expect(silence).toBeNull();

    const client = await Client.findOne({ phone });
    const closed = await Conversation.findOne({ client: client?._id, state: 'closed' });
    expect(closed?.closedReason).toBe('invalid_input');

    const restart = await send(phone, 'hola');
    expect(bodyOf(restart)).toContain('welcome');
    expect(await Conversation.countDocuments({ client: client?._id })).toBe(2);
  });

  it('should close a timed-out conversation and start a new one', async () => {
    const phone = '+test1000000007';
    const { doctor } = await createDoctorWithFreeSlot();

    await send(phone, 'schedule_app');

    const client = await Client.findOne({ phone });
    const elevenMinutesAgo = new Date(Date.now() - 11 * 60 * 1000);
    // Raw driver update so that Mongoose timestamps do not overwrite updatedAt.
    await Conversation.collection.updateOne({ client: client?._id }, { $set: { updatedAt: elevenMinutesAgo } });

    const payload = await send(phone, `doctor_${doctor._id}`);

    expect(bodyOf(payload)).toContain('welcome');

    const timedOut = await Conversation.findOne({ client: client?._id, closedReason: 'timeout' });
    expect(timedOut?.state).toBe('closed');
  });

  it('should keep the conversation open with the next actions after a status check without appointments', async () => {
    const phone = '+test1000000008';

    await send(phone, 'hola');
    const status = await send(phone, 'check_status');
    expect(bodyOf(status)).toContain('You have no upcoming appointments.');
    expect(bodyOf(status)).toContain('What would you like to do?');
  });

  it('should list the reserved appointments with the doctor name when My appointment is chosen', async () => {
    const phone = '+test1000000010';
    const { doctor, appointment } = await createDoctorWithFreeSlot();

    await send(phone, 'hola');
    await send(phone, 'schedule_app');
    await send(phone, `doctor_${doctor._id}`);
    await send(phone, `appointment_${appointment._id}`);

    await send(phone, 'hola');
    const list = await send(phone, 'check_status');

    expect(rowIdsOf(list)).toEqual([`status_appt_${appointment._id}`, 'status_back']);
    expect((list as ListPayload).interactive.action.sections[0].rows[0]).toMatchObject({
      description: expect.stringContaining(doctor.name),
    });
  });

  it('should end the chat from the cancel choice and restart on the next message', async () => {
    const phone = '+test1000000009';

    await send(phone, 'hola');
    const choice = await send(phone, 'cancel');
    expect(bodyOf(choice)).toContain('What would you like to do?');

    const finished = await send(phone, 'cancel_action_finish');
    expect(bodyOf(finished)).toContain('Chat finished');

    const restarted = await send(phone, 'hola');
    expect(bodyOf(restarted)).toContain('welcome');
  });
});
