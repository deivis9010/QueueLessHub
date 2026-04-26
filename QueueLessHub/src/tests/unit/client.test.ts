import request from 'supertest';

import app from '../../app';
import Client from '../../models/client.model';

describe('Client Endpoints', () => {
  let authToken: string;

  beforeEach(async () => {
    await Client.deleteMany({});

    const uniqueSuffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const username = `testuser-${uniqueSuffix}`;

    await request(app).post('/api/auth/register').send({
      username,
      password: 'Str0ng!Pass123',
      role: 'admin',
    });

    const loginResponse = await request(app).post('/api/auth/login').send({
      username,
      password: 'Str0ng!Pass123',
    });

    authToken = loginResponse.body.accessToken as string;
  });

  describe('POST /api/clients', () => {
    it('should create a new client successfully', async () => {
      const clientData = {
        name: 'Juan Pérez',
        phone: '+1234567890',
        status: 'active',
      };

      const response = await request(app)
        .post('/api/clients')
        .set('Authorization', `Bearer ${authToken}`)
        .send(clientData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe(clientData.name);
      expect(response.body.phone).toBe(clientData.phone);
      expect(response.body.status).toBe(clientData.status);
    });

    it('should fail with duplicate phone number', async () => {
      const clientData = {
        name: 'Juan Pérez',
        phone: '+1234567890',
        status: 'active',
      };

      await request(app)
        .post('/api/clients')
        .set('Authorization', `Bearer ${authToken}`)
        .send(clientData);

      const response = await request(app)
        .post('/api/clients')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'María García',
          phone: '+1234567890',
          status: 'active',
        })
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });

    it('should fail without phone number', async () => {
      const response = await request(app)
        .post('/api/clients')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Juan Pérez',
          status: 'active',
        })
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });

    it('should fail without authentication', async () => {
      await request(app)
        .post('/api/clients')
        .send({
          name: 'Juan Pérez',
          phone: '+1234567890',
          status: 'active',
        })
        .expect(401);
    });
  });

  describe('GET /api/clients', () => {
    beforeEach(async () => {
      await Client.create([
        { name: 'Client 1', phone: '+1111111111', status: 'active' },
        { name: 'Client 2', phone: '+2222222222', status: 'finished' },
        { name: 'Client 3', phone: '+3333333333', status: 'active' },
      ]);
    });

    it('should get all clients', async () => {
      const response = await request(app)
        .get('/api/clients')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(3);
      expect(response.body[0]).toHaveProperty('id');
      expect(response.body[0]).toHaveProperty('name');
      expect(response.body[0]).toHaveProperty('phone');
    });

    it('should fail without authentication', async () => {
      await request(app).get('/api/clients').expect(401);
    });
  });

  describe('GET /api/clients/:id', () => {
    let clientId: string;

    beforeEach(async () => {
      const client = await Client.create({
        name: 'Test Client',
        phone: '+1234567890',
        status: 'active',
      });
      clientId = client._id.toString();
    });

    it('should get client by id', async () => {
      const response = await request(app)
        .get(`/api/clients/${clientId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', clientId);
      expect(response.body.name).toBe('Test Client');
      expect(response.body.phone).toBe('+1234567890');
    });

    it('should return 404 for non-existent client', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      await request(app)
        .get(`/api/clients/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should return 500 for invalid id format', async () => {
      await request(app)
        .get('/api/clients/invalid-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(500);
    });
  });

  describe('PUT /api/clients/:id', () => {
    let clientId: string;

    beforeEach(async () => {
      const client = await Client.create({
        name: 'Test Client',
        phone: '+1234567890',
        status: 'active',
      });
      clientId = client._id.toString();
    });

    it('should update client successfully', async () => {
      const updateData = {
        name: 'Updated Client',
        status: 'finished',
      };

      const response = await request(app)
        .put(`/api/clients/${clientId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.name).toBe(updateData.name);
      expect(response.body.status).toBe(updateData.status);
      expect(response.body.phone).toBe('+1234567890');
    });

    it('should return 404 for non-existent client', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      await request(app)
        .put(`/api/clients/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Updated' })
        .expect(404);
    });
  });

  describe('DELETE /api/clients/:id', () => {
    let clientId: string;

    beforeEach(async () => {
      const client = await Client.create({
        name: 'Test Client',
        phone: '+1234567890',
        status: 'active',
      });
      clientId = client._id.toString();
    });

    it('should delete client successfully', async () => {
      await request(app)
        .delete(`/api/clients/${clientId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const deletedClient = await Client.findById(clientId);
      expect(deletedClient).toBeNull();
    });

    it('should return 404 for non-existent client', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      await request(app)
        .delete(`/api/clients/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });
});
