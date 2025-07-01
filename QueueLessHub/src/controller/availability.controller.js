const AvailabilityService = require('../services/availability.service');

exports.createAvailability = async (req, res) => {
  try {
    const availability = await AvailabilityService.create(req.body);
    res.status(201).json(availability);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getAllAvailabilities = async (req, res) => {
  try {
    const availabilities = await AvailabilityService.getAll();
    res.json(availabilities);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getAvailabilityById = async (req, res) => {
  try {
    const availability = await AvailabilityService.getById(req.params.id);
    if (!availability) return res.status(404).json({ error: 'Disponibilidad no encontrada' });
    res.json(availability);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateAvailability = async (req, res) => {
  try {
    const availability = await AvailabilityService.update(req.params.id, req.body);
    if (!availability) return res.status(404).json({ error: 'Disponibilidad no encontrada' });
    res.json(availability);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteAvailability = async (req, res) => {
  try {
    const availability = await AvailabilityService.remove(req.params.id);
    if (!availability) return res.status(404).json({ error: 'Disponibilidad no encontrada' });
    res.json({ message: 'Disponibilidad eliminada' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
