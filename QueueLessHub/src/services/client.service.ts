import type { ClientInput } from '../types/client.types';

import Client from '../models/client.model';

type ClientData = ClientInput;

const create = async (data: ClientData) => Client.create(data);
const getAll = async () => Client.find();
const getById = async (id: string) => Client.findById(id);
const update = async (id: string, data: ClientData) =>
  Client.findByIdAndUpdate(id, data, { new: true });
const remove = async (id: string) => Client.findByIdAndDelete(id);
const findByPhone = async (phone: string) => Client.findOne({ phone });

export default { create, getAll, getById, update, remove, findByPhone };
