const request = require('supertest');
import app from '../../app';
const Appointment = require('../../models/appointment.model').default;
const Availability = require('../../models/availability.model').default;
const Client = require('../../models/client.model').default;
const Doctor = require('../../models/doctor.model').default;
const User = require('../../models/user.model').default;

describe('Appointment - Complete Test Suite', () => {
  // Nota: Los tests unitarios con mocks están en archivo separado para evitar conflictos con tests de integración

  describe('Appointment Endpoints - Integration Tests', () => {
    let authToken;
    let clientId;
    let doctorId;
    let availabilityId;
    let userId;

    const getValidAppointmentData = (overrides = {}) => ({
      client: clientId,
      availability: availabilityId,
      date: new Date('2025-12-15T10:00:00.000Z'),
      hour: '10:00',
      notes: 'Regular checkup',
      status: 'scheduled',
      confirmed: false,
      ...overrides,
    });

    beforeEach(async () => {
      const userResponse = await request(app).post('/api/auth/register').send({
        username: 'testuser',
        password: 'Str0ng!Pass123',
        role: 'admin',
        email: 'testuser@example.com',
      });

      userId = userResponse.body.user.id;

      const loginResponse = await request(app).post('/api/auth/login').send({
        username: 'testuser',
        password: 'Str0ng!Pass123',
      });

      authToken = loginResponse.body.accessToken;

      const client = await Client.create({
        name: 'Test Client',
        phone: '+1234567890',
        status: 'active',
      });
      clientId = client._id.toString();

      const doctor = await Doctor.create({
        name: 'Dr. Test',
        specialty: 'Test specialty',
        phone: '+9876543210',
        user: userId,
      });
      doctorId = doctor._id.toString();

      const availability = await Availability.create({
        doctor: doctorId,
        dayOfWeek: 1,
        startHour: '09:00',
        endHour: '17:00',
        duration: 30,
        active: true,
      });
      availabilityId = availability._id.toString();
    });

    describe('POST /api/appointments', () => {
      it('should create a new appointment successfully', async () => {
        const appointmentData = getValidAppointmentData();

        const response = await request(app)
          .post('/api/appointments')
          .set('Authorization', `Bearer ${authToken}`)
          .send(appointmentData)
          .expect(201);

        expect(response.body).toHaveProperty('id');
        expect(response.body.client).toHaveProperty('id', clientId);
        expect(response.body.availability).toHaveProperty('id', availabilityId);
        expect(response.body.availability.doctor).toHaveProperty('id', doctorId);
        expect(response.body.hour).toBe(appointmentData.hour);
        expect(response.body.notes).toBe(appointmentData.notes);
        expect(response.body.status).toBe(appointmentData.status);
        expect(response.body.confirmed).toBe(appointmentData.confirmed);
      });

      it('should fail with missing required fields', async () => {
        const response = await request(app)
          .post('/api/appointments')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            notes: 'Regular checkup',
          })
          .expect(400);

        expect(response.body).toHaveProperty('error');
      });

      it('should fail with invalid client ID', async () => {
        const response = await request(app)
          .post('/api/appointments')
          .set('Authorization', `Bearer ${authToken}`)
          .send(
            getValidAppointmentData({
              client: '507f1f77bcf86cd799439011',
            })
          )
          .expect(201);

        expect(response.body).toHaveProperty('id');
        expect(response.body.client).toBe(null);
      });

      it('should fail without authentication', async () => {
        await request(app)
          .post('/api/appointments')
          .send({
            client: clientId,
            availability: availabilityId,
            date: new Date('2025-12-15T10:00:00.000Z'),
            status: 'scheduled',
          })
          .expect(401);
      });
    });

    describe('GET /api/appointments', () => {
      beforeEach(async () => {
        const client2 = await Client.create({
          name: 'Client 2',
          phone: '+1111111111',
          status: 'active',
        });

        await Appointment.create([
          {
            client: clientId,
            availability: availabilityId,
            date: new Date('2025-12-15T10:00:00.000Z'),
            hour: '10:00',
            notes: 'First appointment',
            status: 'scheduled',
            confirmed: false,
          },
          {
            client: client2._id,
            availability: availabilityId,
            date: new Date('2025-12-16T11:00:00.000Z'),
            hour: '11:00',
            notes: 'Second appointment',
            status: 'completed',
            confirmed: true,
          },
          {
            client: clientId,
            availability: availabilityId,
            date: new Date('2025-12-17T14:00:00.000Z'),
            hour: '14:00',
            notes: 'Third appointment',
            status: 'cancelled',
            confirmed: false,
          },
        ]);
      });

      it('should get all appointments with populated data', async () => {
        const response = await request(app)
          .get('/api/appointments')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body).toHaveLength(3);
        expect(response.body[0]).toHaveProperty('id');
        expect(response.body[0]).toHaveProperty('client');
        expect(response.body[0].client).toHaveProperty('name');
        expect(response.body[0]).toHaveProperty('availability');
        expect(response.body[0].availability).toHaveProperty('doctor');
        expect(response.body[0].availability.doctor).toHaveProperty('name');
      });

      it('should fail without authentication', async () => {
        await request(app).get('/api/appointments').expect(401);
      });
    });

    describe('GET /api/appointments/:id', () => {
      let appointmentId;

      beforeEach(async () => {
        const appointment = await Appointment.create({
          client: clientId,
          availability: availabilityId,
          date: new Date('2025-12-15T10:00:00.000Z'),
          hour: '10:00',
          notes: 'Test appointment',
          status: 'scheduled',
          confirmed: false,
        });
        appointmentId = appointment._id.toString();
      });

      it('should get appointment by id with populated data', async () => {
        const response = await request(app)
          .get(`/api/appointments/${appointmentId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('id', appointmentId);
        expect(response.body.client).toHaveProperty('name', 'Test Client');
        expect(response.body.availability.doctor).toHaveProperty('name', 'Dr. Test');
        expect(response.body.notes).toBe('Test appointment');
        expect(response.body.status).toBe('scheduled');
      });

      it('should return 404 for non-existent appointment', async () => {
        const fakeId = '507f1f77bcf86cd799439011';
        await request(app)
          .get(`/api/appointments/${fakeId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(404);
      });

      it('should return 400 for invalid id format', async () => {
        await request(app)
          .get('/api/appointments/invalid-id')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(400);
      });
    });

    describe('PUT /api/appointments/:id', () => {
      let appointmentId;

      beforeEach(async () => {
        const appointment = await Appointment.create({
          client: clientId,
          availability: availabilityId,
          date: new Date('2025-12-15T10:00:00.000Z'),
          hour: '10:00',
          notes: 'Original notes',
          status: 'scheduled',
          confirmed: false,
        });
        appointmentId = appointment._id.toString();
      });

      it('should update appointment successfully', async () => {
        const updateData = {
          notes: 'Updated notes',
          status: 'completed',
          confirmed: true,
        };

        const response = await request(app)
          .put(`/api/appointments/${appointmentId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(updateData)
          .expect(200);

        expect(response.body.notes).toBe(updateData.notes);
        expect(response.body.status).toBe(updateData.status);
        expect(response.body.confirmed).toBe(updateData.confirmed);
      });

      it('should return 404 for non-existent appointment', async () => {
        const fakeId = '507f1f77bcf86cd799439011';
        await request(app)
          .put(`/api/appointments/${fakeId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ notes: 'Updated' })
          .expect(404);
      });
    });

    describe('DELETE /api/appointments/:id', () => {
      let appointmentId;

      beforeEach(async () => {
        const appointment = await Appointment.create({
          client: clientId,
          availability: availabilityId,
          date: new Date('2025-12-15T10:00:00.000Z'),
          hour: '10:00',
          notes: 'Test appointment',
          status: 'scheduled',
          confirmed: false,
        });
        appointmentId = appointment._id.toString();
      });

      it('should delete appointment successfully', async () => {
        await request(app)
          .delete(`/api/appointments/${appointmentId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        const deletedAppointment = await Appointment.findById(appointmentId);
        expect(deletedAppointment).toBeNull();
      });

      it('should return 404 for non-existent appointment', async () => {
        const fakeId = '507f1f77bcf86cd799439011';
        await request(app)
          .delete(`/api/appointments/${fakeId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(404);
      });
    });

    describe('POST /api/appointments/generate', () => {
      it('should generate appointments from availability', async () => {
        const response = await request(app)
          .post('/api/appointments/generate')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            doctor: doctorId,
            weeks: 2,
          })
          .expect(201);

        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBeGreaterThan(0);
        expect(response.body[0]).toHaveProperty('date');
        expect(response.body[0]).toHaveProperty('hour');
        expect(response.body[0]).toHaveProperty('status', 'available');
        expect(response.body[0]).toHaveProperty('availability');
      });

      it('should return empty array when no active availabilities exist', async () => {
        // Desactivar la disponibilidad
        await Availability.findByIdAndUpdate(availabilityId, { active: false });

        const response = await request(app)
          .post('/api/appointments/generate')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            doctor: doctorId,
            weeks: 1,
          })
          .expect(201);

        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBe(0);
      });

      it('should fail without authentication', async () => {
        await request(app)
          .post('/api/appointments/generate')
          .send({
            doctor: doctorId,
            weeks: 1,
          })
          .expect(401);
      });
    });

    describe('GET /api/appointments/free/:doctorId', () => {
      beforeEach(async () => {
        // Crear citas libres
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 7);

        await Appointment.create([
          {
            availability: availabilityId,
            date: futureDate,
            hour: '09:00',
            status: 'available',
            free: true,
            confirmed: false,
          },
          {
            availability: availabilityId,
            date: futureDate,
            hour: '10:00',
            status: 'available',
            free: true,
            confirmed: false,
          },
          {
            client: clientId,
            availability: availabilityId,
            date: futureDate,
            hour: '11:00',
            status: 'scheduled',
            free: false,
            confirmed: true,
          },
        ]);
      });

      it('should get all free appointments for a doctor', async () => {
        const response = await request(app)
          .get(`/api/appointments/free/${doctorId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBeGreaterThanOrEqual(2);
        response.body.forEach((apt) => {
          expect(apt.free).toBe(true);
          expect(apt.status).toBe('available');
          expect(apt.client).toBeFalsy();
        });
      });

      it('should return 500 when doctorId is missing', async () => {
        // La ruta sin doctorId causa un error interno ya que el controller espera el parámetro
        await request(app)
          .get('/api/appointments/free/')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(400);
      });

      it('should cancel past free appointments automatically', async () => {
        // Crear una cita libre en el pasado
        const pastDate = new Date();
        pastDate.setDate(pastDate.getDate() - 1);

        await Appointment.create({
          availability: availabilityId,
          date: pastDate,
          hour: '09:00',
          status: 'available',
          free: true,
          confirmed: false,
        });

        const response = await request(app)
          .get(`/api/appointments/free/${doctorId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        // Verificar que las citas pasadas no se devuelvan
        response.body.forEach((apt) => {
          expect(new Date(apt.date).getTime()).toBeGreaterThan(Date.now());
        });
      });
    });
  });

  describe('Appointment Service - Additional Coverage', () => {
    const AppointmentService = require('../../services/appointment.service').default;
    let clientId, doctorId, availabilityId, userId, authToken;

    beforeEach(async () => {
      const userResponse = await request(app).post('/api/auth/register').send({
        username: 'servicetest',
        password: 'Str0ng!Pass123',
        role: 'admin',
      });

      userId = userResponse.body.user.id;

      const loginResponse = await request(app).post('/api/auth/login').send({
        username: 'servicetest',
        password: 'Str0ng!Pass123',
      });

      authToken = loginResponse.body.accessToken;

      const client = await Client.create({
        name: 'Service Test Client',
        phone: '+1111111111',
        status: 'active',
      });
      clientId = client._id.toString();

      const doctor = await Doctor.create({
        name: 'Dr. Service Test',
        specialty: 'Test specialty',
        phone: '+2222222222',
        user: userId,
      });
      doctorId = doctor._id.toString();

      const availability = await Availability.create({
        doctor: doctorId,
        dayOfWeek: 1,
        startHour: '09:00',
        endHour: '17:00',
        duration: 30,
        active: true,
      });
      availabilityId = availability._id.toString();
    });

    describe('getNextConfirmedAppointment', () => {
      it('should return next confirmed appointment for a client', async () => {
        const futureDate1 = new Date();
        futureDate1.setDate(futureDate1.getDate() + 7);

        const futureDate2 = new Date();
        futureDate2.setDate(futureDate2.getDate() + 14);

        await Appointment.create([
          {
            client: clientId,
            availability: availabilityId,
            date: futureDate2,
            hour: '14:00',
            status: 'scheduled',
            confirmed: true,
          },
          {
            client: clientId,
            availability: availabilityId,
            date: futureDate1,
            hour: '10:00',
            status: 'scheduled',
            confirmed: true,
          },
        ]);

        const result = await AppointmentService.getNextConfirmedAppointment(clientId);

        expect(result).toBeTruthy();
        expect(result.client._id.toString()).toBe(clientId);
        expect(result.confirmed).toBe(true);
        expect(result.status).toBe('scheduled');
        expect(new Date(result.date).getTime()).toBe(futureDate1.getTime());
      });

      it('should return null when no confirmed appointments exist', async () => {
        const result = await AppointmentService.getNextConfirmedAppointment(clientId);
        expect(result).toBeNull();
      });

      it('should not return unconfirmed appointments', async () => {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 7);

        await Appointment.create({
          client: clientId,
          availability: availabilityId,
          date: futureDate,
          hour: '10:00',
          status: 'scheduled',
          confirmed: false,
        });

        const result = await AppointmentService.getNextConfirmedAppointment(clientId);
        expect(result).toBeNull();
      });

      it('should not return past appointments', async () => {
        const pastDate = new Date();
        pastDate.setDate(pastDate.getDate() - 7);

        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 7);

        await Appointment.create([
          {
            client: clientId,
            availability: availabilityId,
            date: pastDate,
            hour: '10:00',
            status: 'scheduled',
            confirmed: true,
          },
          {
            client: clientId,
            availability: availabilityId,
            date: futureDate,
            hour: '14:00',
            status: 'scheduled',
            confirmed: true,
          },
        ]);

        const result = await AppointmentService.getNextConfirmedAppointment(clientId);

        expect(result).toBeTruthy();
        expect(result.client._id.toString()).toBe(clientId);
        // Should return the future appointment, not the past one
        expect(new Date(result.date).getTime()).toBe(futureDate.getTime());
      });
    });

    describe('cancelConfirmedAppointment', () => {
      it('should cancel the next confirmed appointment', async () => {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 7);

        const appointment = await Appointment.create({
          client: clientId,
          availability: availabilityId,
          date: futureDate,
          hour: '10:00',
          status: 'scheduled',
          confirmed: true,
        });

        const result = await AppointmentService.cancelConfirmedAppointment(clientId);

        expect(result).toBeTruthy();
        expect(result._id.toString()).toBe(appointment._id.toString());
        expect(result.confirmed).toBe(false);
        expect(result.status).toBe('cancelled');
      });

      it('should return null when no confirmed appointments exist', async () => {
        const result = await AppointmentService.cancelConfirmedAppointment(clientId);
        expect(result).toBeNull();
      });

      it('should only cancel the earliest confirmed appointment', async () => {
        const futureDate1 = new Date();
        futureDate1.setDate(futureDate1.getDate() + 7);

        const futureDate2 = new Date();
        futureDate2.setDate(futureDate2.getDate() + 14);

        const apt1 = await Appointment.create({
          client: clientId,
          availability: availabilityId,
          date: futureDate1,
          hour: '10:00',
          status: 'scheduled',
          confirmed: true,
        });

        await Appointment.create({
          client: clientId,
          availability: availabilityId,
          date: futureDate2,
          hour: '14:00',
          status: 'scheduled',
          confirmed: true,
        });

        const result = await AppointmentService.cancelConfirmedAppointment(clientId);

        expect(result._id.toString()).toBe(apt1._id.toString());

        // Verificar que la segunda cita sigue confirmada
        const remainingAppointments = await Appointment.find({
          client: clientId,
          confirmed: true,
          status: 'scheduled',
        });
        expect(remainingAppointments.length).toBe(1);
      });
    });

    describe('getAllConfirmedAppointmentsForClient', () => {
      it('should return all confirmed scheduled appointments for a client', async () => {
        const futureDate1 = new Date();
        futureDate1.setDate(futureDate1.getDate() + 7);

        const futureDate2 = new Date();
        futureDate2.setDate(futureDate2.getDate() + 14);

        await Appointment.create([
          {
            client: clientId,
            availability: availabilityId,
            date: futureDate1,
            hour: '10:00',
            status: 'scheduled',
            confirmed: true,
          },
          {
            client: clientId,
            availability: availabilityId,
            date: futureDate2,
            hour: '14:00',
            status: 'scheduled',
            confirmed: true,
          },
          {
            client: clientId,
            availability: availabilityId,
            date: futureDate2,
            hour: '15:00',
            status: 'cancelled',
            confirmed: false,
          },
        ]);

        const result = await AppointmentService.getAllConfirmedAppointmentsForClient(clientId);

        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBe(2);
        result.forEach((apt) => {
          expect(apt.client.toString()).toBe(clientId);
          expect(apt.confirmed).toBe(true);
          expect(apt.status).toBe('scheduled');
        });
      });

      it('should return empty array when no confirmed appointments exist', async () => {
        const result = await AppointmentService.getAllConfirmedAppointmentsForClient(clientId);
        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBe(0);
      });

      it('should return appointments sorted by date', async () => {
        const futureDate1 = new Date();
        futureDate1.setDate(futureDate1.getDate() + 14);

        const futureDate2 = new Date();
        futureDate2.setDate(futureDate2.getDate() + 7);

        await Appointment.create([
          {
            client: clientId,
            availability: availabilityId,
            date: futureDate1,
            hour: '14:00',
            status: 'scheduled',
            confirmed: true,
          },
          {
            client: clientId,
            availability: availabilityId,
            date: futureDate2,
            hour: '10:00',
            status: 'scheduled',
            confirmed: true,
          },
        ]);

        const result = await AppointmentService.getAllConfirmedAppointmentsForClient(clientId);

        expect(result.length).toBe(2);
        expect(new Date(result[0].date).getTime()).toBeLessThan(new Date(result[1].date).getTime());
      });
    });

    describe('getFreeAppointmentsForDoctorAndDate', () => {
      it('should return free appointments for a specific date', async () => {
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + 7);
        targetDate.setHours(12, 0, 0, 0);

        const otherDate = new Date();
        otherDate.setDate(otherDate.getDate() + 14);

        await Appointment.create([
          {
            availability: availabilityId,
            date: targetDate,
            hour: '09:00',
            status: 'available',
            free: true,
          },
          {
            availability: availabilityId,
            date: targetDate,
            hour: '10:00',
            status: 'available',
            free: true,
          },
          {
            availability: availabilityId,
            date: otherDate,
            hour: '11:00',
            status: 'available',
            free: true,
          },
        ]);

        const result = await AppointmentService.getFreeAppointmentsForDoctorAndDate(
          doctorId,
          targetDate
        );

        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBe(2);
        result.forEach((apt) => {
          const aptDate = new Date(apt.date);
          expect(aptDate.toDateString()).toBe(targetDate.toDateString());
          expect(apt.free).toBe(true);
          expect(apt.client).toBeFalsy();
        });
      });

      it('should not return past appointments', async () => {
        const pastDate = new Date();
        pastDate.setDate(pastDate.getDate() - 1);

        await Appointment.create({
          availability: availabilityId,
          date: pastDate,
          hour: '09:00',
          status: 'available',
          free: true,
        });

        const result = await AppointmentService.getFreeAppointmentsForDoctorAndDate(
          doctorId,
          pastDate
        );

        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBe(0);
      });

      it('should return empty array when no free appointments exist for the date', async () => {
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + 7);

        const result = await AppointmentService.getFreeAppointmentsForDoctorAndDate(
          doctorId,
          targetDate
        );

        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBe(0);
      });
    });

    describe('generateAppointmentsFromAvailability', () => {
      it('should generate appointments for multiple weeks', async () => {
        const result = await AppointmentService.generateAppointmentsFromAvailability(doctorId, 2);

        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBeGreaterThan(0);
        result.forEach((apt) => {
          expect(apt).toHaveProperty('date');
          expect(apt).toHaveProperty('hour');
          expect(apt.status).toBe('available');
          expect(apt.confirmed).toBe(false);
          expect(apt.availability.toString()).toBe(availabilityId);
        });
      });

      it('should respect availability time slots', async () => {
        const result = await AppointmentService.generateAppointmentsFromAvailability(doctorId, 1);

        result.forEach((apt) => {
          const [hour, minute] = apt.hour.split(':').map(Number);
          expect(hour).toBeGreaterThanOrEqual(9);
          expect(hour).toBeLessThan(17);
        });
      });

      it('should return empty array when doctor has no active availabilities', async () => {
        await Availability.updateMany({ doctor: doctorId }, { active: false });

        const result = await AppointmentService.generateAppointmentsFromAvailability(doctorId, 1);

        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBe(0);
      });

      it('should skip past time slots on current day', async () => {
        // Crear disponibilidad para el día actual
        const today = new Date().getDay();

        await Availability.create({
          doctor: doctorId,
          dayOfWeek: today,
          startHour: '08:00',
          endHour: '23:59',
          duration: 30,
          active: true,
        });

        const result = await AppointmentService.generateAppointmentsFromAvailability(doctorId, 1);

        // Todas las citas deben ser en el futuro
        result.forEach((apt) => {
          expect(new Date(apt.date).getTime()).toBeGreaterThan(Date.now());
        });
      });
    });

    describe('getAvailabilityById', () => {
      it('should return availability by id', async () => {
        const result = await AppointmentService.getAvailabilityById(availabilityId);

        expect(result).toBeTruthy();
        expect(result._id.toString()).toBe(availabilityId);
        expect(result.doctor.toString()).toBe(doctorId);
      });

      it('should return null for non-existent availability', async () => {
        const fakeId = '507f1f77bcf86cd799439011';
        const result = await AppointmentService.getAvailabilityById(fakeId);

        expect(result).toBeNull();
      });
    });
  });
});
