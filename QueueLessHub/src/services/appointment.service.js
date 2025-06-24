const Appointment = require('../models/appointment.model');

const create = async (data) => Appointment.create(data);
const getAll = async () => Appointment.find();
const getById = async (id) => Appointment.findById(id);
const update = async (id, data) => Appointment.findByIdAndUpdate(id, data, { new: true });
const remove = async (id) => Appointment.findByIdAndDelete(id);

module.exports = { create, getAll, getById, update, remove };
