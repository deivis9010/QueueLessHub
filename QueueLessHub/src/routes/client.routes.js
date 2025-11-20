const express = require('express');
const router = express.Router();
const ClientController = require('../controller/client.controller');
const { authMiddleware, roleMiddleware } = require('../middlewares/authMiddleware');

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
// Solo admin puede ver todos los clientes
router.get('/', authMiddleware, roleMiddleware('admin'), ClientController.getAllClients);
// Un usuario puede ver cliente por ID
router.get('/:id', authMiddleware, ClientController.getClientById);
// Admin puede crear clientes
router.post('/', authMiddleware, roleMiddleware('admin'), ClientController.createClient);
// Solo admin puede actualizar o eliminar clientes
router.put('/:id', authMiddleware, roleMiddleware('admin'), ClientController.updateClient);
router.delete('/:id', authMiddleware, roleMiddleware('admin'), ClientController.deleteClient);

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

module.exports = router;
