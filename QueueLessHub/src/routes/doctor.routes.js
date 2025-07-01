const express = require('express');
const router = express.Router();
const doctorController = require('../controller/doctor.controller');

router.post('/doctor', doctorController.createDoctor);
router.get('/doctor', doctorController.getAllDoctors);
router.get('/doctor/:id', doctorController.getDoctorById);
router.put('/doctor/:id', doctorController.updateDoctor);
router.delete('/doctor/:id', doctorController.deleteDoctor);

module.exports = router;
