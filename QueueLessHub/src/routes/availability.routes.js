const express = require('express');
const router = express.Router();
const availabilityController = require('../controller/availability.controller');

router.post('/availability', availabilityController.createAvailability);
router.get('/availability', availabilityController.getAllAvailabilities);
router.get('/availability/:id', availabilityController.getAvailabilityById);
router.put('/availability/:id', availabilityController.updateAvailability);
router.delete('/availability/:id', availabilityController.deleteAvailability);

module.exports = router;
