const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
  state: String,
  currentStep: String,
  messages: [{
    from: { type: String },
    text: { type: String },
    timestamp: { type: Date, default: Date.now }
  }],
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Conversation', conversationSchema);
