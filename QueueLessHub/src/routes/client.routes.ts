import express from 'express';

import ClientController from '../controller/client.controller';
import { authMiddleware, roleMiddleware } from '../middlewares/authMiddleware';
import { writeLimiter } from '../middlewares/rateLimit.middleware';

const router = express.Router();

/**
 * @openapi
 * tags:
 *   - name: Clients
 *     description: Client management
 */

/**
 * @openapi
 * /api/clients:
 *   get:
 *     tags:
 *       - Clients
 *     summary: Get all clients (admin only)
 *     responses:
 *       200:
 *         description: List of clients
 *   post:
 *     tags:
 *       - Clients
 *     summary: Create a client (admin only)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Client'
 *     responses:
 *       201:
 *         description: Client created
 */
router.get('/', authMiddleware, roleMiddleware('admin'), ClientController.getAllClients);
router.get('/:id', authMiddleware, ClientController.getClientById);
router.post(
  '/',
  authMiddleware,
  writeLimiter,
  roleMiddleware('admin'),
  ClientController.createClient
);
router.put(
  '/:id',
  authMiddleware,
  writeLimiter,
  roleMiddleware('admin'),
  ClientController.updateClient
);
router.delete(
  '/:id',
  authMiddleware,
  writeLimiter,
  roleMiddleware('admin'),
  ClientController.deleteClient
);

/**
 * @openapi
 * /api/clients/{id}:
 *   get:
 *     tags:
 *       - Clients
 *     summary: Get client by id
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Client object
 *   put:
 *     tags:
 *       - Clients
 *     summary: Update client by id
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
 *             $ref: '#/components/schemas/Client'
 *     responses:
 *       200:
 *         description: Client updated
 *   delete:
 *     tags:
 *       - Clients
 *     summary: Delete client by id
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Client deleted
 */

export default router;
