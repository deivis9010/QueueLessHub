const bcrypt = require('bcryptjs');
const UserService = require('../services/user.service');
const mongoose = require('mongoose');


// Helper function to validate MongoDB ObjectId
const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

exports.getAllUsers = async (req, res) => {
  try {
    const users = await UserService.getAll();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getUserById = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'ID de usuario inválido' });
    }
    
    const user = await UserService.getById(req.params.id);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createUser = async (req, res) => {
  try {
    const user = await UserService.create(req.body);
    res.status(201).json(user);
  } catch (err) {
    // Handle duplicate username error
    if (err.code === 11000) {
      return res.status(400).json({ error: 'El nombre de usuario ya existe' });
    }
    // Handle validation errors
    if (err.name === 'ValidationError') {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: err.message });
  }
};

exports.updateUser = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'ID de usuario inválido' });
    }
    
    const user = await UserService.update(req.params.id, req.body);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(user);
  } catch (err) {
    // Handle duplicate username error
    if (err.code === 11000) {
      return res.status(400).json({ error: 'El nombre de usuario ya existe' });
    }
    // Handle validation errors
    if (err.name === 'ValidationError') {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: err.message });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'ID de usuario inválido' });
    }
    
    const user = await UserService.remove(req.params.id);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json({ message: 'Usuario eliminado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.changePassword = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {  
      return res.status(400).json({ error: 'ID de usuario inválido' });
    }

    const user = await UserService.getById(req.params.id);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Contraseña actual y nueva son requeridas' });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Contraseña actual incorrecta' });
    }

    await UserService.changePassword(req.params.id, newPassword);
    res.json({ message: 'Contraseña actualizada exitosamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
