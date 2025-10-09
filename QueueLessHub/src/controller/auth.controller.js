const AuthService = require('../services/auth.service');
const Doctor = require('../models/doctor.model');

exports.register = async (req, res) => {
  try {
    // Si el rol es doctor, crea usuario y doctor asociado solo si el registro fue exitoso
    if (req.body.role === 'doctor') {
      const user = await AuthService.register(req.body);
      if (!user || !user.id) {
        return res.status(400).json({ error: 'No se pudo registrar el usuario doctor.' });
      }
      const doctor = await Doctor.create({
        name: req.body.name,
        specialty: req.body.specialty,
        phone: req.body.phone,
        email: req.body.email,
        user: user.id
      });
      return res.status(201).json({ user, doctor });
    }
    // Registro normal de usuario
    const user = await AuthService.register(req.body);
    res.status(201).json(user);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const result = await AuthService.login(req.body);
    res.json(result);
  } catch (err) {
    // Si el error es de autenticación, usar 401
    if (err.message === 'No autorizado') {
      return res.status(401).json({ error: err.message });
    }
    // Si es error de campos requeridos, usar 400
    if (err.message.includes('son requeridos')) {
      return res.status(400).json({ error: err.message });
    }
    // Otros errores (validación, etc.) usar 400
    res.status(400).json({ error: err.message });
  }
};
