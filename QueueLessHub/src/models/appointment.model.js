const mongoose = require('mongoose');
const { update } = require('../services/client.service');

const appointmentSchema = new mongoose.Schema({
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
  availability: { type: mongoose.Schema.Types.ObjectId, ref: 'Availability', required: true }, // Referencia a la disponibilidad base (ej: lunes 9am)
  date: { type: Date, required: true }, // Fecha específica (ej: 2025-07-01)
  free: { type: Boolean, default: true }, // Si ese horario está libre o no
  hour: { type: String, required: true }, // Hora específica de la cita (formato 'HH:mm')
  notes: { type: String }, // Notas adicionales sobre la cita
  confirmed: { type: Boolean, default: true },
  status: { type: String, default: 'available' } // Estado de la cita (ej: 'available', 'scheduled', 'cancelled')
}, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    versionKey: false,
    transform(doc, ret) {
      ret.id = ret._id;
      delete ret._id;
    }
  }
});

module.exports = mongoose.model('Appointment', appointmentSchema);
