const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema({ 
  name: { type: String, required: false },
  // Enforce unique phone numbers at the schema level and index it for fast lookups
  phone: { type: String, required: true, unique: true, index: true, trim: true },
  status: String // active, finished 
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

module.exports = mongoose.model('Client', clientSchema);
