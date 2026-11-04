import Availability from '../models/availability.model';
import { stripOperatorKeys } from '../utils/queryGuards';

type AvailabilityData = Record<string, unknown>;

const create = async (data: AvailabilityData) => Availability.create(data);
const getAll = async () => Availability.find().populate('doctor');
const getById = async (id: string) => {
  if (typeof id !== 'string') throw new Error('ID inválido');
  return Availability.findById(id).populate('doctor');
};
const update = async (id: string, data: AvailabilityData) => {
  if (typeof id !== 'string') throw new Error('ID inválido');
  return Availability.findByIdAndUpdate(id, stripOperatorKeys(data), { new: true }).populate(
    'doctor'
  );
};
const remove = async (id: string) => {
  if (typeof id !== 'string') throw new Error('ID inválido');
  return Availability.findByIdAndDelete(id);
};

export default { create, getAll, getById, update, remove };
