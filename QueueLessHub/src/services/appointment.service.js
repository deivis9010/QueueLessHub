const Appointment = require('../models/appointment.model');

const create = async (data) => Appointment.create(data);
const getAll = async () => Appointment.find();
const getById = async (id) => Appointment.findById(id);
const update = async (id, data) => Appointment.findByIdAndUpdate(id, data, { new: true });
const remove = async (id) => Appointment.findByIdAndDelete(id);
const getNextConfirmedAppointment = async (userId) =>
    Appointment.findOne({ user: userId, confirmed: true }).sort({ date: 1 });
const cancelConfirmedAppointment = async (userId) =>
    Appointment.findOneAndUpdate(
        { user: userId, confirmed: true },
        { confirmed: false, status: 'cancelled' },
        { sort: { date: 1 }, new: true }
    );

module.exports = { create, getAll, getById, update, remove, getNextConfirmedAppointment, cancelConfirmedAppointment };
