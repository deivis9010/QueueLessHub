import mongoose from 'mongoose';

type AvailabilityJson = Record<string, unknown> & {
  _id?: unknown;
  id?: unknown;
};

const availabilitySchema = new mongoose.Schema(
  {
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
    dayOfWeek: { type: Number, required: true },
    startHour: { type: String, required: true },
    endHour: { type: String, required: true },
    duration: {
      type: Number,
      required: true,
      enum: [15, 30, 45, 60],
    },
    active: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      versionKey: false,
      transform(_doc: unknown, ret: AvailabilityJson) {
        ret.id = ret._id;
        delete ret._id;
      },
    },
  }
);

export default mongoose.model('Availability', availabilitySchema);
