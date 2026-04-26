import { Client } from './client.types';

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
  | 'awaiting_cancel_appointment'
  | 'awaiting_confirmation'
  | 'finished'
  | 'completed';

/**
 * Conversation document in database
 */
export interface Conversation {
  _id?: string;
  id?: string;
  client?: string;
  state?: string;
  currentStep: ConversationStep;
  selectedDoctor?: string | null;
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
  state?: string;
  currentStep?: ConversationStep;
  messages?: ConversationMessage[];
}

/**
 * Conversation with populated fields (client expanded from ID)
 */
export interface ConversationPopulated extends Omit<Conversation, 'client'> {
  client?: Client;
  _doc?: Record<string, unknown>;
}
