const Client = require('../models/client.model');

const create = async (data) => Client.create(data);
const getAll = async () => Client.find();
const getById = async (id) => Client.findById(id);
const update = async (id, data) => Client.findByIdAndUpdate(id, data, { new: true });
const remove = async (id) => Client.findByIdAndDelete(id);

module.exports = { create, getAll, getById, update, remove };
