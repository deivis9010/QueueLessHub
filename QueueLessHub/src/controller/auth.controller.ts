import type { NextFunction, Request, Response } from 'express';

import AuthService from '../services/auth.service';
import DoctorService from '../services/doctor.service';

/**
 * Set httpOnly cookie with JWT access token
 */
const setAccessTokenCookie = (res: Response, accessToken: string, refreshToken: string) => {
  const isProduction = process.env.NODE_ENV === 'production';

  // Access token: short-lived (15 minutes)
  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    maxAge: 15 * 60 * 1000, // 15 minutes
  });

  // Refresh token: long-lived (30 days)
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  });
};

const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await AuthService.register(
      req.body as { username?: string; password?: string; role?: string; email?: string }
    );
    if (!user || !(user as { id?: string }).id) {
      res.status(400).json({ error: 'No se pudo registrar el usuario.' });
      return;
    }

    let doctor = null;
    if ((req.body as { role?: string }).role === 'doctor') {
      doctor = await DoctorService.create({
        name: (req.body as { name?: string }).name,
        specialty: (req.body as { specialty?: string }).specialty,
        phone: (req.body as { phone?: string }).phone,
        user: (user as { id: string }).id,
      });

      if (!doctor || !(doctor as { id?: string }).id) {
        res.status(400).json({ error: 'No se pudo crear el registro de doctor.' });
        return;
      }
    }

    res.status(201).json({ user, doctor });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido';
    res.status(400).json({ error: message });
  }
};

const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await AuthService.login(req.body as { username?: string; password?: string });

    const { accessToken, refreshToken, ...userData } = result as Record<string, unknown> & {
      accessToken: string;
      refreshToken: string;
    };

    // Set httpOnly cookies for security (browser will auto-send with requests)
    setAccessTokenCookie(res, accessToken, refreshToken);

    // Also return tokens in body for backward compatibility and flexibility
    // Clients can choose to store in localStorage, sessionStorage, or rely on cookies
    res.json({
      ...userData,
      accessToken,
      refreshToken,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido';
    if (message === 'No autorizado') {
      res.status(401).json({ error: message });
      return;
    }

    if (message.includes('son requeridos')) {
      res.status(400).json({ error: message });
      return;
    }

    res.status(400).json({ error: message });
  }
};

/**
 * Refresh access token endpoint
 */
const refresh = async (req: Request, res: Response): Promise<void> => {
  try {
    const refreshToken =
      req.cookies.refreshToken || (req.body as { refreshToken?: string }).refreshToken;

    if (!refreshToken) {
      res.status(401).json({ error: 'Refresh token es requerido' });
      return;
    }

    const result = await AuthService.refreshAccessToken(refreshToken);
    const {
      accessToken,
      refreshToken: newRefreshToken,
      ...userData
    } = result as Record<string, unknown> & { accessToken: string; refreshToken: string };

    setAccessTokenCookie(res, accessToken, newRefreshToken);

    res.json({
      ...userData,
      accessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido';
    res.status(401).json({ error: message });
  }
};

/**
 * Logout endpoint
 */
const logout = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as Request & { userId?: string }).userId;
    const refreshToken = req.cookies.refreshToken;

    if (userId && refreshToken) {
      await AuthService.logout(String(userId), String(refreshToken));
    }

    // Clear cookies
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');

    res.json({ message: 'Sesión cerrada exitosamente' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido';
    res.status(400).json({ error: message });
  }
};

/**
 * Get CSRF token for current session
 * The token is already set in the X-CSRF-Token cookie by generateCsrfTokenMiddleware
 * Client should include this token in X-CSRF-Token header for state-changing operations
 */
const getCsrfToken = (req: Request, res: Response): void => {
  // Token was generated and set in cookie by middleware
  // We return it in response body as well for client convenience
  const csrfToken = res.locals.csrfToken || '';

  res.json({
    csrfToken,
    message: 'CSRF token retrieved. Include in X-CSRF-Token header for state-changing operations.',
  });
};

export default { register, login, refresh, logout, getCsrfToken };
