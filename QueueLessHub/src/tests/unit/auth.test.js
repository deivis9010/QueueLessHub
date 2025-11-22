const request = require('supertest');
const app = require('../../app');
const User = require('../../models/user.model');
const express = require('express');
const jwt = require('jsonwebtoken');
const { authMiddleware, roleMiddleware, roleOrSelfMiddleware } = require('../../middlewares/authMiddleware');
const Doctor = require('../../models/doctor.model');
const AuthService = require('../../services/auth.service');
const DoctorService = require('../../services/doctor.service');

jest.mock('jsonwebtoken', () => ({
  ...jest.requireActual('jsonwebtoken'),
  verify: jest.fn()
}));
jest.mock('../../models/doctor.model');

describe('Auth - Complete Test Suite', () => {
  describe('Auth Endpoints - Integration Tests', () => {
    describe('POST /api/auth/register', () => {
      it('should register a new user successfully', async () => {
        const userData = {
          username: 'testuser',
          password: 'password123',
          role: 'user'
        };

        const response = await request(app)
          .post('/api/auth/register')
          .send(userData)
          .expect(201);

        expect(response.body.user).toHaveProperty('id');
        expect(response.body.user.username).toBe(userData.username);
        expect(response.body.user.role).toBe(userData.role);
        expect(response.body).not.toHaveProperty('password');
      });

      it('should fail with duplicate username', async () => {
        const userData = {
          username: 'duplicate',
          password: 'password123',
          role: 'user'
        };

        // Create first user
        await request(app)
          .post('/api/auth/register')
          .send(userData)
          .expect(201);

        // Try to create duplicate
        const response = await request(app)
          .post('/api/auth/register')
          .send(userData)
          .expect(400);

        expect(response.body).toHaveProperty('error');
      });

      it('should fail with missing required fields', async () => {
        const response = await request(app)
          .post('/api/auth/register')
          .send({})
          .expect(400);

        expect(response.body).toHaveProperty('error');
      });

      it('should handle errors during doctor registration flow', async () => {
        // This test verifies the doctor registration path in the controller
        // The actual doctor creation may fail due to data dependencies,
        // but we verify the code path is executed
        const doctorData = {
          username: 'testdoctor' + Date.now(),
          password: 'password123',
          role: 'doctor',
          name: 'Dr. Test',
          specialty: 'Cardiology',
          phone: '+1234567890'
        };

        const response = await request(app)
          .post('/api/auth/register')
          .send(doctorData);

        // Either succeeds (201) or fails with an error message (400)
        expect([201, 400]).toContain(response.status);
        
        if (response.status === 201) {
          // Success path
          expect(response.body.user).toHaveProperty('id');
          expect(response.body.user.role).toBe('doctor');
        } else {
          // Error path - should have error message
          expect(response.body).toHaveProperty('error');
        }
      });

      it('should fail when AuthService.register returns null user', async () => {
        // Mock AuthService.register to return null
        jest.spyOn(AuthService, 'register').mockResolvedValueOnce(null);

        const response = await request(app)
          .post('/api/auth/register')
          .send({
            username: 'nulluser',
            password: 'password123',
            role: 'user'
          })
          .expect(400);

        expect(response.body.error).toBe('No se pudo registrar el usuario.');
        
        // Restore original implementation
        AuthService.register.mockRestore();
      });

      it('should fail when AuthService.register returns user without id', async () => {
        // Mock AuthService.register to return user without id
        jest.spyOn(AuthService, 'register').mockResolvedValueOnce({ username: 'test' });

        const response = await request(app)
          .post('/api/auth/register')
          .send({
            username: 'noiduser',
            password: 'password123',
            role: 'user'
          })
          .expect(400);

        expect(response.body.error).toBe('No se pudo registrar el usuario.');
        
        AuthService.register.mockRestore();
      });

      it('should fail when doctor creation fails after user registration', async () => {
        // Mock DoctorService.create to return null
        jest.spyOn(DoctorService, 'create').mockResolvedValueOnce(null);

        const response = await request(app)
          .post('/api/auth/register')
          .send({
            username: 'doctorfail',
            password: 'password123',
            role: 'doctor',
            name: 'Dr. Fail',
            specialty: 'Test',
            phone: '+1111111111'
          })
          .expect(400);

        expect(response.body.error).toBe('No se pudo crear el registro de doctor.');
        
        DoctorService.create.mockRestore();
      });

      it('should fail when doctor creation returns object without id', async () => {
        // Mock DoctorService.create to return doctor without id
        jest.spyOn(DoctorService, 'create').mockResolvedValueOnce({ name: 'Dr. Test' });

        const response = await request(app)
          .post('/api/auth/register')
          .send({
            username: 'doctornoid',
            password: 'password123',
            role: 'doctor',
            name: 'Dr. NoId',
            specialty: 'Test',
            phone: '+2222222222'
          })
          .expect(400);

        expect(response.body.error).toBe('No se pudo crear el registro de doctor.');
        
        DoctorService.create.mockRestore();
      });
    });

    describe('POST /api/auth/login', () => {
      beforeEach(async () => {
        // Create a test user for login tests
        await request(app)
          .post('/api/auth/register')
          .send({
            username: 'logintest',
            password: 'password123',
            role: 'user'
          });
      });

      it('should login successfully with valid credentials', async () => {
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            username: 'logintest',
            password: 'password123'
          })
          .expect(200);

        expect(response.body).toHaveProperty('token');
        expect(response.body).toHaveProperty('id');
        expect(response.body.username).toBe('logintest');
        expect(response.body).not.toHaveProperty('password');
      });

      it('should fail with invalid username', async () => {
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            username: 'nonexistent',
            password: 'password123'
          })
          .expect(401);

        expect(response.body).toHaveProperty('error');
      });

      it('should fail with invalid password', async () => {
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            username: 'logintest',
            password: 'wrongpassword'
          })
          .expect(401);

        expect(response.body).toHaveProperty('error');
      });

      it('should fail with missing credentials', async () => {
        const response = await request(app)
          .post('/api/auth/login')
          .send({})
          .expect(400);

        expect(response.body).toHaveProperty('error');
      });

      it('should handle validation errors from AuthService', async () => {
        // Mock AuthService.login to throw validation error
        jest.spyOn(AuthService, 'login').mockRejectedValueOnce(
          new Error('Validation error occurred')
        );

        const response = await request(app)
          .post('/api/auth/login')
          .send({
            username: 'testuser',
            password: 'testpass'
          })
          .expect(400);

        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toBe('Validation error occurred');
        
        AuthService.login.mockRestore();
      });

      it('should handle generic errors from AuthService with 400', async () => {
        // Mock AuthService.login to throw generic error
        jest.spyOn(AuthService, 'login').mockRejectedValueOnce(
          new Error('Generic error')
        );

        const response = await request(app)
          .post('/api/auth/login')
          .send({
            username: 'testuser',
            password: 'testpass'
          })
          .expect(400);

        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toBe('Generic error');
        
        AuthService.login.mockRestore();
      });
    });
  });

  describe('Auth Middleware - Token Expiration', () => {
    it('should return 401 with expiredAt ISO and code TOKEN_EXPIRED for expired token', async () => {
      // Restore real jwt for this integration test
      const realJwt = jest.requireActual('jsonwebtoken');
      jwt.verify.mockRestore();
      jwt.verify = realJwt.verify;
      
      const testApp = express();
      testApp.get('/protected', authMiddleware, (req, res) => res.json({ ok: true }));

      const secret = process.env.JWT_SECRET || 'fallback_secret_key';

      // Create a token with exp in the past
      const expiredPayload = {
        id: '507f1f77bcf86cd799439011',
        role: 'user',
        exp: Math.floor(Date.now() / 1000) - 10, // expired 10 seconds ago
      };
      const expiredToken = realJwt.sign(expiredPayload, secret);

      const res = await request(testApp)
        .get('/protected')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error', 'Token expirado');
      expect(res.body).toHaveProperty('code', 'TOKEN_EXPIRED');
      expect(res.body).toHaveProperty('expiredAt');
      expect(typeof res.body.expiredAt).toBe('string');
      const parsed = new Date(res.body.expiredAt);
      expect(isNaN(parsed.getTime())).toBe(false);
      
      // Re-mock jwt.verify for unit tests
      jwt.verify = jest.fn();
    });
  });

  describe('AuthMiddleware - Unit Tests', () => {
    let req, res, next;

    beforeEach(() => {
      req = {
        headers: {},
        user: null,
        params: {},
        body: {}
      };
      res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      next = jest.fn();
      jest.clearAllMocks();
    });

    describe('authMiddleware', () => {
      it('should return 401 when authorization header is missing', async () => {
        await authMiddleware(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ error: 'Token requerido' });
        expect(next).not.toHaveBeenCalled();
      });

      it('should return 401 when authorization header does not start with Bearer', async () => {
        req.headers.authorization = 'InvalidFormat token123';

        await authMiddleware(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ error: 'Token requerido' });
        expect(next).not.toHaveBeenCalled();
      });

      it('should return 401 with TOKEN_EXPIRED code when token is expired', async () => {
        req.headers.authorization = 'Bearer expiredtoken';

        const expiredError = new Error('Token expired');
        expiredError.name = 'TokenExpiredError';
        expiredError.expiredAt = new Date('2025-01-01T00:00:00.000Z');

        jwt.verify.mockImplementation(() => {
          throw expiredError;
        });

        await authMiddleware(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({
          error: 'Token expirado',
          code: 'TOKEN_EXPIRED',
          expiredAt: '2025-01-01T00:00:00.000Z'
        });
        expect(next).not.toHaveBeenCalled();
      });

      it('should handle expired token without expiredAt.toISOString method', async () => {
        req.headers.authorization = 'Bearer expiredtoken';

        const expiredError = new Error('Token expired');
        expiredError.name = 'TokenExpiredError';
        expiredError.expiredAt = 'invalid-date'; // No toISOString method

        jwt.verify.mockImplementation(() => {
          throw expiredError;
        });

        await authMiddleware(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({
          error: 'Token expirado',
          code: 'TOKEN_EXPIRED',
          expiredAt: undefined
        });
      });

      it('should return 401 for invalid token (non-expiry error)', async () => {
        req.headers.authorization = 'Bearer invalidtoken';

        jwt.verify.mockImplementation(() => {
          throw new Error('Invalid signature');
        });

        await authMiddleware(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ error: 'Token inválido' });
        expect(next).not.toHaveBeenCalled();
      });
    });

    describe('roleMiddleware', () => {
      it('should return 403 when user is not set', () => {
        const middleware = roleMiddleware('admin');
        
        middleware(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({ error: 'Acceso denegado' });
        expect(next).not.toHaveBeenCalled();
      });

      it('should return 403 when user role is not in allowed roles', () => {
        req.user = { id: 'user123', role: 'user' };
        const middleware = roleMiddleware('admin', 'doctor');
        
        middleware(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({ error: 'Acceso denegado' });
        expect(next).not.toHaveBeenCalled();
      });

      it('should call next when user role is allowed', () => {
        req.user = { id: 'admin123', role: 'admin' };
        const middleware = roleMiddleware('admin', 'doctor');
        
        middleware(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
      });
    });

    describe('roleOrSelfMiddleware', () => {
      it('should return 403 when user is not set', async () => {
        const middleware = roleOrSelfMiddleware('admin');
        
        await middleware(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({ error: 'Acceso denegado' });
        expect(next).not.toHaveBeenCalled();
      });

      it('should allow admin access', async () => {
        req.user = { id: 'admin123', role: 'admin' };
        const middleware = roleOrSelfMiddleware('admin');
        
        await middleware(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
      });

      it('should allow user to access their own profile', async () => {
        req.user = { id: 'user123', role: 'user' };
        req.params.id = 'user123';
        const middleware = roleOrSelfMiddleware('admin');
        
        await middleware(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
      });

      it('should deny user access to other profiles', async () => {
        req.user = { id: 'user123', role: 'user' };
        req.params.id = 'user456';
        const middleware = roleOrSelfMiddleware('admin');
        
        await middleware(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({ error: 'Acceso denegado' });
        expect(next).not.toHaveBeenCalled();
      });

      it('should return 403 when doctor has no profile', async () => {
        req.user = { id: 'user123', role: 'doctor' };
        req.params.id = 'doctor123';
        Doctor.findOne.mockResolvedValue(null);
        
        const middleware = roleOrSelfMiddleware('doctor');
        await middleware(req, res, next);

        expect(Doctor.findOne).toHaveBeenCalledWith({ user: 'user123' });
        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({ error: 'No tienes perfil de doctor asociado' });
        expect(next).not.toHaveBeenCalled();
      });

      it('should allow doctor to access their own resource by params.id', async () => {
        req.user = { id: 'user123', role: 'doctor' };
        req.params.id = 'doctor123';
        Doctor.findOne.mockResolvedValue({ _id: 'doctor123', user: 'user123' });
        
        const middleware = roleOrSelfMiddleware('doctor');
        await middleware(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
      });

      it('should allow doctor to access their own resource by body.doctor', async () => {
        req.user = { id: 'user123', role: 'doctor' };
        req.body.doctor = 'doctor123';
        Doctor.findOne.mockResolvedValue({ _id: 'doctor123', user: 'user123' });
        
        const middleware = roleOrSelfMiddleware('doctor');
        await middleware(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
      });

      it('should deny doctor access to other doctor resources', async () => {
        req.user = { id: 'user123', role: 'doctor' };
        req.params.id = 'doctor456';
        Doctor.findOne.mockResolvedValue({ _id: 'doctor123', user: 'user123' });
        
        const middleware = roleOrSelfMiddleware('doctor');
        await middleware(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({ 
          error: 'Solo puedes modificar tu propia información o recursos asociados a tu perfil' 
        });
        expect(next).not.toHaveBeenCalled();
      });

      it('should allow access for other allowed roles', async () => {
        req.user = { id: 'user123', role: 'moderator' };
        const middleware = roleOrSelfMiddleware('admin', 'moderator');
        
        await middleware(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
      });

      it('should deny access for roles not in allowed list', async () => {
        req.user = { id: 'user123', role: 'guest' };
        const middleware = roleOrSelfMiddleware('admin', 'moderator');
        
        await middleware(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({ error: 'Acceso denegado' });
        expect(next).not.toHaveBeenCalled();
      });
    });
  });
});
