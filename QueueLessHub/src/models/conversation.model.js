const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
  state: String,
  currentStep: String,
  messages: [{
    from: { type: String },
    text: { type: String },
    timestamp: { type: Date, default: Date.now }
  }]
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

module.exports = mongoose.model('Conversation', conversationSchema);
