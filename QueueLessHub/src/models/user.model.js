const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true }, // hashed password
    role: { type: String, enum: ['admin', 'doctor', 'user'], default: 'user' }
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      versionKey: false,
      transform(doc, ret) {
        ret.id = ret._id;
        delete ret._id;
      }
    }
  }
);

module.exports = mongoose.model('User', userSchema);