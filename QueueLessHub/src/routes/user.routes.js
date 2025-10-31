const express = require('express');
const router = express.Router();
const userController = require('../controller/user.controller');
const { authMiddleware, roleMiddleware, roleOrSelfMiddleware } = require('../middlewares/authMiddleware');

// Solo admin puede ver todos los usuarios
router.get('/', authMiddleware, roleMiddleware('admin'), userController.getAllUsers);
// Un usuario puede ver su propio perfil, admin puede ver cualquiera
router.get('/:id', authMiddleware, roleOrSelfMiddleware('admin'), userController.getUserById);
// Admin puede crear usuarios
router.post('/', authMiddleware, roleMiddleware('admin'), userController.createUser);
// Usuario puede actualizar su propio perfil, admin puede actualizar cualquiera
router.put('/:id', authMiddleware, roleOrSelfMiddleware('admin'), userController.updateUser);
// Solo admin puede eliminar usuarios
router.delete('/:id', authMiddleware, roleMiddleware('admin'), userController.deleteUser);

router.post('/:id/password', authMiddleware, userController.changePassword);

module.exports = router;
