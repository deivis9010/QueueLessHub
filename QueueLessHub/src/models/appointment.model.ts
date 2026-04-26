import mongoose from 'mongoose';

type AppointmentJson = Record<string, unknown> & {
  _id?: unknown;
  id?: unknown;
};

const appointmentSchema = new mongoose.Schema(
  {
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
    availability: { type: mongoose.Schema.Types.ObjectId, ref: 'Availability', required: true },
    date: { type: Date, required: true },
    free: { type: Boolean, default: true },
    hour: { type: String, required: true },
    notes: { type: String },
    confirmed: { type: Boolean, default: true },
    status: { type: String, default: 'available' },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      versionKey: false,
      transform(_doc: unknown, ret: AppointmentJson) {
        ret.id = ret._id;
        delete ret._id;
      },
    },
  }
);

export default mongoose.model('Appointment', appointmentSchema);
