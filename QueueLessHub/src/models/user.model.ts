import mongoose from 'mongoose';

type UserJson = Record<string, unknown> & {
  _id?: unknown;
  password?: unknown;
  id?: unknown;
};

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['admin', 'doctor', 'user'], default: 'user' },
    email: { type: String },
    refreshTokens: [
      {
        token: { type: String, required: true },
        createdAt: { type: Date, default: Date.now, expires: 2592000 }, // 30 days TTL
      },
    ],
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      versionKey: false,
      transform(_doc: unknown, ret: UserJson) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.password;
        delete ret.refreshTokens;
      },
    },
  }
);

export default mongoose.model('User', userSchema);
