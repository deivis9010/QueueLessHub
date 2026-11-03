import { Client } from './client.types';
import { Availability } from './availability.types';

/**
 * Appointment status
 */
export type AppointmentStatus = 'available' | 'scheduled' | 'cancelled' | 'completed';

/**
 * Appointment document in database
 */
export interface Appointment {
  _id?: string;
  id?: string;
  client?: string;
  availability: string;
  date: Date;
  free: boolean;
  hour: string;
  notes?: string;
  confirmed: boolean;
  status: AppointmentStatus;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Appointment response (with populated relations)
 */
export interface AppointmentResponse {
  id: string;
  client?: Client;
  availability: Availability;
  date: Date;
  free: boolean;
  hour: string;
  notes?: string;
  confirmed: boolean;
  status: AppointmentStatus;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Appointment create/update request
 */
export interface AppointmentInput {
  client?: string | null;
  availability?: string;
  date?: Date;
  free?: boolean;
  hour?: string;
  notes?: string;
  confirmed?: boolean;
  status?: AppointmentStatus;
}

/**
 * Appointment with populated fields (client and availability expanded from IDs)
 */
export interface AppointmentPopulated extends Omit<Appointment, 'client' | 'availability'> {
  client?: Client;
  availability: Availability;
  _doc?: Record<string, unknown>;
}
