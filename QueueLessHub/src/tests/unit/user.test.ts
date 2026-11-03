const request = require('supertest');
import app from '../../app';
const User = require('../../models/user.model').default;
const UserService = require('../../services/user.service').default;

describe('User - Complete Test Suite', () => {
  describe('User Endpoints - Integration Tests', () => {
    let authToken;
    let adminToken;
    let userId;

    beforeEach(async () => {
      // Create admin user
      const adminResponse = await request(app).post('/api/auth/register').send({
        username: 'admin',
        password: 'Str0ng!Pass123',
        role: 'admin',
      });

      const adminLoginResponse = await request(app).post('/api/auth/login').send({
        username: 'admin',
        password: 'Str0ng!Pass123',
      });

      adminToken = adminLoginResponse.body.accessToken;

      // Create regular user
      const userResponse = await request(app).post('/api/auth/register').send({
        username: 'testuser',
        password: 'Str0ng!Pass123',
        role: 'user',
      });

      userId = userResponse.body.user.id;

      const userLoginResponse = await request(app).post('/api/auth/login').send({
        username: 'testuser',
        password: 'Str0ng!Pass123',
      });

      authToken = userLoginResponse.body.accessToken;
    });

    describe('POST /api/users', () => {
      it('should create a new user successfully as admin', async () => {
        const userData = {
          username: 'newuser',
          password: 'Str0ng!Pass123',
          role: 'doctor',
        };

        const response = await request(app)
          .post('/api/users')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(userData)
          .expect(201);

        expect(response.body).toHaveProperty('id');
        expect(response.body.username).toBe(userData.username);
        expect(response.body.role).toBe(userData.role);
        expect(response.body).not.toHaveProperty('password');
      });

      it('should fail with duplicate username', async () => {
        const userData = {
          username: 'testuser', // Already exists
          password: 'Str0ng!Pass123',
          role: 'user',
        };

        const response = await request(app)
          .post('/api/users')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(userData)
          .expect(400);

        expect(response.body).toHaveProperty('error');
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
        const response = await request(app)
          .post('/api/users')
          .set('Authorization', `Bearer ${authToken}`) // Regular user token
          .send({
            username: 'newuser',
            password: 'Str0ng!Pass123',
            role: 'user',
          })
          .expect(403);

        expect(response.body).toHaveProperty('error');
      });

      it('should fail without authentication', async () => {
        await request(app)
          .post('/api/users')
          .send({
            username: 'newuser',
            password: 'Str0ng!Pass123',
            role: 'user',
          })
          .expect(401);
      });
    });

    describe('GET /api/users', () => {
      beforeEach(async () => {
        // Create additional test users
        await User.create([
          {
            username: 'doctor1',
            password: 'hashedpassword1',
            role: 'doctor',
          },
          {
            username: 'doctor2',
            password: 'hashedpassword2',
            role: 'doctor',
          },
          {
            username: 'user1',
            password: 'hashedpassword3',
            role: 'user',
          },
        ]);
      });

      it('should get all users as admin', async () => {
        const response = await request(app)
          .get('/api/users')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBeGreaterThanOrEqual(5); // admin, testuser + 3 created
        expect(response.body[0]).toHaveProperty('id');
        expect(response.body[0]).toHaveProperty('username');
        expect(response.body[0]).toHaveProperty('role');
        expect(response.body[0]).not.toHaveProperty('password');
      });

      it('should fail without admin privileges', async () => {
        await request(app)
          .get('/api/users')
          .set('Authorization', `Bearer ${authToken}`) // Regular user token
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

        expect(response.body).toHaveProperty('error', 'Error interno del servidor');
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
        expect(response.body.username).toBe('testuser');
        expect(response.body.role).toBe('user');
        expect(response.body).not.toHaveProperty('password');
      });

      it('should get own user data as regular user', async () => {
        const response = await request(app)
          .get(`/api/users/${userId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('id', userId);
        expect(response.body.username).toBe('testuser');
        expect(response.body.role).toBe('user');
      });

      it('should fail when regular user tries to access other user data', async () => {
        // Get admin user ID
        const adminUser = await User.findOne({ username: 'admin' });

        await request(app)
          .get(`/api/users/${adminUser._id}`)
          .set('Authorization', `Bearer ${authToken}`) // Regular user token
          .expect(403);
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

        expect(response.body).toHaveProperty('error', 'Error interno del servidor');
        UserService.getById.mockRestore();
      });
    });

    describe('PUT /api/users/:id', () => {
      it('should update user successfully as admin', async () => {
        const updateData = {
          username: 'updateduser',
          role: 'doctor',
        };

        const response = await request(app)
          .put(`/api/users/${userId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send(updateData)
          .expect(200);

        expect(response.body.username).toBe(updateData.username);
        expect(response.body.role).toBe(updateData.role);
        expect(response.body).not.toHaveProperty('password');
      });

      it('should update own user data as regular user', async () => {
        const updateData = {
          username: 'updatedtestuser',
          // Regular users shouldn't be able to change role
        };

        const response = await request(app)
          .put(`/api/users/${userId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(updateData)
          .expect(200);

        expect(response.body.username).toBe(updateData.username);
        expect(response.body.role).toBe('user'); // Should remain unchanged
      });

      it('should fail when regular user tries to update other user', async () => {
        const adminUser = await User.findOne({ username: 'admin' });

        await request(app)
          .put(`/api/users/${adminUser._id}`)
          .set('Authorization', `Bearer ${authToken}`) // Regular user token
          .send({ username: 'hacked' })
          .expect(403);
      });

      it('should update password when provided', async () => {
        const updateData = {
          password: 'newStr0ng!Pass123',
        };

        await request(app)
          .put(`/api/users/${userId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send(updateData)
          .expect(200);

        // Verify new password works
        const loginResponse = await request(app)
          .post('/api/auth/login')
          .send({
            username: 'testuser',
            password: 'newStr0ng!Pass123',
          })
          .expect(200);

        expect(loginResponse.body).toHaveProperty('accessToken');
      });

      it('should return 404 for non-existent user', async () => {
        const fakeId = '507f1f77bcf86cd799439011';
        await request(app)
          .put(`/api/users/${fakeId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ username: 'updated' })
          .expect(404);
      });

      it('should fail with invalid user ID format', async () => {
        await request(app)
          .put('/api/users/invalid-id')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ username: 'updated' })
          .expect(400);
      });

      it('should handle duplicate username during update', async () => {
        // Create another user first
        await User.create({
          username: 'existinguser',
          password: 'hashedpassword',
          role: 'user',
        });

        const response = await request(app)
          .put(`/api/users/${userId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ username: 'existinguser' }) // Try to update to existing username
          .expect(400);

        expect(response.body).toHaveProperty('error', 'El nombre de usuario ya existe');
      });

      it('should handle validation errors during update', async () => {
        jest.spyOn(UserService, 'update').mockRejectedValueOnce({
          name: 'ValidationError',
          message: 'Validation failed: role must be valid',
        });

        const response = await request(app)
          .put(`/api/users/${userId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ role: 'invalid_role' })
          .expect(400);

        expect(response.body).toHaveProperty('error', 'Validation failed: role must be valid');
        UserService.update.mockRestore();
      });

      it('should handle service errors during update', async () => {
        jest.spyOn(UserService, 'update').mockRejectedValueOnce(new Error('Update failed'));

        const response = await request(app)
          .put(`/api/users/${userId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ username: 'newtestuser' })
          .expect(500);

        expect(response.body).toHaveProperty('error', 'Error interno del servidor');
        UserService.update.mockRestore();
      });
    });

    describe('DELETE /api/users/:id', () => {
      let userToDeleteId;

      beforeEach(async () => {
        const userToDelete = await User.create({
          username: 'todelete',
          password: 'hashedpassword',
          role: 'user',
        });
        userToDeleteId = userToDelete._id.toString();
      });

      it('should delete user successfully as admin', async () => {
        await request(app)
          .delete(`/api/users/${userToDeleteId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        // Verify user is deleted
        const deletedUser = await User.findById(userToDeleteId);
        expect(deletedUser).toBeNull();
      });

      it('should fail when regular user tries to delete other user', async () => {
        await request(app)
          .delete(`/api/users/${userToDeleteId}`)
          .set('Authorization', `Bearer ${authToken}`) // Regular user token
          .expect(403);
      });

      it('should fail when user tries to delete themselves', async () => {
        await request(app)
          .delete(`/api/users/${userId}`)
          .set('Authorization', `Bearer ${authToken}`) // Trying to delete own account
          .expect(403);
      });

      it('should return 404 for non-existent user', async () => {
        const fakeId = '507f1f77bcf86cd799439011';
        await request(app)
          .delete(`/api/users/${fakeId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(404);
      });

      it('should fail without authentication', async () => {
        await request(app).delete(`/api/users/${userToDeleteId}`).expect(401);
      });

      it('should return 400 for invalid user ID format on delete', async () => {
        const response = await request(app)
          .delete('/api/users/invalid-id')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(400);

        expect(response.body).toHaveProperty('error', 'ID de usuario inválido');
      });

      it('should handle service errors during delete', async () => {
        jest
          .spyOn(UserService, 'remove')
          .mockRejectedValueOnce(new Error('Delete operation failed'));

        const response = await request(app)
          .delete(`/api/users/${userToDeleteId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(500);

        expect(response.body).toHaveProperty('error', 'Error interno del servidor');
        UserService.remove.mockRestore();
      });
    });

    describe('POST /api/users/:id/password', () => {
      it('should change own password successfully', async () => {
        const response = await request(app)
          .post(`/api/users/${userId}/password`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ currentPassword: 'Str0ng!Pass123', newPassword: 'newStr0ng!Pass123' })
          .expect(200);

        expect(response.body).toHaveProperty('message', 'Contraseña actualizada exitosamente');

        // Verify new password works
        const loginResponse = await request(app)
          .post('/api/auth/login')
          .send({ username: 'testuser', password: 'newStr0ng!Pass123' })
          .expect(200);

        expect(loginResponse.body).toHaveProperty('accessToken');
      });

      it('should fail with incorrect current password', async () => {
        await request(app)
          .post(`/api/users/${userId}/password`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ currentPassword: 'wrongpassword', newPassword: 'Str0ng!Pass123' })
          .expect(401);
      });

      it('should fail with missing fields', async () => {
        await request(app)
          .post(`/api/users/${userId}/password`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ currentPassword: 'Str0ng!Pass123' })
          .expect(400);
      });

      it('should return 400 for invalid user ID format on password change', async () => {
        const response = await request(app)
          .post('/api/users/invalid-id/password')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ currentPassword: 'Str0ng!Pass123', newPassword: 'newStr0ng!Pass123' })
          .expect(400);

        expect(response.body).toHaveProperty('error', 'ID de usuario inválido');
      });

      it('should return 404 when user not found during password change', async () => {
        const fakeId = '507f1f77bcf86cd799439011';
        const response = await request(app)
          .post(`/api/users/${fakeId}/password`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ currentPassword: 'Str0ng!Pass123', newPassword: 'newStr0ng!Pass123' })
          .expect(404);

        expect(response.body).toHaveProperty('error', 'Usuario no encontrado');
      });

      it('should fail when currentPassword is missing', async () => {
        const response = await request(app)
          .post(`/api/users/${userId}/password`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ newPassword: 'newStr0ng!Pass123' })
          .expect(400);

        expect(response.body).toHaveProperty('error', 'Contraseña actual y nueva son requeridas');
      });

      it('should fail when newPassword is missing', async () => {
        const response = await request(app)
          .post(`/api/users/${userId}/password`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ currentPassword: 'Str0ng!Pass123' })
          .expect(400);

        expect(response.body).toHaveProperty('error', 'New password is required');
      });

      it('should handle service errors during password change', async () => {
        jest
          .spyOn(UserService, 'changePassword')
          .mockRejectedValueOnce(new Error('Password change failed'));

        const response = await request(app)
          .post(`/api/users/${userId}/password`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ currentPassword: 'Str0ng!Pass123', newPassword: 'newStr0ng!Pass123' })
          .expect(500);

        expect(response.body).toHaveProperty('error', 'Error interno del servidor');
        UserService.changePassword.mockRestore();
      });
    });
  });
});
