const express = require('express');
const router = express.Router();
const doctorController = require('../controller/doctor.controller');
const { authMiddleware, roleMiddleware, roleOrSelfMiddleware } = require('../middlewares/authMiddleware');

// Solo admin puede crear y eliminar doctores
router.post('/', authMiddleware, roleMiddleware('admin'), doctorController.createDoctor);
router.delete('/:id', authMiddleware, roleMiddleware('admin'), doctorController.deleteDoctor);
// Admin puede actualizar cualquier doctor, doctor solo su propio perfil
router.put('/:id', authMiddleware, roleOrSelfMiddleware('admin', 'doctor'), doctorController.updateDoctor);
// Todos los autenticados pueden ver doctores
router.get('/', authMiddleware, doctorController.getAllDoctors);
router.get('/:id', authMiddleware, doctorController.getDoctorById);

module.exports = router;
