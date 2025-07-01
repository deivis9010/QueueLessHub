const User = require('../models/user.model');

const create = async (data) => User.create(data);
const getAll = async () => User.find();
const getById = async (id) => User.findById(id);
const update = async (id, data) => User.findByIdAndUpdate(id, data, { new: true });
const remove = async (id) => User.findByIdAndDelete(id);
const findByPhone = async (_phone) => User.findOne({ phone: _phone });

module.exports = { create, getAll, getById, update, remove, findByPhone };
