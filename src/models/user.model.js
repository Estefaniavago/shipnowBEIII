import mongoose from 'mongoose';
import { USER_ROLES } from '../constants/index.js';
import { fileMetadataSchema } from './file-metadata.schema.js';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: Object.values(USER_ROLES),
      default: USER_ROLES.USER,
    },
    documents: { type: [fileMetadataSchema], default: [] },
    isMock: { type: Boolean, default: false },
  },
  { timestamps: true }
);

userSchema.index({ role: 1, createdAt: -1 });

export const UserModel = mongoose.model('User', userSchema);
