const express = require('express');
const router = express.Router();
const userController = require('../controller/user.controller');
const { authMiddleware, roleMiddleware } = require('../middlewares/authMiddleware');

// Solo admin puede ver todos los usuarios
router.get('/', authMiddleware, roleMiddleware('admin'), userController.getAllUsers);
// Un usuario puede ver su propio perfil, admin puede ver cualquiera
router.get('/:id', authMiddleware, userController.getUserById);
// Registro de usuarios se hace por /api/auth/register
// router.post('/', userController.createUser); // Deshabilitado
// Solo admin puede actualizar o eliminar usuarios
router.put('/:id', authMiddleware, roleMiddleware('admin'), userController.updateUser);
router.delete('/:id', authMiddleware, roleMiddleware('admin'), userController.deleteUser);

module.exports = router;
