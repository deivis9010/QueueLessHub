const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

const JWT_SECRET = process.env.JWT_SECRET || 'secret';

// Middleware de autenticación
exports.authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token requerido' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    // Opcional: cargar el usuario completo si se requiere
    // req.userData = await User.findById(decoded.id);
    next();
  } catch (err) {
    res.status(401).json({ error: 'Token inválido' });
  }
};

// Middleware de autorización por rol
// Permite acceso solo a usuarios con roles específicos
// Ejemplo: roleMiddleware('admin', 'doctor') permite acceso a admin y doctor
exports.roleMiddleware = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Acceso denegado' });
  }
  next();
};

// Middleware de autorización por rol y propiedad (para doctores)
exports.roleOrSelfMiddleware = (...roles) => async (req, res, next) => {
  if (!req.user) {
    return res.status(403).json({ error: 'Acceso denegado' });
  }
  // Si es admin, acceso total
  if (roles.includes('admin') && req.user.role === 'admin') return next();
  // Si es doctor y accede/modifica solo su propio recurso
  if (roles.includes('doctor') && req.user.role === 'doctor') {
    // El id del usuario autenticado debe coincidir con el id del recurso
    if (req.params.id && req.user.id === req.params.id) return next();
    // Si el id está en el body (por ejemplo, para update)
    if (req.body && req.body._id && req.user.id === req.body._id) return next();
    return res.status(403).json({ error: 'Solo puedes modificar tu propia información' });
  }
  // Otros roles
  if (roles.includes(req.user.role)) return next();
  return res.status(403).json({ error: 'Acceso denegado' });
};
