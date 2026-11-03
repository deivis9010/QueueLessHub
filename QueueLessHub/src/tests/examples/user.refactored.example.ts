/**
 * User Test - Refactored Example
 * Ejemplo de cómo usar fixtures, factories y helpers
 */

import request from 'supertest';
import app from '../../app';
import User from '../../models/user.model';
import UserService from '../../services/user.service';

// Importar fixtures, factories y helpers
import { fixtures } from '../testResources';
import { userFactory } from '../factories';
import { authHelpers, assertionHelpers } from '../helpers/testHelpers';

describe('User - Refactored with Fixtures Example', () => {
  describe('User Endpoints - Using Helpers', () => {
    let authToken;
    let adminToken;
    let userId;

    beforeEach(async () => {
      // Usar authHelpers en lugar de código repetitivo
      const admin = await authHelpers.createAdmin();
      adminToken = admin.token;

      const user = await authHelpers.createUser();
      authToken = user.token;
      userId = user.userId;
    });

    describe('POST /api/users', () => {
      it('should create a new user successfully as admin', async () => {
        // Usar factory para generar datos únicos
        const userData = userFactory.createDoctor();

        const response = await request(app)
          .post('/api/users')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(userData)
          .expect(201);

        // Usar assertion helper
        assertionHelpers.expectUserShape(response.body, userData);
      });

      it('should fail with duplicate username', async () => {
        // Usar fixture para datos conocidos
        const userData = fixtures.users.regularUser;

        // Primero crear el usuario
        await request(app)
          .post('/api/users')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(userData);

        // Intentar crear duplicado
        const response = await request(app)
          .post('/api/users')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(userData)
          .expect(400);

        assertionHelpers.expectErrorResponse(response, 400);
      });

      it('should fail with missing required fields', async () => {
        const response = await request(app)
          .post('/api/users')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            username: 'incomplete',
            // Missing password
          })
          .expect(400);

        expect(response.body).toHaveProperty('error');
      });

      it('should fail without admin privileges', async () => {
        const userData = userFactory.create();

        const response = await request(app)
          .post('/api/users')
          .set('Authorization', `Bearer ${authToken}`) // Regular user token
          .send(userData)
          .expect(403);

        expect(response.body).toHaveProperty('error');
      });

      it('should fail without authentication', async () => {
        const userData = userFactory.create();

        await request(app).post('/api/users').send(userData).expect(401);
      });
    });

    describe('GET /api/users', () => {
      beforeEach(async () => {
        // Crear múltiples usuarios usando factory
        const users = userFactory.createMany(3, { role: 'doctor' });

        for (const userData of users) {
          await User.create({
            ...userData,
            password: 'hashedpassword',
          });
        }
      });

      it('should get all users as admin', async () => {
        const response = await request(app)
          .get('/api/users')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBeGreaterThanOrEqual(5); // admin, user + 3 created

        // Verificar estructura del primer usuario
        assertionHelpers.expectUserShape(response.body[0]);
      });

      it('should fail without admin privileges', async () => {
        await request(app)
          .get('/api/users')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(403);
      });

      it('should fail without authentication', async () => {
        await request(app).get('/api/users').expect(401);
      });

      it('should handle service errors when getting all users', async () => {
        jest.spyOn(UserService, 'getAll').mockRejectedValueOnce(new Error('Database error'));

        const response = await request(app)
          .get('/api/users')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(500);

        expect(response.body).toHaveProperty('error', 'Database error');
        UserService.getAll.mockRestore();
      });
    });

    describe('GET /api/users/:id', () => {
      it('should get user by id as admin', async () => {
        const response = await request(app)
          .get(`/api/users/${userId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('id', userId);
        assertionHelpers.expectUserShape(response.body);
      });

      it('should get own user data as regular user', async () => {
        const response = await request(app)
          .get(`/api/users/${userId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('id', userId);
      });

      it('should return 404 for non-existent user', async () => {
        const fakeId = '507f1f77bcf86cd799439011';
        await request(app)
          .get(`/api/users/${fakeId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(404);
      });

      it('should return 400 for invalid id format', async () => {
        await request(app)
          .get('/api/users/invalid-id')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(400);
      });

      it('should handle service errors when getting user by id', async () => {
        jest
          .spyOn(UserService, 'getById')
          .mockRejectedValueOnce(new Error('Database connection failed'));

        const response = await request(app)
          .get(`/api/users/${userId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(500);

        expect(response.body).toHaveProperty('error', 'Database connection failed');
        UserService.getById.mockRestore();
      });
    });
  });
});
