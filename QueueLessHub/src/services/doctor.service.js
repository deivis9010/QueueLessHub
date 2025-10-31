const Doctor = require('../models/doctor.model');

const create = async (data) => {
	const doc = await Doctor.create(data);
	return Doctor.findById(doc._id).populate('user', 'username role email');
};
const getAll = async () => Doctor.find().populate('user', 'username role email');
const getById = async (id) => Doctor.findById(id).populate('user', 'username role email');
const update = async (id, data) => Doctor.findByIdAndUpdate(id, data, { new: true }).populate('user', 'username role email');
const remove = async (id) => Doctor.findByIdAndDelete(id);

module.exports = { create, getAll, getById, update, remove };
