import type { ClientInput } from '../types/client.types';

import Client from '../models/client.model';
import { stripOperatorKeys } from '../utils/queryGuards';

type ClientData = ClientInput;

const create = async (data: ClientData) => Client.create(data);
const getAll = async () => Client.find();
const getById = async (id: string) => {
  if (typeof id !== 'string') throw new Error('ID inválido');
  return Client.findById(id);
};
const update = async (id: string, data: ClientData) => {
  if (typeof id !== 'string') throw new Error('ID inválido');
  return Client.findByIdAndUpdate(id, stripOperatorKeys(data), { new: true });
};
const remove = async (id: string) => {
  if (typeof id !== 'string') throw new Error('ID inválido');
  return Client.findByIdAndDelete(id);
};
const findByPhone = async (phone: string) =>
  typeof phone === 'string' ? Client.findOne({ phone }) : null;

export default { create, getAll, getById, update, remove, findByPhone };
