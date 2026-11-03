/**
 * Central export file for all application types
 * Organized by model/domain
 */

// Auth types
export type {
  UserRole,
  AuthUser,
  AuthenticatedRequest,
  TokenPair,
  AuthResponse,
  RefreshTokenDoc,
} from './auth.types';

// User types
export type {
  User,
  UserResponse,
  UserRegisterInput,
  UserUpdateInput,
  UserPopulated,
} from './user.types';

// Doctor types
export type { Doctor, DoctorResponse, DoctorInput, DoctorPopulated } from './doctor.types';

// Client types
export type { Client, ClientResponse, ClientInput, ClientWithConversation } from './client.types';

// Availability types
export type {
  Availability,
  AvailabilityResponse,
  AvailabilityInput,
  AvailabilityPopulated,
  AppointmentDuration,
} from './availability.types';

// Appointment types
export type {
  Appointment,
  AppointmentResponse,
  AppointmentInput,
  AppointmentPopulated,
  AppointmentStatus,
} from './appointment.types';

// Conversation types
export type {
  Conversation,
  ConversationResponse,
  ConversationInput,
  ConversationPopulated,
  ConversationMessage,
  ConversationStep,
} from './conversation.types';
