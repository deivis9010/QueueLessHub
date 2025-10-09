const bcrypt = require('bcryptjs');
const User = require('../models/user.model');

const create = async (data) => {
  // Hash password if provided
  if (data.password) {
    data.password = await bcrypt.hash(data.password, 10);
  }
  return User.create(data);
};

const getAll = async () => User.find();
const getById = async (id) => User.findById(id);

const update = async (id, data) => {
  // Hash password if provided in update
  if (data.password) {
    data.password = await bcrypt.hash(data.password, 10);
  }
  return User.findByIdAndUpdate(id, data, { new: true });
};

const remove = async (id) => User.findByIdAndDelete(id);

module.exports = { create, getAll, getById, update, remove };
