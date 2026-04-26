import mongoose from 'mongoose';

type DoctorJson = Record<string, unknown> & {
  _id?: unknown;
  id?: unknown;
};

const doctorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    specialty: { type: String },
    phone: { type: String },
    active: { type: Boolean, default: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      versionKey: false,
      transform(_doc: unknown, ret: DoctorJson) {
        ret.id = ret._id;
        delete ret._id;
      },
    },
  }
);

export default mongoose.model('Doctor', doctorSchema);
