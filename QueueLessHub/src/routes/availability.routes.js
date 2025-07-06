const express = require('express');
const router = express.Router();
const availabilityController = require('../controller/availability.controller');
const { authMiddleware, roleMiddleware, roleOrSelfMiddleware } = require('../middlewares/authMiddleware');

// Admin puede crear/editar/eliminar cualquier disponibilidad, doctor solo la suya
router.post('/', authMiddleware, roleOrSelfMiddleware('admin', 'doctor'), availabilityController.createAvailability);
router.put('/:id', authMiddleware, roleOrSelfMiddleware('admin', 'doctor'), availabilityController.updateAvailability);
router.delete('/:id', authMiddleware, roleOrSelfMiddleware('admin', 'doctor'), availabilityController.deleteAvailability);
// Todos los autenticados pueden ver disponibilidad
router.get('/', authMiddleware, availabilityController.getAllAvailabilities);
router.get('/:id', authMiddleware, availabilityController.getAvailabilityById);

module.exports = router;
