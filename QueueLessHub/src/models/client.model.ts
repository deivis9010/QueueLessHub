import mongoose from 'mongoose';

type ClientJson = Record<string, unknown> & {
  _id?: unknown;
  id?: unknown;
};

const clientSchema = new mongoose.Schema(
  {
    name: { type: String, required: false },
    phone: { type: String, required: true, unique: true, index: true, trim: true },
    status: String,
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      versionKey: false,
      transform(_doc: unknown, ret: ClientJson) {
        ret.id = ret._id;
        delete ret._id;
      },
    },
  }
);

export default mongoose.model('Client', clientSchema);
