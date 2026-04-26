import bcrypt from 'bcryptjs';
import type { UserUpdateInput } from '../types/user.types';

import User from '../models/user.model';

type UserData = UserUpdateInput;

const create = async (data: UserData) => {
  const payload = { ...data };
  if (payload.password) {
    payload.password = await bcrypt.hash(payload.password, 10);
  }

  return User.create(payload);
};

const getAll = async () => User.find();
const getById = async (id: string) => User.findById(id);

const update = async (id: string, data: UserData) => {
  const payload = { ...data };
  if (payload.password) {
    payload.password = await bcrypt.hash(payload.password, 10);
  }

  return User.findByIdAndUpdate(id, payload, { new: true });
};

const remove = async (id: string) => User.findByIdAndDelete(id);

const changePassword = async (id: string, newPassword: string) => {
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  return User.findByIdAndUpdate(id, { password: hashedPassword }, { new: true });
};

export default { create, getAll, getById, update, remove, changePassword };
