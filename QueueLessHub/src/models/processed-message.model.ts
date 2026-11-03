import mongoose from 'mongoose';

const SEVEN_DAYS_IN_SECONDS = 7 * 24 * 60 * 60;

/**
 * WhatsApp message ids (wamid) already handled by the webhook.
 * Used to ignore retried or duplicated deliveries.
 */
const processedMessageSchema = new mongoose.Schema({
  wamid: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now },
});

processedMessageSchema.index({ createdAt: 1 }, { expireAfterSeconds: SEVEN_DAYS_IN_SECONDS });

export default mongoose.model('ProcessedMessage', processedMessageSchema);
