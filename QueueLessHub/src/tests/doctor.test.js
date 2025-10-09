const request = require('supertest');
const app = require('../app');
const Doctor = require('../models/doctor.model');
const User = require('../models/user.model');

describe('Doctor Endpoints', () => {
  let authToken;
  let userId;

  beforeEach(async () => {
    // Create and login a user to get auth token
    const userResponse = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'testdoctor',
        password: 'password123',
        role: 'admin'
      });

    userId = userResponse.body.id;

    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'testdoctor',
        password: 'password123'
      });

    authToken = loginResponse.body.token;
  });

  describe('POST /api/doctors', () => {
    it('should create a new doctor successfully', async () => {
      const doctorData = {
        name: 'Dr. Juan Pérez',
        specialty: 'Cardiología', // Corregido: specialty no speciality
        phone: '+1234567890',
        email: 'doctor@example.com',
        user: userId
      };

      const response = await request(app)
        .post('/api/doctors')
        .set('Authorization', `Bearer ${authToken}`)
        .send(doctorData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe(doctorData.name);
      expect(response.body.specialty).toBe(doctorData.specialty); // Corregido: specialty
      expect(response.body.phone).toBe(doctorData.phone);
      expect(response.body.email).toBe(doctorData.email);
      expect(response.body.user).toBe(userId); // Solo el ID, no objeto populated
    });

    it('should fail with missing required fields', async () => {
      const response = await request(app)
        .post('/api/doctors')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Dr. Juan Pérez'
          // Missing required fields
        })
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });

    it('should fail without authentication', async () => {
      await request(app)
        .post('/api/doctors')
        .send({
          name: 'Dr. Juan Pérez',
          specialty: 'Cardiología', // Corregido: specialty
          phone: '+1234567890',
          email: 'doctor@example.com',
          user: userId
        })
        .expect(401);
    });
  });

  describe('GET /api/doctors', () => {
    beforeEach(async () => {
      // Create additional users for doctors
      const user2 = await User.create({
        username: 'doctor2',
        password: 'hashedpassword',
        role: 'doctor'
      });

      const user3 = await User.create({
        username: 'doctor3',
        password: 'hashedpassword',
        role: 'doctor'
      });

      // Create test doctors
      await Doctor.create([
        {
          name: 'Dr. María García',
          specialty: 'Pediatría', // Corregido: specialty
          phone: '+1111111111',
          email: 'maria@example.com',
          user: userId
        },
        {
          name: 'Dr. Carlos López',
          specialty: 'Neurología', // Corregido: specialty
          phone: '+2222222222',
          email: 'carlos@example.com',
          user: user2._id
        },
        {
          name: 'Dr. Ana Martínez',
          specialty: 'Dermatología', // Corregido: specialty
          phone: '+3333333333',
          email: 'ana@example.com',
          user: user3._id
        }
      ]);
    });

    it('should get all doctors with populated user data', async () => {
      const response = await request(app)
        .get('/api/doctors')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(3);
      expect(response.body[0]).toHaveProperty('id');
      expect(response.body[0]).toHaveProperty('name');
      expect(response.body[0]).toHaveProperty('specialty'); // Corregido: specialty
      expect(response.body[0]).toHaveProperty('user');
      expect(response.body[0].user).toHaveProperty('username');
    });

    it('should fail without authentication', async () => {
      await request(app)
        .get('/api/doctors')
        .expect(401);
    });
  });

  describe('GET /api/doctors/:id', () => {
    let doctorId;

    beforeEach(async () => {
      const doctor = await Doctor.create({
        name: 'Dr. Test',
        specialty: 'Test Speciality', // Corregido: specialty
        phone: '+1234567890',
        email: 'test@example.com',
        user: userId
      });
      doctorId = doctor._id.toString();
    });

    it('should get doctor by id with populated user', async () => {
      const response = await request(app)
        .get(`/api/doctors/${doctorId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', doctorId);
      expect(response.body.name).toBe('Dr. Test');
      expect(response.body.specialty).toBe('Test Speciality'); // Corregido: specialty
      expect(response.body.user).toHaveProperty('username', 'testdoctor');
    });

    it('should return 404 for non-existent doctor', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      await request(app)
        .get(`/api/doctors/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should return 500 for invalid id format', async () => {
      await request(app)
        .get('/api/doctors/invalid-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(500);
    });
  });

  describe('PUT /api/doctors/:id', () => {
    let doctorId;

    beforeEach(async () => {
      const doctor = await Doctor.create({
        name: 'Dr. Test',
        specialty: 'Test Speciality', // Corregido: specialty
        phone: '+1234567890',
        email: 'test@example.com',
        user: userId
      });
      doctorId = doctor._id.toString();
    });

    it('should update doctor successfully', async () => {
      const updateData = {
        name: 'Dr. Updated Name',
        specialty: 'Updated Speciality', // Corregido: specialty
        phone: '+9876543210'
      };

      const response = await request(app)
        .put(`/api/doctors/${doctorId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.name).toBe(updateData.name);
      expect(response.body.specialty).toBe(updateData.specialty); // Corregido: specialty
      expect(response.body.phone).toBe(updateData.phone);
      expect(response.body.email).toBe('test@example.com'); // Should remain unchanged
    });

    it('should return 404 for non-existent doctor', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      await request(app)
        .put(`/api/doctors/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Updated' })
        .expect(404);
    });
  });

  describe('DELETE /api/doctors/:id', () => {
    let doctorId;

    beforeEach(async () => {
      const doctor = await Doctor.create({
        name: 'Dr. Test',
        specialty: 'Test Speciality', // Corregido: specialty
        phone: '+1234567890',
        email: 'test@example.com',
        user: userId
      });
      doctorId = doctor._id.toString();
    });

    it('should delete doctor successfully', async () => {
      await request(app)
        .delete(`/api/doctors/${doctorId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Verify doctor is deleted
      const deletedDoctor = await Doctor.findById(doctorId);
      expect(deletedDoctor).toBeNull();
    });

    it('should return 404 for non-existent doctor', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      await request(app)
        .delete(`/api/doctors/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });
});
