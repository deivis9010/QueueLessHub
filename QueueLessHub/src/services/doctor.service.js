const Doctor = require('../models/doctor.model');

const create = async (data) => Doctor.create(data);
const getAll = async () => Doctor.find().populate('user', 'username role');
const getById = async (id) => Doctor.findById(id).populate('user', 'username role');
const update = async (id, data) => Doctor.findByIdAndUpdate(id, data, { new: true }).populate('user', 'username role');
const remove = async (id) => Doctor.findByIdAndDelete(id);

module.exports = { create, getAll, getById, update, remove };
