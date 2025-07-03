const express = require('express');
const router = express.Router();
const availabilityController = require('../controller/availability.controller');

router.post('/', availabilityController.createAvailability);
router.get('/', availabilityController.getAllAvailabilities);
router.get('/:id', availabilityController.getAvailabilityById);
router.put('/:id', availabilityController.updateAvailability);
router.delete('/:id', availabilityController.deleteAvailability);

module.exports = router;
