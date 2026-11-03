import Availability from '../models/availability.model';

type AvailabilityData = Record<string, unknown>;

const create = async (data: AvailabilityData) => Availability.create(data);
const getAll = async () => Availability.find().populate('doctor');
const getById = async (id: string) => Availability.findById(id).populate('doctor');
const update = async (id: string, data: AvailabilityData) =>
  Availability.findByIdAndUpdate(id, data, { new: true }).populate('doctor');
const remove = async (id: string) => Availability.findByIdAndDelete(id);

export default { create, getAll, getById, update, remove };
