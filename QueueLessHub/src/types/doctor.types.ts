import { User } from './user.types';

/**
 * Doctor document in database
 */
export interface Doctor {
  _id?: string;
  id?: string;
  name: string;
  specialty?: string;
  phone?: string;
  active: boolean;
  user: string;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Doctor response (with populated user)
 */
export interface DoctorResponse {
  id: string;
  name: string;
  specialty?: string;
  phone?: string;
  active: boolean;
  user: User;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Doctor create/update request
 */
export interface DoctorInput {
  name?: string;
  specialty?: string;
  phone?: string;
  active?: boolean;
  user?: string;
}

/**
 * Doctor with populated fields (user expanded from ID)
 */
export interface DoctorPopulated extends Omit<Doctor, 'user'> {
  user: User;
  _doc?: Record<string, unknown>;
}
