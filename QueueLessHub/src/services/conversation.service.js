const Conversation = require('../models/conversation.model');

const create = async (data) => Conversation.create(data);
const getAll = async () => Conversation.find().populate('client');
const getById = async (id) => Conversation.findById(id).populate('client');
const update = async (id, data) => Conversation.findByIdAndUpdate(id, data, { new: true }).populate('client');
const remove = async (id) => Conversation.findByIdAndDelete(id);
const findOneActiveNotFinished = async (clientId) => Conversation.findOne({ client: clientId, state: 'active', currentStep: { $ne: 'finished' } }).populate('client');
module.exports = { create, getAll, getById, update, remove, findOneActiveNotFinished };
