import mongoose from 'mongoose';

type ConversationJson = Record<string, unknown> & {
  _id?: unknown;
  id?: unknown;
};

const conversationSchema = new mongoose.Schema(
  {
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
    state: String,
    currentStep: String,
    selectedDoctor: { type: String, default: null },
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

export default mongoose.model('Conversation', conversationSchema);
