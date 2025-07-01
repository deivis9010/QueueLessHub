const Availability = require('../models/availability.model');

const create = async (data) => Availability.create(data);
const getAll = async () => Availability.find();
const getById = async (id) => Availability.findById(id);
const update = async (id, data) => Availability.findByIdAndUpdate(id, data, { new: true });
const remove = async (id) => Availability.findByIdAndDelete(id);

module.exports = { create, getAll, getById, update, remove };
