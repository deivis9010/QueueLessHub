import express from 'express';
import type { Request, Response } from 'express';
import type { AuthUser, AuthenticatedRequest } from '../../types/auth.types';
import request from 'supertest';
import jwt from 'jsonwebtoken';

import app from '../../app';
import User from '../../models/user.model';
import Doctor from '../../models/doctor.model';
import AuthService from '../../services/auth.service';
import DoctorService from '../../services/doctor.service';
import {
  authMiddleware,
  roleMiddleware,
  roleOrSelfMiddleware,
} from '../../middlewares/authMiddleware';

jest.mock('jsonwebtoken', () => ({
  ...jest.requireActual('jsonwebtoken'),
  verify: jest.fn(),
}));

jest.mock('../../models/doctor.model');

describe('Auth - Complete Test Suite', () => {
  describe('Auth Endpoints - Integration Tests', () => {
    describe('POST /api/auth/register', () => {
      it('should register a new user successfully', async () => {
        const userData = {
          username: 'testuser',
          password: 'Str0ng!Pass123',
          role: 'user',
        };

        const response = await request(app).post('/api/auth/register').send(userData).expect(201);

        expect(response.body.user).toHaveProperty('id');
        expect(response.body.user.username).toBe(userData.username);
        expect(response.body.user.role).toBe(userData.role);
        expect(response.body).not.toHaveProperty('password');
      });

      it('should fail with duplicate username', async () => {
        const userData = {
          username: 'duplicate',
          password: 'Str0ng!Pass123',
          role: 'user',
        };

        await request(app).post('/api/auth/register').send(userData).expect(201);

        const response = await request(app).post('/api/auth/register').send(userData).expect(400);

        expect(response.body).toHaveProperty('error');
      });

      it('should fail with missing required fields', async () => {
        const response = await request(app).post('/api/auth/register').send({}).expect(400);

        expect(response.body).toHaveProperty('error');
      });

      it('should handle errors during doctor registration flow', async () => {
        const doctorData = {
          username: 'testdoctor' + Date.now(),
          password: 'Str0ng!Pass123',
          role: 'doctor',
          name: 'Dr. Test',
          specialty: 'Cardiology',
          phone: '+1234567890',
        };

        const response = await request(app).post('/api/auth/register').send(doctorData);

        expect([201, 400]).toContain(response.status);

        if (response.status === 201) {
          expect(response.body.user).toHaveProperty('id');
          expect(response.body.user.role).toBe('doctor');
        } else {
          expect(response.body).toHaveProperty('error');
        }
      });

      it('should fail when AuthService.register returns null user', async () => {
        jest
          .spyOn(AuthService, 'register')
          .mockResolvedValueOnce(null as unknown as Record<string, unknown>);

        const response = await request(app)
          .post('/api/auth/register')
          .send({
            username: 'nulluser',
            password: 'Str0ng!Pass123',
            role: 'user',
          })
          .expect(400);

        expect(response.body.error).toBe('No se pudo registrar el usuario.');
        jest.restoreAllMocks();
      });

      it('should fail when AuthService.register returns user without id', async () => {
        jest
          .spyOn(AuthService, 'register')
          .mockResolvedValueOnce({ username: 'test' } as unknown as Record<string, unknown>);

        const response = await request(app)
          .post('/api/auth/register')
          .send({
            username: 'noiduser',
            password: 'Str0ng!Pass123',
            role: 'user',
          })
          .expect(400);

        expect(response.body.error).toBe('No se pudo registrar el usuario.');
        jest.restoreAllMocks();
      });

      it('should fail when doctor creation fails after user registration', async () => {
        jest.spyOn(DoctorService, 'create').mockResolvedValueOnce(null as never);

        const response = await request(app)
          .post('/api/auth/register')
          .send({
            username: 'doctorfail',
            password: 'Str0ng!Pass123',
            role: 'doctor',
            name: 'Dr. Fail',
            specialty: 'Test',
            phone: '+1111111111',
          })
          .expect(400);

        expect(response.body.error).toBe('No se pudo crear el registro de doctor.');
        jest.restoreAllMocks();
      });

      it('should fail when doctor creation returns object without id', async () => {
        jest.spyOn(DoctorService, 'create').mockResolvedValueOnce({ name: 'Dr. Test' } as never);

        const response = await request(app)
          .post('/api/auth/register')
          .send({
            username: 'doctornoid',
            password: 'Str0ng!Pass123',
            role: 'doctor',
            name: 'Dr. NoId',
            specialty: 'Test',
            phone: '+2222222222',
          })
          .expect(400);

        expect(response.body.error).toBe('No se pudo crear el registro de doctor.');
        jest.restoreAllMocks();
      });
    });

    describe('POST /api/auth/login', () => {
      beforeEach(async () => {
        await request(app).post('/api/auth/register').send({
          username: 'logintest',
          password: 'Str0ng!Pass123',
          role: 'user',
        });
      });

      it('should login successfully with valid credentials', async () => {
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            username: 'logintest',
            password: 'Str0ng!Pass123',
          })
          .expect(200);

        // Verify user data is returned
        expect(response.body).toHaveProperty('id');
        expect(response.body.username).toBe('logintest');
        expect(response.body).not.toHaveProperty('password');

        // Verify tokens are in cookies
        expect(response.headers['set-cookie']).toBeDefined();
        const cookies = response.headers['set-cookie'] as string[];
        expect(cookies.some((c) => c.includes('accessToken'))).toBe(true);
        expect(cookies.some((c) => c.includes('refreshToken'))).toBe(true);

        // Verify tokens are httpOnly
        const accessTokenCookie = cookies.find((c) => c.includes('accessToken'));
        expect(accessTokenCookie).toMatch(/httponly/i);
      });

      it('should fail with invalid username', async () => {
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            username: 'nonexistent',
            password: 'Str0ng!Pass123',
          })
          .expect(401);

        expect(response.body).toHaveProperty('error');
      });

      it('should fail with invalid password', async () => {
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            username: 'logintest',
            password: 'wrongpassword',
          })
          .expect(401);

        expect(response.body).toHaveProperty('error');
      });

      it('should fail with missing credentials', async () => {
        const response = await request(app).post('/api/auth/login').send({}).expect(400);

        expect(response.body).toHaveProperty('error');
      });

      it('should handle validation errors from AuthService', async () => {
        jest
          .spyOn(AuthService, 'login')
          .mockRejectedValueOnce(new Error('Validation error occurred'));

        const response = await request(app)
          .post('/api/auth/login')
          .send({
            username: 'testuser',
            password: 'testpass',
          })
          .expect(400);

        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toBe('Validation error occurred');
        jest.restoreAllMocks();
      });

      it('should handle generic errors from AuthService with 400', async () => {
        jest.spyOn(AuthService, 'login').mockRejectedValueOnce(new Error('Generic error'));

        const response = await request(app)
          .post('/api/auth/login')
          .send({
            username: 'testuser',
            password: 'testpass',
          })
          .expect(400);

        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toBe('Generic error');
        jest.restoreAllMocks();
      });
    });
  });

  describe('Auth Middleware - Token Expiration', () => {
    it('should return 401 with expiredAt ISO and code TOKEN_EXPIRED for expired token', async () => {
      const realJwt = jest.requireActual('jsonwebtoken') as typeof jwt;
      (jwt.verify as jest.Mock).mockRestore?.();
      (jwt as unknown as { verify: jest.Mock }).verify = realJwt.verify as unknown as jest.Mock;

      const testApp = express();
      testApp.get('/protected', authMiddleware, (_req, res) => res.json({ ok: true }));

      const secret = process.env.JWT_SECRET || 'fallback_secret_key';

      const expiredPayload = {
        id: '507f1f77bcf86cd799439011',
        role: 'user',
        exp: Math.floor(Date.now() / 1000) - 10,
      };
      const expiredToken = realJwt.sign(expiredPayload, secret);

      const response = await request(testApp)
        .get('/protected')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Token expirado');
      expect(response.body).toHaveProperty('code', 'TOKEN_EXPIRED');
      expect(response.body).toHaveProperty('expiredAt');
      expect(typeof response.body.expiredAt).toBe('string');
      const parsed = new Date(response.body.expiredAt);
      expect(Number.isNaN(parsed.getTime())).toBe(false);

      (jwt as unknown as { verify: jest.Mock }).verify = jest.fn();
    });
  });

  describe('AuthMiddleware - Unit Tests', () => {
    let req: Partial<Request> & {
      user?: Partial<AuthUser> | null;
      params?: Record<string, string>;
      body?: Record<string, unknown>;
      headers?: Record<string, unknown>;
    };
    let res: Partial<Response> & {
      status: jest.Mock;
      json: jest.Mock;
    };
    let next: jest.Mock;

    beforeEach(() => {
      req = {
        headers: {},
        user: null,
        params: {},
        body: {},
      };
      res = {
        status: jest.fn().mockReturnThis() as jest.Mock,
        json: jest.fn() as jest.Mock,
      };
      next = jest.fn();
      jest.clearAllMocks();
    });

    describe('authMiddleware', () => {
      it('should return 401 when authorization header is missing', async () => {
        await authMiddleware(req as AuthenticatedRequest, res as Response, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ error: 'Token requerido' });
        expect(next).not.toHaveBeenCalled();
      });

      it('should return 401 when authorization header does not start with Bearer', async () => {
        req.headers.authorization = 'InvalidFormat token123';

        await authMiddleware(req as AuthenticatedRequest, res as Response, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ error: 'Token requerido' });
        expect(next).not.toHaveBeenCalled();
      });

      it('should return 401 with TOKEN_EXPIRED code when token is expired', async () => {
        req.headers.authorization = 'Bearer expiredtoken';

        const { TokenExpiredError } = jest.requireActual('jsonwebtoken') as typeof jwt;
        const expiredError = new TokenExpiredError(
          'jwt expired',
          new Date('2025-01-01T00:00:00.000Z')
        );

        (jwt.verify as jest.Mock).mockImplementation(() => {
          throw expiredError;
        });

        await authMiddleware(req as AuthenticatedRequest, res as Response, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({
          error: 'Token expirado',
          code: 'TOKEN_EXPIRED',
          expiredAt: '2025-01-01T00:00:00.000Z',
        });
        expect(next).not.toHaveBeenCalled();
      });

      it('should handle expired token without expiredAt.toISOString method', async () => {
        req.headers.authorization = 'Bearer expiredtoken';

        const { TokenExpiredError } = jest.requireActual('jsonwebtoken') as typeof jwt;
        const expiredError = Object.create(TokenExpiredError.prototype) as Error & {
          name: string;
          expiredAt: unknown;
        };
        expiredError.name = 'TokenExpiredError';
        expiredError.message = 'jwt expired';
        expiredError.expiredAt = 'invalid-date';

        (jwt.verify as jest.Mock).mockImplementation(() => {
          throw expiredError;
        });

        await authMiddleware(req as AuthenticatedRequest, res as Response, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({
          error: 'Token expirado',
          code: 'TOKEN_EXPIRED',
          expiredAt: undefined,
        });
      });

      it('should return 401 for invalid token (non-expiry error)', async () => {
        req.headers.authorization = 'Bearer invalidtoken';

        (jwt.verify as jest.Mock).mockImplementation(() => {
          throw new Error('Invalid signature');
        });

        await authMiddleware(req as AuthenticatedRequest, res as Response, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ error: 'Token inválido' });
        expect(next).not.toHaveBeenCalled();
      });
    });

    describe('roleMiddleware', () => {
      it('should return 403 when user is not set', () => {
        const middleware = roleMiddleware('admin');

        middleware(req as AuthenticatedRequest, res as Response, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({ error: 'Acceso denegado' });
        expect(next).not.toHaveBeenCalled();
      });

      it('should return 403 when user role is not in allowed roles', () => {
        req.user = { id: 'user123', role: 'user' };
        const middleware = roleMiddleware('admin', 'doctor');

        middleware(req as AuthenticatedRequest, res as Response, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({ error: 'Acceso denegado' });
        expect(next).not.toHaveBeenCalled();
      });

      it('should call next when user role is allowed', () => {
        req.user = { id: 'admin123', role: 'admin' };
        const middleware = roleMiddleware('admin', 'doctor');

        middleware(req as AuthenticatedRequest, res as Response, next);

        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
      });
    });

    describe('roleOrSelfMiddleware', () => {
      it('should return 403 when user is not set', async () => {
        const middleware = roleOrSelfMiddleware('admin');

        await middleware(req as AuthenticatedRequest, res as Response, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({ error: 'Acceso denegado' });
        expect(next).not.toHaveBeenCalled();
      });

      it('should allow admin access', async () => {
        req.user = { id: 'admin123', role: 'admin' };
        const middleware = roleOrSelfMiddleware('admin');

        await middleware(req as AuthenticatedRequest, res as Response, next);

        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
      });

      it('should allow user to access their own profile', async () => {
        req.user = { id: 'user123', role: 'user' };
        req.params.id = 'user123';
        const middleware = roleOrSelfMiddleware('admin');

        await middleware(req as AuthenticatedRequest, res as Response, next);

        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
      });

      it('should deny user access to other profiles', async () => {
        req.user = { id: 'user123', role: 'user' };
        req.params.id = 'user456';
        const middleware = roleOrSelfMiddleware('admin');

        await middleware(req as AuthenticatedRequest, res as Response, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({ error: 'Acceso denegado' });
        expect(next).not.toHaveBeenCalled();
      });

      it('should return 403 when doctor has no profile', async () => {
        req.user = { id: 'user123', role: 'doctor' };
        req.params.id = 'doctor123';
        (Doctor.findOne as jest.Mock).mockResolvedValue(null);

        const middleware = roleOrSelfMiddleware('doctor');
        await middleware(req as AuthenticatedRequest, res as Response, next);

        expect(Doctor.findOne).toHaveBeenCalledWith({ user: 'user123' });
        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({ error: 'No tienes perfil de doctor asociado' });
        expect(next).not.toHaveBeenCalled();
      });

      it('should allow doctor to access their own resource by params.id', async () => {
        req.user = { id: 'user123', role: 'doctor' };
        req.params.id = 'doctor123';
        (Doctor.findOne as jest.Mock).mockResolvedValue({ _id: 'doctor123', user: 'user123' });

        const middleware = roleOrSelfMiddleware('doctor');
        await middleware(req as AuthenticatedRequest, res as Response, next);

        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
      });

      it('should allow doctor to access their own resource by body.doctor', async () => {
        req.user = { id: 'user123', role: 'doctor' };
        req.body.doctor = 'doctor123';
        (Doctor.findOne as jest.Mock).mockResolvedValue({ _id: 'doctor123', user: 'user123' });

        const middleware = roleOrSelfMiddleware('doctor');
        await middleware(req as AuthenticatedRequest, res as Response, next);

        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
      });

      it('should deny doctor access to unrelated resource', async () => {
        req.user = { id: 'user123', role: 'doctor' };
        req.params.id = 'doctor999';
        (Doctor.findOne as jest.Mock).mockResolvedValue({ _id: 'doctor123', user: 'user123' });

        const middleware = roleOrSelfMiddleware('doctor');
        await middleware(req as AuthenticatedRequest, res as Response, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({
          error: 'Solo puedes modificar tu propia información o recursos asociados a tu perfil',
        });
        expect(next).not.toHaveBeenCalled();
      });
    });
  });
});
