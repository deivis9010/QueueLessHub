const AuthService = require('../services/auth.service');

const DoctorService = require('../services/doctor.service');

exports.register = async (req, res) => {
  try {
    const user = await AuthService.register(req.body);
    if (!user || !user.id) {
      return res.status(400).json({ error: 'No se pudo registrar el usuario.' });
    }

    let doctor = null;
    if (req.body.role === 'doctor') {
      doctor = await DoctorService.create({
        name: req.body.name,
        specialty: req.body.specialty,
        phone: req.body.phone,
        user: user.id
      });
      if (!doctor || !doctor.id) {
        return res.status(400).json({ error: 'No se pudo crear el registro de doctor.' });
      }
    }

    res.status(201).json({ user, doctor });
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
