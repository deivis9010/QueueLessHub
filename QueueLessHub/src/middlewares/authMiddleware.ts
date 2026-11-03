import jwt, { TokenExpiredError } from 'jsonwebtoken';
import { NextFunction, Response } from 'express';

import Doctor from '../models/doctor.model';
import type { UserRole, AuthUser, AuthenticatedRequest } from '../types/auth.types';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_key';

export const authMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;

  // Prefer httpOnly cookie first, fall back to Authorization header
  let token: string | undefined;

  if (req.cookies?.accessToken) {
    token = req.cookies.accessToken;
  } else if (authHeader && authHeader.startsWith('Bearer ')) {
    const headerToken = authHeader.split(' ')[1];
    // Validate that token is not the literal string "null" or empty
    if (headerToken && headerToken !== 'null' && headerToken.length > 10) {
      token = headerToken;
    }
  }

  if (!token) {
    res.status(401).json({ error: 'Token requerido' });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;
    req.user = decoded;
    next();
  } catch (error) {
    if (error instanceof TokenExpiredError) {
      const expiredAtIso =
        error.expiredAt instanceof Date ? error.expiredAt.toISOString() : undefined;
      res
        .status(401)
        .json({ error: 'Token expirado', code: 'TOKEN_EXPIRED', expiredAt: expiredAtIso });
      return;
    }

    res.status(401).json({ error: 'Token inválido' });
  }
};

/**
 * Middleware to enforce role-based access control
 *
 * Usage:
 *   router.post('/admin-only', roleMiddleware('admin'), controller.adminAction);
 *   router.get('/staff', roleMiddleware('admin', 'doctor'), controller.staffView);
 *
 * @param allowedRoles - Roles that have access to the endpoint
 * @returns Middleware function that validates user role
 */
export const roleMiddleware =
  (...allowedRoles: UserRole[]) =>
  (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !req.user.role || !allowedRoles.includes(req.user.role)) {
      res.status(403).json({ error: 'Acceso denegado' });
      return;
    }

    next();
  };

/**
 * Middleware for role-based access control with self-access pattern
 *
 * Authorization logic (in order):
 * 1. Admin always has access (admin bypass)
 * 2. Users can access their own profile (self-access by user ID)
 * 3. Doctors can access their own resources (self-access by doctor ID)
 * 4. Other allowed roles are checked
 * 5. Default: deny access
 *
 * Usage:
 *   // Admin full access, doctor/user can modify own profile
 *   router.put('/:id', roleOrSelfMiddleware('admin', 'doctor'), controller.update);
 *
 * @param allowedRoles - Roles that can have access (including self-access)
 * @returns Middleware function that validates role or self-access
 */
export const roleOrSelfMiddleware =
  (...allowedRoles: UserRole[]) =>
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    // 1. User must be authenticated
    if (!req.user) {
      res.status(403).json({ error: 'Acceso denegado' });
      return;
    }

    // 2. Admin bypass - admins have access to everything
    if (req.user.role === 'admin') {
      next();
      return;
    }

    // 3. User self-access - regular users can access/modify their own profile
    if (req.user.role === 'user' && req.params.id && req.params.id === String(req.user.id)) {
      next();
      return;
    }

    // 4. Doctor self-access - doctors can access their own doctor profile and associated resources
    if (req.user.role === 'doctor' && allowedRoles.includes('doctor')) {
      const doctor = await Doctor.findOne({ user: req.user.id });

      if (!doctor) {
        res.status(403).json({ error: 'No tienes perfil de doctor asociado' });
        return;
      }

      // Doctor can access by params.id (doctor profile) or by body.doctor (resources like availability)
      const isSelfDoctorProfile = req.params.id && req.params.id === String(doctor._id);
      const isSelfDoctorResource =
        req.body && req.body.doctor && String(req.body.doctor) === String(doctor._id);

      if (isSelfDoctorProfile || isSelfDoctorResource) {
        next();
        return;
      }

      res.status(403).json({
        error: 'Solo puedes modificar tu propia información o recursos asociados a tu perfil',
      });
      return;
    }

    // 5. Check if user role is in allowed roles
    if (req.user.role && allowedRoles.includes(req.user.role)) {
      next();
      return;
    }

    // 6. Default: deny access
    res.status(403).json({ error: 'Acceso denegado' });
  };

// Re-export types for backward compatibility
export type { UserRole, AuthUser, AuthenticatedRequest } from '../types/auth.types';
