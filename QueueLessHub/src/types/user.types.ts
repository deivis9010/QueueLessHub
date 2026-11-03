import { UserRole, RefreshTokenDoc } from './auth.types';

/**
 * User document in database
 */
export interface User {
  _id?: string;
  id?: string;
  username: string;
  email?: string;
  password: string;
  role: UserRole;
  refreshTokens: RefreshTokenDoc[];
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * User without password (for responses)
 */
export interface UserResponse {
  id: string;
  username: string;
  email?: string;
  role: UserRole;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * User registration request
 */
export interface UserRegisterInput {
  username: string;
  email?: string;
  password: string;
  role?: UserRole;
  name?: string;
  specialty?: string;
  phone?: string;
}

/**
 * User update request
 */
export interface UserUpdateInput {
  username?: string;
  email?: string;
  password?: string;
  role?: UserRole;
}

/**
 * User with populated fields
 */
export interface UserPopulated extends User {
  _doc?: Record<string, unknown>;
}
