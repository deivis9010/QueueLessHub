const mongoose = require('mongoose');

const availabilitySchema = new mongoose.Schema({
  doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
  dayOfWeek: { type: Number, required: true }, // 0: domingo, 1: lunes, ...
  startHour: { type: String, required: true }, // formato 'HH:mm'
  endHour: { type: String, required: true },   // formato 'HH:mm'
  active: { type: Boolean, default: true }
});

module.exports = mongoose.model('Availability', availabilitySchema);
