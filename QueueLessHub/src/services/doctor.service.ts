import type { DoctorInput } from '../types/doctor.types';

import Doctor from '../models/doctor.model';

type DoctorData = DoctorInput;

const create = async (data: DoctorData) => {
  const doc = await Doctor.create(data);
  return Doctor.findById(doc._id).populate('user', 'username role email');
};

const getAll = async () => Doctor.find().populate('user', 'username role email');
const getById = async (id: string) => Doctor.findById(id).populate('user', 'username role email');
const update = async (id: string, data: DoctorData) =>
  Doctor.findByIdAndUpdate(id, data, { new: true }).populate('user', 'username role email');
const remove = async (id: string) => Doctor.findByIdAndDelete(id);

export default { create, getAll, getById, update, remove };
