import { Client } from './client.types';
import { Document } from 'mongoose';

/**
 * Conversation message
 */
export interface ConversationMessage {
  from: string;
  text: string;
  timestamp?: Date;
}

/**
 * Conversation states/steps
 */
export type ConversationStep =
  | 'start'
  | 'awaiting_name'
  | 'awaiting_choice'
  | 'awaiting_doctor'
  | 'select_doctor'
  | 'awaiting_appointment'
  | 'awaiting_cancel_action'
  | 'awaiting_cancel_appointment'
  | 'awaiting_status_list'
  | 'awaiting_status_detail'
  | 'awaiting_confirmation'
  | 'finished'
  | 'completed';

/**
 * Conversation lifecycle state. A conversation is 'closed' once the flow ends,
 * so the bot stays silent until the client sends a new message.
 */
export type ConversationState = 'active' | 'closed';

/**
 * Why a conversation was closed.
 */
export type ConversationCloseReason = 'completed' | 'cancelled' | 'invalid_input' | 'timeout' | 'error' | 'send_failed';

/**
 * Conversation document in database
 */
export interface Conversation extends Document {
  _id: string;
  id?: string;
  client?: string;
  state?: ConversationState;
  currentStep: ConversationStep;
  selectedDoctor?: string | null;
  selectedAppointment?: string | null;
  retryCount?: number;
  version?: number;
  closedAt?: Date;
  closedReason?: ConversationCloseReason;
  messages: ConversationMessage[];
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Conversation response (with populated client)
 */
export interface ConversationResponse {
  id: string;
  client?: Client;
  state?: string;
  currentStep: ConversationStep;
  messages: ConversationMessage[];
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Conversation create/update request
 */
export interface ConversationInput {
  client?: string;
  state?: ConversationState;
  currentStep?: ConversationStep;
  selectedDoctor?: string | null;
  selectedAppointment?: string | null;
  retryCount?: number;
  version?: number;
  messages?: ConversationMessage[];
}

/**
 * Conversation with populated fields (client expanded from ID)
 */
export interface ConversationPopulated extends Omit<Conversation, 'client'> {
  client?: Client;
  _doc?: Record<string, unknown>;
}
