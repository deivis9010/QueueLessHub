const DoctorService = require('../services/doctor.service');

exports.createDoctor = async (req, res) => {
  try {
    const doctor = await DoctorService.create(req.body);
    res.status(201).json(doctor);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getAllDoctors = async (req, res) => {
  try {
    const doctors = await DoctorService.getAll();
    res.json(doctors);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getDoctorById = async (req, res) => {
  try {
    const doctor = await DoctorService.getById(req.params.id);
    if (!doctor) return res.status(404).json({ error: 'Doctor no encontrado' });
    res.json(doctor);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateDoctor = async (req, res) => {
  try {
    const doctor = await DoctorService.update(req.params.id, req.body);
    if (!doctor) return res.status(404).json({ error: 'Doctor no encontrado' });
    res.json(doctor);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteDoctor = async (req, res) => {
  try {
    const doctor = await DoctorService.remove(req.params.id);
    if (!doctor) return res.status(404).json({ error: 'Doctor no encontrado' });
    res.json({ message: 'Doctor eliminado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
