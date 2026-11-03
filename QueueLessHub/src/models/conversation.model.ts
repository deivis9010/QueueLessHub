import mongoose from 'mongoose';

type ConversationJson = Record<string, unknown> & {
  _id?: unknown;
  id?: unknown;
};

const conversationSchema = new mongoose.Schema(
  {
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
    // 'active' | 'closed'. Legacy documents may still hold other values.
    state: { type: String, default: 'active' },
    currentStep: String,
    selectedDoctor: { type: String, default: null },
    selectedAppointment: { type: String, default: null },
    retryCount: { type: Number, default: 0 },
    // Incremented on every write; used to detect concurrent updates.
    version: { type: Number, default: 0 },
    closedAt: Date,
    closedReason: String,
    messages: [
      {
        from: { type: String },
        text: { type: String },
        timestamp: { type: Date, default: Date.now },
      },
    ],
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      versionKey: false,
      transform(_doc: unknown, ret: ConversationJson) {
        ret.id = ret._id;
        delete ret._id;
      },
    },
  }
);

conversationSchema.index({ client: 1, state: 1, updatedAt: -1 });

export default mongoose.model('Conversation', conversationSchema);
