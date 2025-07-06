const mongoose = require('mongoose');
const { update } = require('../services/conversation.service');

const availabilitySchema = new mongoose.Schema({
  doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
  dayOfWeek: { type: Number, required: true }, // 0: domingo, 1: lunes, ...
  startHour: { type: String, required: true }, // formato 'HH:mm'
  endHour: { type: String, required: true },   // formato 'HH:mm'
  // La duración de la cita en minutos
  // formato 'HH:mm'
  duration: { 
    type: Number, 
    required: true, 
    enum: [15, 30, 45, 60], // duración permitida en minutos
  }, 
  createdAt: { type: Date, default: Date.now }, // fecha de creación
  updatedAt: { type: Date, default: Date.now }, // fecha de actualización
  // Si la disponibilidad está activa o no
  // Esto permite desactivar una disponibilidad sin eliminarla
  active: { type: Boolean, default: true }
});

module.exports = mongoose.model('Availability', availabilitySchema);
