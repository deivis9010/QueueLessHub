const express = require('express');
const router = express.Router();
const ClientController = require('../controller/client.controller');
const { authMiddleware, roleMiddleware } = require('../middlewares/authMiddleware');

// Solo admin puede ver todos los clientes
router.get('/', authMiddleware, roleMiddleware('admin'), ClientController.getAllClients);
// Un usuario puede ver cliente por ID
router.get('/:id', authMiddleware, ClientController.getClientById);
// Admin puede crear clientes
router.post('/', authMiddleware, roleMiddleware('admin'), ClientController.createClient);
// Solo admin puede actualizar o eliminar clientes
router.put('/:id', authMiddleware, roleMiddleware('admin'), ClientController.updateClient);
router.delete('/:id', authMiddleware, roleMiddleware('admin'), ClientController.deleteClient);

module.exports = router;
