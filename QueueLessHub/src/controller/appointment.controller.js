const AppointmentService = require('../services/appointment.service');

exports.getAllAppointments = async (req, res) => {
  try {
    const appointments = await AppointmentService.getAll();
    res.json(appointments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getAppointmentById = async (req, res) => {
  try {
    const appointment = await AppointmentService.getById(req.params.id);
    if (!appointment) return res.status(404).json({ error: 'Cita no encontrada' });
    res.json(appointment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createAppointment = async (req, res) => {
  try {
    const appointment = await AppointmentService.create(req.body);
    res.status(201).json(appointment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateAppointment = async (req, res) => {
  try {
    const appointment = await AppointmentService.update(req.params.id, req.body);
    if (!appointment) return res.status(404).json({ error: 'Cita no encontrada' });
    res.json(appointment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteAppointment = async (req, res) => {
  try {
    const appointment = await AppointmentService.remove(req.params.id);
    if (!appointment) return res.status(404).json({ error: 'Cita no encontrada' });
    res.json({ message: 'Cita eliminada' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.generateAppointmentsFromAvailability = async (req, res) => {
  try {
    const appointments = await AppointmentService.generateAppointmentsFromAvailability(req.body.doctor, req.body.weeks);
    res.status(201).json(appointments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getFreeAppointmentsForDoctor = async (req, res) => {
  try {
    const doctorId = req.params.doctorId || req.body.doctorId;
    if (!doctorId) return res.status(400).json({ error: 'doctorId requerido' });
    const appointments = await AppointmentService.getAllFreeAppointmentsForDoctor(doctorId);
    res.json(appointments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

