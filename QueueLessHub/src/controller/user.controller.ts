import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import type { NextFunction, Request, Response } from 'express';

import UserService from '../services/user.service';

const isValidObjectId = (id: string): boolean => mongoose.Types.ObjectId.isValid(id);

const getAllUsers = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const users = await UserService.getAll();
    res.json(users);
  } catch (error) {
    next(error);
  }
};

const getUserById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.params.id as string;
    if (!isValidObjectId(userId)) {
      res.status(400).json({ error: 'ID de usuario inválido' });
      return;
    }

    const user = await UserService.getById(userId);
    if (!user) {
      res.status(404).json({ error: 'Usuario no encontrado' });
      return;
    }

    res.json(user);
  } catch (error) {
    next(error);
  }
};

const createUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = await UserService.create(req.body as Record<string, unknown>);
    res.status(201).json(user);
  } catch (error: unknown) {
    const maybeError = error as { code?: number; name?: string; message?: string };
    if (maybeError.code === 11000) {
      res.status(400).json({ error: 'El nombre de usuario ya existe' });
      return;
    }
    if (maybeError.name === 'ValidationError') {
      res.status(400).json({ error: maybeError.message });
      return;
    }
    next(error);
  }
};

const updateUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.params.id as string;
    if (!isValidObjectId(userId)) {
      res.status(400).json({ error: 'ID de usuario inválido' });
      return;
    }

    const user = await UserService.update(userId, req.body as Record<string, unknown>);
    if (!user) {
      res.status(404).json({ error: 'Usuario no encontrado' });
      return;
    }

    res.json(user);
  } catch (error: unknown) {
    const maybeError = error as { code?: number; name?: string; message?: string };
    if (maybeError.code === 11000) {
      res.status(400).json({ error: 'El nombre de usuario ya existe' });
      return;
    }
    if (maybeError.name === 'ValidationError') {
      res.status(400).json({ error: maybeError.message });
      return;
    }
    next(error);
  }
};

const deleteUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.params.id as string;
    if (!isValidObjectId(userId)) {
      res.status(400).json({ error: 'ID de usuario inválido' });
      return;
    }

    const user = await UserService.remove(userId);
    if (!user) {
      res.status(404).json({ error: 'Usuario no encontrado' });
      return;
    }

    res.json({ message: 'Usuario eliminado' });
  } catch (error) {
    next(error);
  }
};

const changePassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.params.id as string;
    if (!isValidObjectId(userId)) {
      res.status(400).json({ error: 'ID de usuario inválido' });
      return;
    }

    const user = await UserService.getById(userId);
    if (!user) {
      res.status(404).json({ error: 'Usuario no encontrado' });
      return;
    }

    const { currentPassword, newPassword } = req.body as {
      currentPassword?: string;
      newPassword?: string;
    };
    if (!currentPassword || !newPassword) {
      res.status(400).json({ error: 'Contraseña actual y nueva son requeridas' });
      return;
    }

    const isMatch = await bcrypt.compare(currentPassword, String(user.password));
    if (!isMatch) {
      res.status(401).json({ error: 'Contraseña actual incorrecta' });
      return;
    }

    await UserService.changePassword(userId, newPassword);
    res.json({ message: 'Contraseña actualizada exitosamente' });
  } catch (error) {
    next(error);
  }
};

export default {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  changePassword,
};
