const mongoose = require('mongoose');

const doctorDayAvailabilitySchema = new mongoose.Schema({
  availability: { type: mongoose.Schema.Types.ObjectId, ref: 'Availability', required: true }, // Referencia a la disponibilidad base (ej: lunes 9am)
  date: { type: Date, required: true }, // Fecha específica (ej: 2025-07-01)
  free: { type: Boolean, default: true }, // Si ese horario está libre o no
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('DoctorDayAvailability', doctorDayAvailabilitySchema);