import mongoose from 'mongoose';

/**
 * Replies that could not be delivered to WhatsApp. The outbox worker retries them until they are
 * sent or the attempts run out.
 */
const outboundMessageSchema = new mongoose.Schema(
  {
    conversation: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', default: null },
    to: { type: String, required: true },
    payload: { type: mongoose.Schema.Types.Mixed, required: true },
    // Number of send attempts made so far, including the inline attempt that failed.
    attempts: { type: Number, default: 0 },
    status: { type: String, enum: ['pending', 'sent', 'failed'], default: 'pending' },
    nextAttemptAt: { type: Date, default: Date.now },
    lastError: { type: String, default: null },
  },
  { timestamps: true }
);

outboundMessageSchema.index({ status: 1, nextAttemptAt: 1 });

export default mongoose.model('OutboundMessage', outboundMessageSchema);
