const express = require('express');
const router = express.Router();
const userController = require('../controller/user.controller');
const { authMiddleware, roleMiddleware, roleOrSelfMiddleware } = require('../middlewares/authMiddleware');
const { validatePasswordMiddleware, validateNewPasswordMiddleware } = require('../middlewares/passwordValidator');

/**
 * @openapi
 * tags:
 *   - name: Users
 *     description: User management
 */

/**
 * @openapi
 * /api/users:
 *   get:
 *     tags:
 *       - Users
 *     summary: Get all users (admin only)
 *     responses:
 *       200:
 *         description: List of users
 */
/**
 * @openapi
 * /api/users/{id}:
 *   get:
 *     tags:
 *       - Users
 *     summary: Get user by id
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User object
 */
// Solo admin puede ver todos los usuarios
router.get('/', authMiddleware, roleMiddleware('admin'), userController.getAllUsers);
// Un usuario puede ver su propio perfil, admin puede ver cualquiera
router.get('/:id', authMiddleware, roleOrSelfMiddleware('admin'), userController.getUserById);
// Admin puede crear usuarios
router.post('/', authMiddleware, roleMiddleware('admin'), validatePasswordMiddleware, userController.createUser);
// Usuario puede actualizar su propio perfil, admin puede actualizar cualquiera
router.put('/:id', authMiddleware, roleOrSelfMiddleware('admin'), userController.updateUser);
// Solo admin puede eliminar usuarios
router.delete('/:id', authMiddleware, roleMiddleware('admin'), userController.deleteUser);

router.post('/:id/password', authMiddleware, validateNewPasswordMiddleware, userController.changePassword);

/**
 * @openapi
 * /api/users:
 *   post:
 *     tags:
 *       - Users
 *     summary: Create a new user (admin only)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/User'
 *     responses:
 *       201:
 *         description: User created
 *
 * /api/users/{id}:
 *   put:
 *     tags:
 *       - Users
 *     summary: Update user by id
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/User'
 *     responses:
 *       200:
 *         description: User updated
 *   delete:
 *     tags:
 *       - Users
 *     summary: Delete user by id
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User deleted
 *
 * /api/users/{id}/password:
 *   post:
 *     tags:
 *       - Users
 *     summary: Change password for user
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password changed
 */

module.exports = router;
