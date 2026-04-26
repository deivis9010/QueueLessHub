const request = require('supertest');
import app from '../../app';
const Doctor = require('../../models/doctor.model').default;
const User = require('../../models/user.model').default;

describe('Doctor Endpoints', () => {
  let authToken;
  let userId;
  let userEmail;

  beforeEach(async () => {
    // Create and login a user to get auth token
    userEmail = 'testdoctor@example.com';
    const userResponse = await request(app).post('/api/auth/register').send({
      username: 'testdoctor',
      password: 'Str0ng!Pass123',
      role: 'admin',
      email: userEmail,
    });

    userId = userResponse.body.user.id;

    const loginResponse = await request(app).post('/api/auth/login').send({
      username: 'testdoctor',
      password: 'Str0ng!Pass123',
    });

    authToken = loginResponse.body.accessToken;
  });

  describe('POST /api/doctors', () => {
    it('should create a new doctor successfully', async () => {
      const doctorData = {
        name: 'Dr. Juan Pérez',
        specialty: 'Cardiología', // Corregido: specialty no specialty
        phone: '+1234567890',
        user: userId,
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
      // Email now lives in the associated user
      expect(response.body.user).toHaveProperty('email', userEmail);
      expect(response.body.user.id).toBe(userId); // user is populated object
    });

    it('should fail with missing required fields', async () => {
      const response = await request(app)
        .post('/api/doctors')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Dr. Juan Pérez',
          // Missing required fields
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should fail without authentication', async () => {
      await request(app)
        .post('/api/doctors')
        .send({
          name: 'Dr. Juan Pérez',
          specialty: 'Cardiología', // Corregido: specialty
          phone: '+1234567890',
          user: userId,
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
        role: 'doctor',
        email: 'doctor2@example.com',
      });

      const user3 = await User.create({
        username: 'doctor3',
        password: 'hashedpassword',
        role: 'doctor',
        email: 'doctor3@example.com',
      });

      // Create test doctors
      await Doctor.create([
        {
          name: 'Dr. María García',
          specialty: 'Pediatría', // Corregido: specialty
          phone: '+1111111111',
          user: userId,
        },
        {
          name: 'Dr. Carlos López',
          specialty: 'Neurología', // Corregido: specialty
          phone: '+2222222222',
          user: user2._id,
        },
        {
          name: 'Dr. Ana Martínez',
          specialty: 'Dermatología', // Corregido: specialty
          phone: '+3333333333',
          user: user3._id,
        },
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
      expect(response.body[0].user).toHaveProperty('email');
    });

    it('should fail without authentication', async () => {
      await request(app).get('/api/doctors').expect(401);
    });
  });

  describe('GET /api/doctors/:id', () => {
    let doctorId;

    beforeEach(async () => {
      const doctor = await Doctor.create({
        name: 'Dr. Test',
        specialty: 'Test specialty', // Corregido: specialty
        phone: '+1234567890',
        user: userId,
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
      expect(response.body.specialty).toBe('Test specialty'); // Corregido: specialty
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
        .expect(400);
    });
  });

  describe('PUT /api/doctors/:id', () => {
    let doctorId;

    beforeEach(async () => {
      const doctor = await Doctor.create({
        name: 'Dr. Test',
        specialty: 'Test specialty', // Corregido: specialty
        phone: '+1234567890',
        user: userId,
      });
      doctorId = doctor._id.toString();
    });

    it('should update doctor successfully', async () => {
      const updateData = {
        name: 'Dr. Updated Name',
        specialty: 'Updated specialty', // Corregido: specialty
        phone: '+9876543210',
      };

      const response = await request(app)
        .put(`/api/doctors/${doctorId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.name).toBe(updateData.name);
      expect(response.body.specialty).toBe(updateData.specialty); // Corregido: specialty
      expect(response.body.phone).toBe(updateData.phone);
      // Email lives on the associated user
      expect(response.body.user).toHaveProperty('email', userEmail);
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
        specialty: 'Test specialty', // Corregido: specialty
        phone: '+1234567890',
        email: 'test@example.com',
        user: userId,
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
