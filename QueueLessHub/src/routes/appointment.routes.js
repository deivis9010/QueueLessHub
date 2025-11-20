const express = require('express');
const router = express.Router();
const appointmentController = require('../controller/appointment.controller');
const { authMiddleware, roleMiddleware, roleOrSelfMiddleware } = require('../middlewares/authMiddleware');

/**
 * @openapi
 * tags:
 *   - name: Appointments
 *     description: Appointment management
 */

/**
 * @openapi
 * /api/appointments:
 *   get:
 *     tags:
 *       - Appointments
 *     summary: Get all appointments
 *     responses:
 *       200:
 *         description: List of appointments
 *   post:
 *     tags:
 *       - Appointments
 *     summary: Create an appointment
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               client:
 *                 type: string
 *               doctor:
 *                 type: string
 *               date:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       200:
 *         description: Appointment created
 */
// Solo autenticados pueden ver y crear citas
router.get('/', authMiddleware, appointmentController.getAllAppointments);
router.get('/:id', authMiddleware, appointmentController.getAppointmentById);
router.post('/', authMiddleware, appointmentController.createAppointment);
// Admin puede actualizar/eliminar cualquier cita, doctor solo las suyas
router.put('/:id', authMiddleware, roleOrSelfMiddleware('admin', 'doctor'), appointmentController.updateAppointment);
router.delete('/:id', authMiddleware, roleOrSelfMiddleware('admin', 'doctor'), appointmentController.deleteAppointment);
router.post('/generate', authMiddleware, roleOrSelfMiddleware('admin', 'doctor'),appointmentController.generateAppointmentsFromAvailability);
router.get('/free/:doctorId', authMiddleware, appointmentController.getFreeAppointmentsForDoctor);

/**
 * @openapi
 * /api/appointments/{id}:
 *   get:
 *     tags:
 *       - Appointments
 *     summary: Get appointment by id
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Appointment object
 *   put:
 *     tags:
 *       - Appointments
 *     summary: Update appointment by id
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
 *         description: Appointment updated
 *   delete:
 *     tags:
 *       - Appointments
 *     summary: Delete appointment by id
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Appointment deleted
 *
 * /api/appointments/generate:
 *   post:
 *     tags:
 *       - Appointments
 *     summary: Generate appointments from availability
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               doctor:
 *                 type: string
 *               weeks:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Appointments generated
 *
 * /api/appointments/free/{doctorId}:
 *   get:
 *     tags:
 *       - Appointments
 *     summary: Get free appointments for a doctor
 *     parameters:
 *       - in: path
 *         name: doctorId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of free appointments
 */

module.exports = router;
