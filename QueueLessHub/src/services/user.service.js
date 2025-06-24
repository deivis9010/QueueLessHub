const User = require('../models/user.model');

const create = async (data) => User.create(data);
const getAll = async () => User.find();
const getById = async (id) => User.findById(id);
const update = async (id, data) => User.findByIdAndUpdate(id, data, { new: true });
const remove = async (id) => User.findByIdAndDelete(id);

module.exports = { create, getAll, getById, update, remove };
