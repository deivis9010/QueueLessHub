const express = require('express');
const router = express.Router();
const appointmentController = require('../controller/appointment.controller');
const { authMiddleware, roleMiddleware, roleOrSelfMiddleware } = require('../middlewares/authMiddleware');

// Solo autenticados pueden ver y crear citas
router.get('/', authMiddleware, appointmentController.getAllAppointments);
router.get('/:id', authMiddleware, appointmentController.getAppointmentById);
router.post('/', authMiddleware, appointmentController.createAppointment);
// Admin puede actualizar/eliminar cualquier cita, doctor solo las suyas
router.put('/:id', authMiddleware, roleOrSelfMiddleware('admin', 'doctor'), appointmentController.updateAppointment);
router.delete('/:id', authMiddleware, roleOrSelfMiddleware('admin', 'doctor'), appointmentController.deleteAppointment);
router.post('/generate', authMiddleware, roleOrSelfMiddleware('admin', 'doctor'),appointmentController.generateAppointmentsFromAvailability);

module.exports = router;
