const Client = require('../models/client.model');

const create = async (data) => Client.create(data);
const getAll = async () => Client.find();
const getById = async (id) => Client.findById(id);
const update = async (id, data) => Client.findByIdAndUpdate(id, data, { new: true });
const remove = async (id) => Client.findByIdAndDelete(id);
const findByPhone = async (phone) => Client.findOne({ phone });

module.exports = { create, getAll, getById, update, remove, findByPhone };
