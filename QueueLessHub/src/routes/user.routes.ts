import express from 'express';

import userController from '../controller/user.controller';
import {
  authMiddleware,
  roleMiddleware,
  roleOrSelfMiddleware,
} from '../middlewares/authMiddleware';
import {
  validatePasswordMiddleware,
  validateNewPasswordMiddleware,
} from '../middlewares/passwordValidator';

const router = express.Router();

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
router.get('/', authMiddleware, roleMiddleware('admin'), userController.getAllUsers);
router.get('/:id', authMiddleware, roleOrSelfMiddleware('admin'), userController.getUserById);
router.post(
  '/',
  authMiddleware,
  roleMiddleware('admin'),
  validatePasswordMiddleware,
  userController.createUser
);
router.put('/:id', authMiddleware, roleOrSelfMiddleware('admin'), userController.updateUser);
router.delete('/:id', authMiddleware, roleMiddleware('admin'), userController.deleteUser);
router.post(
  '/:id/password',
  authMiddleware,
  validateNewPasswordMiddleware,
  userController.changePassword
);

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

export default router;
