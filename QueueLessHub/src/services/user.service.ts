import bcrypt from 'bcryptjs';
import type { UserUpdateInput } from '../types/user.types';

import User from '../models/user.model';
import { stripOperatorKeys } from '../utils/queryGuards';

type UserData = UserUpdateInput;

const create = async (data: UserData) => {
  const payload = stripOperatorKeys(data);
  if (payload.password) {
    payload.password = await bcrypt.hash(payload.password, 10);
  }

  return User.create(payload);
};

const getAll = async () => User.find();
const getById = async (id: string) => {
  if (typeof id !== 'string') throw new Error('ID inválido');
  return User.findById(id);
};

const update = async (id: string, data: UserData) => {
  if (typeof id !== 'string') throw new Error('ID inválido');
  const payload = stripOperatorKeys(data);
  if (payload.password) {
    payload.password = await bcrypt.hash(payload.password, 10);
  }

  return User.findByIdAndUpdate(id, payload, { new: true });
};

const remove = async (id: string) => {
  if (typeof id !== 'string') throw new Error('ID inválido');
  return User.findByIdAndDelete(id);
};

const changePassword = async (id: string, newPassword: string) => {
  if (typeof id !== 'string') throw new Error('ID inválido');
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  return User.findByIdAndUpdate(id, { password: hashedPassword }, { new: true });
};

export default { create, getAll, getById, update, remove, changePassword };
