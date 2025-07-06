const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema({ 
  name: { type: String, required: false },
  phone: { type: String, required: true },
  status: String, // active, finished 
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Client', clientSchema);
