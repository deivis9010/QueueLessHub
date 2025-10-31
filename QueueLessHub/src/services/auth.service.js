const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1d';

exports.register = async ({ username, password, role, email }) => {
  // Verifica si el usuario ya existe
  const existing = await User.findOne({ username });
  if (existing) throw new Error('El usuario ya existe');

  // Hashea la contraseña
  const hashedPassword = await bcrypt.hash(password, 10);

  // Crea el usuario
  const user = await User.create({
    username,
    password: hashedPassword,
    role: role || 'user',
    email
  });

  // No retorna la contraseña
  const { password: _, ...userData } = user.toJSON();
  return userData;
};

exports.login = async ({ username, password }) => {
  // Validar campos requeridos
  if (!username || !password) {
    throw new Error('Username y password son requeridos');
  }

  const user = await User.findOne({ username });
  
  if (!user) throw new Error('No autorizado');

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) throw new Error('No autorizado');

  // Genera JWT solo con id y rol
  const token = jwt.sign(
    { id: user._id, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  // No retorna la contraseña
  const { password: _, ...userData } = user.toJSON();
  return { ...userData, token };
};
