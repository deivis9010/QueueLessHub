import { Doctor } from './doctor.types';

/**
 * Duration values for appointments in minutes
 */
export type AppointmentDuration = 15 | 30 | 45 | 60;

/**
 * Availability document in database
 */
export interface Availability {
  _id?: string;
  id?: string;
  doctor: string;
  dayOfWeek: number; // 0-6 (Sunday to Saturday)
  startHour: string; // Format: HH:MM
  endHour: string; // Format: HH:MM
  duration: AppointmentDuration;
  active: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Availability response (with populated doctor)
 */
export interface AvailabilityResponse {
  id: string;
  doctor: Doctor;
  dayOfWeek: number;
  startHour: string;
  endHour: string;
  duration: AppointmentDuration;
  active: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Availability create/update request
 */
export interface AvailabilityInput {
  doctor: string;
  dayOfWeek: number;
  startHour: string;
  endHour: string;
  duration: AppointmentDuration;
  active?: boolean;
}

/**
 * Availability with populated fields (doctor expanded from ID)
 */
export interface AvailabilityPopulated extends Omit<Availability, 'doctor'> {
  doctor: Doctor;
  _doc?: Record<string, unknown>;
}
