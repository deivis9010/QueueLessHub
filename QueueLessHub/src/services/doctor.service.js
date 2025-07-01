const Doctor = require('../models/doctor.model');

const create = async (data) => Doctor.create(data);
const getAll = async () => Doctor.find();
const getById = async (id) => Doctor.findById(id);
const update = async (id, data) => Doctor.findByIdAndUpdate(id, data, { new: true });
const remove = async (id) => Doctor.findByIdAndDelete(id);

module.exports = { create, getAll, getById, update, remove };
