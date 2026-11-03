import { JwtPayload } from 'jsonwebtoken';
import { Request } from 'express';

/**
 * User role types for role-based access control
 * - admin: Full system access
 * - doctor: Access to own resources and appointments
 * - user: Access to own profile and appointments
 * - client: Limited external access (webhooks)
 */
export type UserRole = 'admin' | 'doctor' | 'user' | 'client';

/**
 * JWT payload with user information
 */
export type AuthUser = JwtPayload & {
  id?: string;
  role?: UserRole;
};

/**
 * Extended Express Request with authenticated user
 */
export type AuthenticatedRequest = Request & {
  user?: AuthUser;
};

/**
 * Extended Express Request with validated URLs
 */
export type ValidatedRequest = Request & {
  validatedUrl?: URL;
  validatedWebhookUrl?: URL;
};

/**
 * Token pair response (access + refresh)
 */
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

/**
 * Login/Register response
 */
export interface AuthResponse {
  user: {
    id: string;
    username: string;
    email?: string;
    role: UserRole;
  };
  accessToken: string;
  refreshToken: string;
  doctor?: Record<string, unknown>;
}

/**
 * Refresh token document in database
 */
export interface RefreshTokenDoc {
  token: string;
  createdAt: Date;
}
