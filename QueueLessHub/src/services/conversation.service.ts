import type { ConversationInput } from '../types/conversation.types';

import Conversation from '../models/conversation.model';

const create = async (data: ConversationInput) => Conversation.create(data);
const getAll = async () => Conversation.find().populate('client');
const getById = async (id: string) => Conversation.findById(id).populate('client');
const update = async (id: string, data: ConversationInput) =>
  Conversation.findByIdAndUpdate(id, data, { new: true }).populate('client');
const remove = async (id: string) => Conversation.findByIdAndDelete(id);
const findOneActiveNotFinished = async (clientId: string) =>
  Conversation.findOne({
    client: clientId,
    state: 'active',
    currentStep: { $ne: 'finished' },
  }).populate('client');

export default {
  create,
  getAll,
  getById,
  update,
  remove,
  findOneActiveNotFinished,
};
