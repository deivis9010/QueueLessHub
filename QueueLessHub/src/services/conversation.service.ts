import type { ConversationCloseReason, ConversationInput, ConversationMessage, ConversationState } from '../types/conversation.types';

import Conversation from '../models/conversation.model';

/**
 * Fields written when a conversation advances one step.
 * `messages` are appended, not replaced.
 */
export interface ConversationAdvance {
  currentStep: string;
  selectedDoctor: string | null;
  retryCount: number;
  state?: ConversationState;
  closedReason?: ConversationCloseReason;
  closedAt?: Date;
  messages: ConversationMessage[];
}

const create = async (data: ConversationInput) => Conversation.create(data);
const getAll = async () => Conversation.find().populate('client');
const getById = async (id: string) => Conversation.findById(id).populate('client');
const update = async (id: string, data: ConversationInput) =>
  Conversation.findByIdAndUpdate(id, data, { new: true }).populate('client');
const remove = async (id: string) => Conversation.findByIdAndDelete(id);

/**
 * Returns the most recent conversation that is still open for the client.
 */
const findActiveByClient = async (clientId: string) =>
  Conversation.findOne({
    client: clientId,
    state: 'active',
    currentStep: { $ne: 'finished' },
  }).sort({ updatedAt: -1 });

/**
 * Applies a step transition only if the document still has the expected version.
 * Returns null when another request changed the conversation first.
 */
const advance = async (id: string, expectedVersion: number, update: ConversationAdvance) => {
  // Documents created before the version field existed have no value stored.
  const versionFilter = expectedVersion === 0 ? { $in: [0, null] } : expectedVersion;
  const { messages, ...fields } = update;

  return Conversation.findOneAndUpdate(
    { _id: id, version: versionFilter },
    {
      $set: fields,
      $inc: { version: 1 },
      $push: { messages: { $each: messages } },
    },
    { new: true }
  );
};

/**
 * Closes an active conversation. The bot stays silent until a new message arrives.
 */
const closeConversation = async (id: string, reason: ConversationCloseReason) =>
  Conversation.updateOne(
    { _id: id, state: 'active' },
    { $set: { state: 'closed', closedReason: reason, closedAt: new Date() } }
  );

export default {
  create,
  getAll,
  getById,
  update,
  remove,
  findActiveByClient,
  advance,
  closeConversation,
};
