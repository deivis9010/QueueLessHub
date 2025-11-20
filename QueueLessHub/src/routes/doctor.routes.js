const express = require('express');
const router = express.Router();
const doctorController = require('../controller/doctor.controller');
const { authMiddleware, roleMiddleware, roleOrSelfMiddleware } = require('../middlewares/authMiddleware');

/**
 * @openapi
 * tags:
 *   - name: Doctors
 *     description: Doctor profiles
 */

/**
 * @openapi
 * /api/doctors:
 *   get:
 *     tags:
 *       - Doctors
 *     summary: Get all doctors
 *     responses:
 *       200:
 *         description: List of doctors
 *   post:
 *     tags:
 *       - Doctors
 *     summary: Create a doctor (admin only)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               specialty:
 *                 type: string
 *               phone:
 *                 type: string
 *     responses:
 *       200:
 *         description: Doctor created
 */
// Solo admin puede crear y eliminar doctores
router.post('/', authMiddleware, roleMiddleware('admin'), doctorController.createDoctor);
router.delete('/:id', authMiddleware, roleMiddleware('admin'), doctorController.deleteDoctor);
// Admin puede actualizar cualquier doctor, doctor solo su propio perfil
router.put('/:id', authMiddleware, roleOrSelfMiddleware('admin', 'doctor'), doctorController.updateDoctor);
// Todos los autenticados pueden ver doctores
router.get('/', authMiddleware, doctorController.getAllDoctors);
router.get('/:id', authMiddleware, doctorController.getDoctorById);

/**
 * @openapi
 * /api/doctors/{id}:
 *   get:
 *     tags:
 *       - Doctors
 *     summary: Get doctor by id
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Doctor object
 *   put:
 *     tags:
 *       - Doctors
 *     summary: Update doctor by id
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
 *             type: object
 *     responses:
 *       200:
 *         description: Doctor updated
 *   delete:
 *     tags:
 *       - Doctors
 *     summary: Delete doctor by id
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Doctor deleted
 */

module.exports = router;
