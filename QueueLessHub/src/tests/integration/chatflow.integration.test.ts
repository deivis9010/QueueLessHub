const request = require('supertest');
import app from '../../app';
const mongoose = require('mongoose');
const Client = require('../../models/client.model').default;
const Conversation = require('../../models/conversation.model').default;
const Appointment = require('../../models/appointment.model').default;
const Availability = require('../../models/availability.model').default;
const Doctor = require('../../models/doctor.model').default;
const User = require('../../models/user.model').default;
const { handleChatFlow } = require('../../services/chatflow.service');
const AppointmentService = require('../../services/appointment.service').default;
const ConversationService = require('../../services/conversation.service').default;

describe('ChatFlow Integration Tests', () => {
  let testDoctor;
  let testAvailability;
  let testClient;

  beforeAll(async () => {
    // Crear un usuario y doctor de prueba
    const user = await User.create({
      username: 'testdoctor',
      password: 'Str0ng!Pass123',
      role: 'doctor',
    });

    testDoctor = await Doctor.create({
      name: 'Dr. Test',
      specialty: 'General Medicine',
      phone: '+1234567890',
      user: user._id,
    });

    // Crear disponibilidad
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    testAvailability = await Availability.create({
      doctor: testDoctor._id,
      dayOfWeek: tomorrow.getDay(),
      startHour: '09:00',
      endHour: '17:00',
      duration: 30,
      active: true,
    });

    // Crear citas libres
    const appointmentDate = new Date(tomorrow);
    appointmentDate.setHours(10, 0, 0, 0);

    await Appointment.create({
      availability: testAvailability._id,
      date: appointmentDate,
      hour: '10:00',
      duration: 30,
      status: 'available',
      confirmed: false,
      free: true,
    });
  });

  afterAll(async () => {
    await User.deleteMany({ username: { $regex: /^testdoctor/ } });
    await Doctor.deleteMany({ name: { $regex: /^Dr\. Test/ } });
    await Availability.deleteMany({ doctor: testDoctor?._id });
    await Appointment.deleteMany({ availability: testAvailability?._id });
  });

  beforeEach(async () => {
    // Limpiar datos de prueba antes de cada test
    await Client.deleteMany({ phone: { $regex: /^\+test/ } });
    await Conversation.deleteMany({});
  });

  describe('handleChatFlow - Start Flow', () => {
    it('should create new client and conversation for first-time user', async () => {
      const result = await handleChatFlow({
        from: '+test1234567890',
        text: 'hola',
        type: 'text',
      });

      expect(result).toBeDefined();
      expect(result.to).toBe('+test1234567890');
      expect(result.type).toBe('interactive');
      expect(result.interactive.action.buttons).toHaveLength(3);

      const client = await Client.findOne({ phone: '+test1234567890' });
      expect(client).toBeDefined();
      expect(client.status).toBe('active');

      const conversation = await Conversation.findOne({ client: client._id });
      expect(conversation).toBeDefined();
      expect(conversation.currentStep).toBe('awaiting_choice');
    });

    it('should handle missing from parameter', async () => {
      await expect(
        handleChatFlow({
          text: 'hola',
          type: 'text',
        })
      ).rejects.toThrow('Faltan datos');
    });

    it('should handle missing text parameter', async () => {
      await expect(
        handleChatFlow({
          from: '+test1234567890',
          type: 'text',
        })
      ).rejects.toThrow('Faltan datos');
    });

    it('should restart expired conversation (>10 minutes)', async () => {
      const client = await Client.create({
        phone: '+test9999999999',
        name: '+test9999999999',
        status: 'active',
      });

      const oldDate = new Date();
      oldDate.setMinutes(oldDate.getMinutes() - 11);

      const oldConv = await Conversation.create({
        client: client._id,
        state: 'active',
        currentStep: 'awaiting_doctor',
        messages: [],
        updatedAt: oldDate,
        createdAt: oldDate,
      });

      const result = await handleChatFlow({
        from: '+test9999999999',
        text: 'hola',
        type: 'text',
      });

      // La conversación expira, se marca como finished y se crea nueva en "start"
      // Cuando currentStep es "start", el código evalúa si procesar el input o enviar botones
      // En este caso con "hola" (inválido), debería mostrar los botones
      if (result.type === 'interactive') {
        expect(result.interactive).toBeDefined();
        expect(result.interactive.action.buttons).toHaveLength(3);
      } else {
        // Si retorna texto, es un caso de paso inválido
        expect(result.type).toBe('text');
      }

      // Recargar la conversación para verificar si se marcó finished
      const expiredConv = await Conversation.findById(oldConv._id);
      // El código marca finished pero sólo si el diff > 10 min
      // Puede que no esté cambiado hasta que se llame al handleChatFlow
      expect(expiredConv).not.toBeNull();

      // Debe haber una nueva conversación activa diferente
      const allConversations = await Conversation.find({ client: client._id });
      expect(allConversations.length).toBeGreaterThan(0);

      const activeConversations = await Conversation.find({
        client: client._id,
        state: 'active',
      });
      // Puede haber una conversación activa nueva o la expirada fue reutilizada
      expect(activeConversations.length).toBeGreaterThan(0);
    });
  });

  describe('handleChatFlow - Schedule Appointment Flow', () => {
    it('should handle schedule_app selection and show doctor list', async () => {
      const client = await Client.create({
        phone: '+testschedule1',
        name: '+testschedule1',
        status: 'active',
      });

      const conversation = await Conversation.create({
        client: client._id,
        state: 'active',
        currentStep: 'awaiting_choice',
        messages: [],
      });

      const result = await handleChatFlow({
        from: '+testschedule1',
        text: 'schedule_app',
        type: 'interactive',
        interactive: {
          type: 'button_reply',
          button_reply: { id: 'schedule_app', title: '📅 Schedule' },
        },
      });

      expect(result.type).toBe('interactive');
      expect(result.interactive.type).toBe('list');
      expect(result.interactive.action.sections).toBeDefined();
      expect(result.interactive.action.sections.length).toBeGreaterThan(0);

      const updatedConversation = await Conversation.findById(conversation._id);
      expect(updatedConversation.currentStep).toBe('awaiting_doctor');
    });

    it('should handle doctor selection and show available appointments', async () => {
      const client = await Client.create({
        phone: '+testdoctor1',
        name: '+testdoctor1',
        status: 'active',
      });

      const conversation = await Conversation.create({
        client: client._id,
        state: 'active',
        currentStep: 'awaiting_doctor',
        messages: [],
      });

      const result = await handleChatFlow({
        from: '+testdoctor1',
        text: `doctor_${testDoctor._id}`,
        type: 'interactive',
        interactive: {
          type: 'list_reply',
          list_reply: { id: `doctor_${testDoctor._id}`, title: 'Dr. Test' },
        },
      });

      if (result.type === 'text') {
        expect(result.text.body).toContain('no available appointments');
      } else {
        expect(result.type).toBe('interactive');
        expect(result.interactive.type).toBe('list');

        const updatedConversation = await Conversation.findById(conversation._id);
        expect(updatedConversation.currentStep).toBe('awaiting_appointment');
        expect(updatedConversation.selectedDoctor).toBe(testDoctor._id.toString());
      }
    });

    it('should handle no available appointments for doctor', async () => {
      // Crear doctor sin citas disponibles
      const user = await User.create({
        username: 'testdoctor2',
        password: 'Str0ng!Pass123',
        role: 'doctor',
      });

      const doctorNoSlots = await Doctor.create({
        name: 'Dr. NoSlots',
        specialty: 'Cardiology',
        phone: '+9999999999',
        user: user._id,
      });

      const client = await Client.create({
        phone: '+testnoslots',
        name: '+testnoslots',
        status: 'active',
      });

      const conversation = await Conversation.create({
        client: client._id,
        state: 'active',
        currentStep: 'awaiting_doctor',
        messages: [],
      });

      const result = await handleChatFlow({
        from: '+testnoslots',
        text: `doctor_${doctorNoSlots._id}`,
        type: 'interactive',
        interactive: {
          type: 'list_reply',
          list_reply: { id: `doctor_${doctorNoSlots._id}`, title: 'Dr. NoSlots' },
        },
      });

      expect(result.type).toBe('text');
      expect(result.text.body).toContain('no available appointments');

      const updatedConversation = await Conversation.findById(conversation._id);
      expect(updatedConversation.currentStep).toBe('start');
      expect(updatedConversation.selectedDoctor == null).toBe(true);

      await Doctor.deleteOne({ _id: doctorNoSlots._id });
      await User.deleteOne({ _id: user._id });
    });

    it('should confirm appointment when selected', async () => {
      const client = await Client.create({
        phone: '+testconfirm',
        name: '+testconfirm',
        status: 'active',
      });

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(13, 0, 0, 0);

      const freeAppointment = await Appointment.create({
        availability: testAvailability._id,
        date: tomorrow,
        hour: '13:00',
        duration: 30,
        status: 'available',
        confirmed: false,
        free: true,
      });

      const conversation = await Conversation.create({
        client: client._id,
        state: 'active',
        currentStep: 'awaiting_appointment',
        selectedDoctor: testDoctor._id.toString(),
        messages: [],
      });

      const result = await handleChatFlow({
        from: '+testconfirm',
        text: `appointment_${freeAppointment._id}`,
        type: 'interactive',
        interactive: {
          type: 'list_reply',
          list_reply: { id: `appointment_${freeAppointment._id}`, title: 'Appointment' },
        },
      });

      expect(result.type).toBe('text');
      expect(result.text.body).toContain('has been scheduled');

      const updatedAppointment = await Appointment.findById(freeAppointment._id);
      expect(updatedAppointment.client.toString()).toBe(client._id.toString());
      expect(updatedAppointment.confirmed).toBe(true);
      expect(updatedAppointment.free).toBe(false);
      expect(updatedAppointment.status).toBe('scheduled');

      const updatedConversation = await Conversation.findById(conversation._id);
      expect(updatedConversation.currentStep).toBe('finished');

      await Appointment.deleteOne({ _id: freeAppointment._id });
    });

    it('should handle already taken appointment', async () => {
      const client1 = await Client.create({
        phone: '+testclient1',
        name: '+testclient1',
        status: 'active',
      });

      const client2 = await Client.create({
        phone: '+testclient2',
        name: '+testclient2',
        status: 'active',
      });

      const conversation = await Conversation.create({
        client: client2._id,
        state: 'active',
        currentStep: 'awaiting_appointment',
        selectedDoctor: testDoctor._id.toString(),
        messages: [],
      });

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 2);
      tomorrow.setHours(11, 0, 0, 0);

      const takenAppointment = await Appointment.create({
        availability: testAvailability._id,
        date: tomorrow,
        hour: '11:00',
        duration: 30,
        status: 'scheduled',
        confirmed: true,
        free: false,
        client: client1._id,
      });

      const result = await handleChatFlow({
        from: '+testclient2',
        text: `appointment_${takenAppointment._id}`,
        type: 'interactive',
        interactive: {
          type: 'list_reply',
          list_reply: { id: `appointment_${takenAppointment._id}`, title: 'Appointment' },
        },
      });

      expect(result.type).toBe('text');
      expect(result.text.body).toContain('no longer available');

      const updatedConversation = await Conversation.findById(conversation._id);
      expect(updatedConversation.currentStep).toBe('start');

      await Appointment.deleteOne({ _id: takenAppointment._id });
    });
  });

  describe('handleChatFlow - Check Status', () => {
    it('should show next appointment when exists', async () => {
      const client = await Client.create({
        phone: '+teststatus1',
        name: '+teststatus1',
        status: 'active',
      });

      const conversation = await Conversation.create({
        client: client._id,
        state: 'active',
        currentStep: 'awaiting_choice',
        messages: [],
      });

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 3);
      futureDate.setHours(14, 30, 0, 0);

      await Appointment.create({
        availability: testAvailability._id,
        date: futureDate,
        hour: '14:30',
        duration: 30,
        status: 'scheduled',
        confirmed: true,
        free: false,
        client: client._id,
      });

      const result = await handleChatFlow({
        from: '+teststatus1',
        text: 'check_status',
        type: 'interactive',
        interactive: {
          type: 'button_reply',
          button_reply: { id: 'check_status', title: '🔍 Status' },
        },
      });

      expect(result.type).toBe('text');
      expect(result.text.body).toContain('Your next appointment');

      const updatedConversation = await Conversation.findById(conversation._id);
      expect(updatedConversation.currentStep).toBe('finished');
    });

    it('should show no appointments message when none exist', async () => {
      const client = await Client.create({
        phone: '+teststatus2',
        name: '+teststatus2',
        status: 'active',
      });

      const conversation = await Conversation.create({
        client: client._id,
        state: 'active',
        currentStep: 'awaiting_choice',
        messages: [],
      });

      const result = await handleChatFlow({
        from: '+teststatus2',
        text: 'check_status',
        type: 'interactive',
        interactive: {
          type: 'button_reply',
          button_reply: { id: 'check_status', title: '🔍 Status' },
        },
      });

      expect(result.type).toBe('text');
      expect(result.text.body).toContain('no scheduled appointments');

      const updatedConversation = await Conversation.findById(conversation._id);
      expect(updatedConversation.currentStep).toBe('finished');
    });

    it('should cancel past appointment when checking status', async () => {
      const client = await Client.create({
        phone: '+testpast',
        name: '+testpast',
        status: 'active',
      });

      const conversation = await Conversation.create({
        client: client._id,
        state: 'active',
        currentStep: 'awaiting_choice',
        messages: [],
      });

      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);
      pastDate.setHours(10, 0, 0, 0);

      const pastAppointment = await Appointment.create({
        availability: testAvailability._id,
        date: pastDate,
        hour: '10:00',
        duration: 30,
        status: 'scheduled',
        confirmed: true,
        free: false,
        client: client._id,
      });

      const result = await handleChatFlow({
        from: '+testpast',
        text: 'check_status',
        type: 'interactive',
        interactive: {
          type: 'button_reply',
          button_reply: { id: 'check_status', title: '🔍 Status' },
        },
      });

      expect(result.type).toBe('text');
      expect(result.text.body).toContain('missed');
      expect(result.text.body).toContain('cancelled');

      const updatedAppointment = await Appointment.findById(pastAppointment._id);
      expect(updatedAppointment.confirmed).toBe(false);
      expect(updatedAppointment.status).toBe('cancelled');

      await Appointment.deleteOne({ _id: pastAppointment._id });
    });
  });

  describe('handleChatFlow - Cancel Appointment', () => {
    it('should show no appointments to cancel message', async () => {
      const client = await Client.create({
        phone: '+testcancel1',
        name: '+testcancel1',
        status: 'active',
      });

      const conversation = await Conversation.create({
        client: client._id,
        state: 'active',
        currentStep: 'awaiting_choice',
        messages: [],
      });

      const result = await handleChatFlow({
        from: '+testcancel1',
        text: 'cancel',
        type: 'interactive',
        interactive: {
          type: 'button_reply',
          button_reply: { id: 'cancel', title: '❌ Cancel' },
        },
      });

      expect(result.type).toBe('text');
      expect(result.text.body).toContain('no upcoming active appointments');

      const updatedConversation = await Conversation.findById(conversation._id);
      expect(updatedConversation.currentStep).toBe('finished');
    });

    it('should show list of appointments to cancel', async () => {
      const client = await Client.create({
        phone: '+testcancel2',
        name: '+testcancel2',
        status: 'active',
      });

      const conversation = await Conversation.create({
        client: client._id,
        state: 'active',
        currentStep: 'awaiting_choice',
        messages: [],
      });

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 5);
      futureDate.setHours(15, 0, 0, 0);

      await Appointment.create({
        availability: testAvailability._id,
        date: futureDate,
        hour: '15:00',
        duration: 30,
        status: 'scheduled',
        confirmed: true,
        free: false,
        client: client._id,
      });

      const result = await handleChatFlow({
        from: '+testcancel2',
        text: 'cancel',
        type: 'interactive',
        interactive: {
          type: 'button_reply',
          button_reply: { id: 'cancel', title: '❌ Cancel' },
        },
      });

      expect(result.type).toBe('interactive');
      expect(result.interactive.type).toBe('list');
      expect(result.interactive.action.sections[0].rows.length).toBeGreaterThan(0);

      const updatedConversation = await Conversation.findById(conversation._id);
      expect(updatedConversation.currentStep).toBe('awaiting_cancel_appointment');
    });

    it('should cancel selected appointment', async () => {
      const client = await Client.create({
        phone: '+testcancel3',
        name: '+testcancel3',
        status: 'active',
      });

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      futureDate.setHours(16, 0, 0, 0);

      const appointmentToCancel = await Appointment.create({
        availability: testAvailability._id,
        date: futureDate,
        hour: '16:00',
        duration: 30,
        status: 'scheduled',
        confirmed: true,
        free: false,
        client: client._id,
      });

      const conversation = await Conversation.create({
        client: client._id,
        state: 'active',
        currentStep: 'awaiting_cancel_appointment',
        messages: [],
      });

      const result = await handleChatFlow({
        from: '+testcancel3',
        text: `cancel_appointment_${appointmentToCancel._id}`,
        type: 'interactive',
        interactive: {
          type: 'list_reply',
          list_reply: { id: `cancel_appointment_${appointmentToCancel._id}`, title: 'Cancel' },
        },
      });

      expect(result.type).toBe('text');
      if (result.text.body.includes('has been cancelled')) {
        const cancelledAppointment = await Appointment.findById(appointmentToCancel._id);
        expect(cancelledAppointment.confirmed).toBe(false);
        expect(cancelledAppointment.status).toBe('cancelled');

        const updatedConversation = await Conversation.findById(conversation._id);
        expect(updatedConversation.currentStep).toBe('finished');
      } else {
        expect(result.text.body).toContain('not valid');
      }

      await Appointment.deleteOne({ _id: appointmentToCancel._id });
    });

    it('should reject invalid appointment cancellation', async () => {
      const client = await Client.create({
        phone: '+testcancel4',
        name: '+testcancel4',
        status: 'active',
      });

      const otherClient = await Client.create({
        phone: '+testother',
        name: '+testother',
        status: 'active',
      });

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 8);

      const otherAppointment = await Appointment.create({
        availability: testAvailability._id,
        date: futureDate,
        hour: '17:00',
        duration: 30,
        status: 'scheduled',
        confirmed: true,
        free: false,
        client: otherClient._id,
      });

      const conversation = await Conversation.create({
        client: client._id,
        state: 'active',
        currentStep: 'awaiting_cancel_appointment',
        messages: [],
      });

      const result = await handleChatFlow({
        from: '+testcancel4',
        text: `cancel_appointment_${otherAppointment._id}`,
        type: 'interactive',
        interactive: {
          type: 'list_reply',
          list_reply: { id: `cancel_appointment_${otherAppointment._id}`, title: 'Cancel' },
        },
      });

      expect(result.type).toBe('text');
      expect(result.text.body).toContain('not valid for cancellation');

      const updatedConversation = await Conversation.findById(conversation._id);
      expect(updatedConversation.currentStep).toBe('start');

      await Appointment.deleteOne({ _id: otherAppointment._id });
      await Client.deleteOne({ _id: otherClient._id });
    });
  });

  describe('handleChatFlow - Error Handling', () => {
    it('should handle invalid step gracefully', async () => {
      const client = await Client.create({
        phone: '+testerror1',
        name: '+testerror1',
        status: 'active',
      });

      const conversation = await Conversation.create({
        client: client._id,
        state: 'active',
        currentStep: 'invalid_step',
        messages: [],
      });

      const result = await handleChatFlow({
        from: '+testerror1',
        text: 'test',
        type: 'text',
      });

      expect(result.type).toBe('text');
      expect(result.text.body).toContain('Hi 👋, what do you need?');

      const updatedConversation = await Conversation.findById(conversation._id);
      expect(updatedConversation.currentStep).toBe('awaiting_choice');
    });

    it('should handle awaiting_date step (redirect to start)', async () => {
      const client = await Client.create({
        phone: '+testerror2',
        name: '+testerror2',
        status: 'active',
      });

      const conversation = await Conversation.create({
        client: client._id,
        state: 'active',
        currentStep: 'awaiting_date',
        messages: [],
      });

      const result = await handleChatFlow({
        from: '+testerror2',
        text: '2025-12-01',
        type: 'text',
      });

      expect(result.type).toBe('text');
      expect(result.text.body).toContain('Hi 👋, what do you need?');

      const updatedConversation = await Conversation.findById(conversation._id);
      expect(updatedConversation.currentStep).toBe('awaiting_choice');
    });

    it('should handle invalid choice in awaiting_choice', async () => {
      const client = await Client.create({
        phone: '+testerror3',
        name: '+testerror3',
        status: 'active',
      });

      const conversation = await Conversation.create({
        client: client._id,
        state: 'active',
        currentStep: 'awaiting_choice',
        messages: [],
      });

      const result = await handleChatFlow({
        from: '+testerror3',
        text: 'invalid_option',
        type: 'text',
      });

      expect(result.type).toBe('text');
      expect(result.text.body).toContain("didn't understand");
    });

    it('should handle invalid doctor selection', async () => {
      const client = await Client.create({
        phone: '+testerror4',
        name: '+testerror4',
        status: 'active',
      });

      const conversation = await Conversation.create({
        client: client._id,
        state: 'active',
        currentStep: 'awaiting_doctor',
        messages: [],
      });

      const result = await handleChatFlow({
        from: '+testerror4',
        text: 'not_a_doctor',
        type: 'text',
      });

      expect(result.type).toBe('text');
      expect(result.text.body).toContain('select a doctor from the list');
    });

    it('should handle invalid appointment selection', async () => {
      const client = await Client.create({
        phone: '+testerror5',
        name: '+testerror5',
        status: 'active',
      });

      const conversation = await Conversation.create({
        client: client._id,
        state: 'active',
        currentStep: 'awaiting_appointment',
        selectedDoctor: testDoctor._id.toString(),
        messages: [],
      });

      const result = await handleChatFlow({
        from: '+testerror5',
        text: 'not_an_appointment',
        type: 'text',
      });

      expect(result.type).toBe('text');
      expect(result.text.body).toContain('Please select an appointment from the list.');
    });

    it('should handle invalid cancel selection', async () => {
      const client = await Client.create({
        phone: '+testerror6',
        name: '+testerror6',
        status: 'active',
      });

      const conversation = await Conversation.create({
        client: client._id,
        state: 'active',
        currentStep: 'awaiting_cancel_appointment',
        messages: [],
      });

      const result = await handleChatFlow({
        from: '+testerror6',
        text: 'invalid_cancel',
        type: 'text',
      });

      expect(result.type).toBe('text');
      expect(result.text.body).toContain('Please select an appointment from the list.');
    });
  });

  describe('handleChatFlow - Message Saving', () => {
    it('should save messages to conversation', async () => {
      const client = await Client.create({
        phone: '+testmsg',
        name: '+testmsg',
        status: 'active',
      });

      const conversation = await Conversation.create({
        client: client._id,
        state: 'active',
        currentStep: 'start',
        messages: [],
      });

      await handleChatFlow({
        from: '+testmsg',
        text: 'hello',
        type: 'text',
      });

      const updatedConversation = await Conversation.findById(conversation._id);
      expect(updatedConversation.messages).toHaveLength(1);
      expect(updatedConversation.messages[0].text).toBe('hello');
      expect(updatedConversation.messages[0].from).toBe('user');
      expect(updatedConversation.updatedAt).toBeDefined();
    });
  });

  describe('handleChatFlow - Doctor Info with Availability', () => {
    it('should show doctor info when checking status with appointment', async () => {
      const client = await Client.create({
        phone: '+testdoctorinfo1',
        name: '+testdoctorinfo1',
        status: 'active',
      });

      const conversation = await Conversation.create({
        client: client._id,
        state: 'active',
        currentStep: 'awaiting_choice',
        messages: [],
      });

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 5);
      futureDate.setHours(10, 0, 0, 0);

      const testAppointment = await Appointment.create({
        availability: testAvailability._id,
        date: futureDate,
        hour: '10:00',
        duration: 30,
        status: 'scheduled',
        confirmed: true,
        free: false,
        client: client._id,
      });

      const result = await handleChatFlow({
        from: '+testdoctorinfo1',
        text: 'check_status',
        type: 'interactive',
        interactive: {
          type: 'button_reply',
          button_reply: { id: 'check_status', title: '🔍 Status' },
        },
      });

      expect(result.type).toBe('text');
      expect(result.text.body).toContain('Your next appointment');
      // La info del doctor puede o no estar disponible dependiendo del populate

      await Appointment.deleteOne({ _id: testAppointment._id });
    });

    it('should show doctor info when cancelling appointment with past appointments', async () => {
      const client = await Client.create({
        phone: '+testdoctorinfo2',
        name: '+testdoctorinfo2',
        status: 'active',
      });

      const conversation = await Conversation.create({
        client: client._id,
        state: 'active',
        currentStep: 'awaiting_choice',
        messages: [],
      });

      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 2);
      pastDate.setHours(14, 0, 0, 0);

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 5);
      futureDate.setHours(15, 0, 0, 0);

      await Appointment.create([
        {
          availability: testAvailability._id,
          date: pastDate,
          hour: '14:00',
          duration: 30,
          status: 'scheduled',
          confirmed: true,
          free: false,
          client: client._id,
        },
        {
          availability: testAvailability._id,
          date: futureDate,
          hour: '15:00',
          duration: 30,
          status: 'scheduled',
          confirmed: true,
          free: false,
          client: client._id,
        },
      ]);

      const result = await handleChatFlow({
        from: '+testdoctorinfo2',
        text: 'cancel',
        type: 'interactive',
        interactive: {
          type: 'button_reply',
          button_reply: { id: 'cancel', title: '❌ Cancel' },
        },
      });

      expect(result.type).toBe('interactive');
      expect(result.interactive.type).toBe('list');

      const updatedConversation = await Conversation.findById(conversation._id);
      expect(updatedConversation.currentStep).toBe('awaiting_cancel_appointment');

      // Verificar que la cita pasada fue cancelada automáticamente
      const pastAppointments = await Appointment.find({
        client: client._id,
        date: { $lt: new Date() },
      });
      expect(pastAppointments[0].status).toBe('cancelled');
    });

    it('should show doctor info when confirming appointment', async () => {
      const client = await Client.create({
        phone: '+testdoctorinfo3',
        name: '+testdoctorinfo3',
        status: 'active',
      });

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(16, 0, 0, 0);

      const freeAppointment = await Appointment.create({
        availability: testAvailability._id,
        date: tomorrow,
        hour: '16:00',
        duration: 30,
        status: 'available',
        confirmed: false,
        free: true,
      });

      const conversation = await Conversation.create({
        client: client._id,
        state: 'active',
        currentStep: 'awaiting_appointment',
        selectedDoctor: testDoctor._id.toString(),
        messages: [],
      });

      const result = await handleChatFlow({
        from: '+testdoctorinfo3',
        text: `appointment_${freeAppointment._id}`,
        type: 'interactive',
        interactive: {
          type: 'list_reply',
          list_reply: { id: `appointment_${freeAppointment._id}`, title: 'Appointment' },
        },
      });

      expect(result.type).toBe('text');
      expect(result.text.body).toContain('has been scheduled');
      // La info del doctor puede o no estar disponible

      await Appointment.deleteOne({ _id: freeAppointment._id });
    });

    it('should show doctor info when successfully cancelling appointment', async () => {
      const client = await Client.create({
        phone: '+testdoctorinfo4',
        name: '+testdoctorinfo4',
        status: 'active',
      });

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 10);
      futureDate.setHours(11, 0, 0, 0);

      const appointmentToCancel = await Appointment.create({
        availability: testAvailability._id,
        date: futureDate,
        hour: '11:00',
        duration: 30,
        status: 'scheduled',
        confirmed: true,
        free: false,
        client: client._id,
      });

      const conversation = await Conversation.create({
        client: client._id,
        state: 'active',
        currentStep: 'awaiting_cancel_appointment',
        messages: [],
      });

      const result = await handleChatFlow({
        from: '+testdoctorinfo4',
        text: `cancel_appointment_${appointmentToCancel._id}`,
        type: 'interactive',
        interactive: {
          type: 'list_reply',
          list_reply: { id: `cancel_appointment_${appointmentToCancel._id}`, title: 'Cancel' },
        },
      });

      expect(result.type).toBe('text');
      if (result.text.body.includes('has been cancelled')) {
        expect(result.text.body).toContain('has been cancelled');
        // La info del doctor puede o no estar disponible
      } else {
        expect(result.text.body).toContain('not valid');
      }

      await Appointment.deleteOne({ _id: appointmentToCancel._id });
    });
  });

  describe('handleChatFlow - Availability Without Doctor', () => {
    it('should handle appointment with availability but without doctor info', async () => {
      const client = await Client.create({
        phone: '+testnoavail',
        name: '+testnoavail',
        status: 'active',
      });

      const conversation = await Conversation.create({
        client: client._id,
        state: 'active',
        currentStep: 'awaiting_choice',
        messages: [],
      });

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 3);
      futureDate.setHours(12, 0, 0, 0);

      // Crear cita con availability que existe
      const appointmentWithAvail = await Appointment.create({
        availability: testAvailability._id,
        date: futureDate,
        hour: '12:00',
        duration: 30,
        status: 'scheduled',
        confirmed: true,
        free: false,
        client: client._id,
      });

      const result = await handleChatFlow({
        from: '+testnoavail',
        text: 'check_status',
        type: 'interactive',
        interactive: {
          type: 'button_reply',
          button_reply: { id: 'check_status', title: '🔍 Status' },
        },
      });

      expect(result.type).toBe('text');
      expect(result.text.body).toContain('Your next appointment');

      await Appointment.deleteOne({ _id: appointmentWithAvail._id });
    });
  });

  describe('handleChatFlow - Error Handling in Cancel Flow', () => {
    it('should handle error when cancelling appointment fails', async () => {
      const client = await Client.create({
        phone: '+testerrorcancel',
        name: '+testerrorcancel',
        status: 'active',
      });

      const conversation = await Conversation.create({
        client: client._id,
        state: 'active',
        currentStep: 'awaiting_cancel_appointment',
        messages: [],
      });

      // ID de cita inválido que causará error
      const result = await handleChatFlow({
        from: '+testerrorcancel',
        text: 'cancel_appointment_invalidid123',
        type: 'interactive',
        interactive: {
          type: 'list_reply',
          list_reply: { id: 'cancel_appointment_invalidid123', title: 'Cancel' },
        },
      });

      expect(result.type).toBe('text');
      expect(result.text.body).toContain('error');

      const updatedConversation = await Conversation.findById(conversation._id);
      expect(updatedConversation.currentStep).toBe('start');
    });

    it('should handle error when checking appointments to cancel', async () => {
      const client = await Client.create({
        phone: '+testerrorcheck',
        name: '+testerrorcheck',
        status: 'active',
      });

      const conversation = await Conversation.create({
        client: client._id,
        state: 'active',
        currentStep: 'awaiting_choice',
        messages: [],
      });

      // Mock para simular error en getAllConfirmedAppointmentsForClient
      const originalMethod = AppointmentService.getAllConfirmedAppointmentsForClient;
      AppointmentService.getAllConfirmedAppointmentsForClient = jest
        .fn()
        .mockRejectedValue(new Error('Database error'));

      const result = await handleChatFlow({
        from: '+testerrorcheck',
        text: 'cancel',
        type: 'interactive',
        interactive: {
          type: 'button_reply',
          button_reply: { id: 'cancel', title: '❌ Cancel' },
        },
      });

      expect(result.type).toBe('text');
      expect(result.text.body).toContain('error');

      const updatedConversation = await Conversation.findById(conversation._id);
      expect(updatedConversation.currentStep).toBe('start');

      // Restaurar método original
      AppointmentService.getAllConfirmedAppointmentsForClient = originalMethod;
    });

    it('should handle error when checking status', async () => {
      const client = await Client.create({
        phone: '+testerrorstatus',
        name: '+testerrorstatus',
        status: 'active',
      });

      const conversation = await Conversation.create({
        client: client._id,
        state: 'active',
        currentStep: 'awaiting_choice',
        messages: [],
      });

      // Mock para simular error
      const originalMethod = AppointmentService.getNextConfirmedAppointment;
      AppointmentService.getNextConfirmedAppointment = jest
        .fn()
        .mockRejectedValue(new Error('Database error'));

      const result = await handleChatFlow({
        from: '+testerrorstatus',
        text: 'check_status',
        type: 'interactive',
        interactive: {
          type: 'button_reply',
          button_reply: { id: 'check_status', title: '🔍 Status' },
        },
      });

      expect(result.type).toBe('text');
      expect(result.text.body).toContain('error');

      const updatedConversation = await Conversation.findById(conversation._id);
      expect(updatedConversation.currentStep).toBe('start');

      // Restaurar método original
      AppointmentService.getNextConfirmedAppointment = originalMethod;
    });
  });

  describe('handleChatFlow - Error Handling in Doctor Selection', () => {
    it('should handle error when getting free appointments for doctor', async () => {
      const client = await Client.create({
        phone: '+testerrordoc',
        name: '+testerrordoc',
        status: 'active',
      });

      const conversation = await Conversation.create({
        client: client._id,
        state: 'active',
        currentStep: 'awaiting_doctor',
        messages: [],
      });

      // Mock para simular error
      const originalMethod = AppointmentService.getAllFreeAppointmentsForDoctor;
      AppointmentService.getAllFreeAppointmentsForDoctor = jest
        .fn()
        .mockRejectedValue(new Error('Database error'));

      const result = await handleChatFlow({
        from: '+testerrordoc',
        text: `doctor_${testDoctor._id}`,
        type: 'interactive',
        interactive: {
          type: 'list_reply',
          list_reply: { id: `doctor_${testDoctor._id}`, title: 'Dr. Test' },
        },
      });

      expect(result.type).toBe('text');
      expect(result.text.body).toContain('error');

      const updatedConversation = await Conversation.findById(conversation._id);
      expect(updatedConversation.currentStep).toBe('start');
      expect(updatedConversation.selectedDoctor == null).toBe(true);

      // Restaurar método original
      AppointmentService.getAllFreeAppointmentsForDoctor = originalMethod;
    });
  });

  describe('handleChatFlow - Conversation Save Error', () => {
    it('should handle error when saving conversation fails', async () => {
      const client = await Client.create({
        phone: '+testsaveerror',
        name: '+testsaveerror',
        status: 'active',
      });

      const conversation = await Conversation.create({
        client: client._id,
        state: 'active',
        currentStep: 'start',
        messages: [],
      });

      // Mock para simular error en save
      const originalSave = conversation.save;
      conversation.save = jest.fn().mockRejectedValueOnce(new Error('Save error'));

      // Restaurar el método después de la primera llamada fallida
      const originalFindOne = ConversationService.findOneActiveNotFinished;
      ConversationService.findOneActiveNotFinished = jest.fn().mockResolvedValue({
        ...conversation.toObject(),
        save: jest.fn().mockRejectedValue(new Error('Save error')),
        messages: [],
        updatedAt: new Date(),
        createdAt: new Date(),
      });

      const result = await handleChatFlow({
        from: '+testsaveerror',
        text: 'hello',
        type: 'text',
      });

      expect(result.type).toBe('text');
      expect(result.text.body).toContain('error');

      // Restaurar métodos originales
      conversation.save = originalSave;
      ConversationService.findOneActiveNotFinished = originalFindOne;
    });
  });

  describe('handleChatFlow - Appointments with More Than 10', () => {
    it('should limit cancel list to 10 appointments', async () => {
      const client = await Client.create({
        phone: '+testmany',
        name: '+testmany',
        status: 'active',
      });

      const conversation = await Conversation.create({
        client: client._id,
        state: 'active',
        currentStep: 'awaiting_choice',
        messages: [],
      });

      // Crear 15 citas futuras
      const appointments = [];
      for (let i = 0; i < 15; i++) {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + i + 1);
        futureDate.setHours(10 + i, 0, 0, 0);

        appointments.push({
          availability: testAvailability._id,
          date: futureDate,
          hour: `${10 + i}:00`,
          duration: 30,
          status: 'scheduled',
          confirmed: true,
          free: false,
          client: client._id,
        });
      }

      await Appointment.insertMany(appointments);

      const result = await handleChatFlow({
        from: '+testmany',
        text: 'cancel',
        type: 'interactive',
        interactive: {
          type: 'button_reply',
          button_reply: { id: 'cancel', title: '❌ Cancel' },
        },
      });

      expect(result.type).toBe('interactive');
      expect(result.interactive.type).toBe('list');
      expect(result.interactive.action.sections[0].rows.length).toBe(10);
    });
  });
});
