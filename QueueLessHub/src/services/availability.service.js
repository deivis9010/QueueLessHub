const Availability = require('../models/availability.model');

const create = async (data) => Availability.create(data);
const getAll = async () => Availability.find().populate('doctor');
const getById = async (id) => Availability.findById(id).populate('doctor');
const update = async (id, data) => Availability.findByIdAndUpdate(id, data, { new: true }).populate('doctor');
const remove = async (id) => Availability.findByIdAndDelete(id);

module.exports = { create, getAll, getById, update, remove };
