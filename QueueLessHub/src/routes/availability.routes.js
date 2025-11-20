const express = require('express');
const router = express.Router();
const availabilityController = require('../controller/availability.controller');
const { authMiddleware, roleMiddleware, roleOrSelfMiddleware } = require('../middlewares/authMiddleware');

/**
 * @openapi
 * tags:
 *   - name: Availability
 *     description: Doctor availability
 */

/**
 * @openapi
 * /api/availability:
 *   get:
 *     tags:
 *       - Availability
 *     summary: Get all availabilities
 *     responses:
 *       200:
 *         description: List of availabilities
 *   post:
 *     tags:
 *       - Availability
 *     summary: Create availability
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Availability'
 *     responses:
 *       201:
 *         description: Availability created
 */
// Admin puede crear/editar/eliminar cualquier disponibilidad, doctor solo la suya
router.post('/', authMiddleware, roleOrSelfMiddleware('admin', 'doctor'), availabilityController.createAvailability);
router.put('/:id', authMiddleware, roleOrSelfMiddleware('admin', 'doctor'), availabilityController.updateAvailability);
router.delete('/:id', authMiddleware, roleOrSelfMiddleware('admin', 'doctor'), availabilityController.deleteAvailability);
// Todos los autenticados pueden ver disponibilidad
router.get('/', authMiddleware, availabilityController.getAllAvailabilities);
router.get('/:id', authMiddleware, availabilityController.getAvailabilityById);

/**
 * @openapi
 * /api/availability/{id}:
 *   get:
 *     tags:
 *       - Availability
 *     summary: Get availability by id
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Availability object
 *   put:
 *     tags:
 *       - Availability
 *     summary: Update availability by id
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
 *             $ref: '#/components/schemas/Availability'
 *     responses:
 *       200:
 *         description: Availability updated
 *   delete:
 *     tags:
 *       - Availability
 *     summary: Delete availability by id
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Availability deleted
 */

module.exports = router;
