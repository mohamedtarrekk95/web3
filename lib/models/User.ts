import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  email: string;
  password: string;
  name: string;
  role: 'user' | 'admin';
  createdAt: Date;
  wallets: Array<{
    address: string;
    network: string;
    connectedAt: Date;
  }>;
}

const UserSchema = new Schema<IUser>({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  createdAt: { type: Date, default: Date.now },
  wallets: [{
    address: { type: String, default: '' },
    network: { type: String, default: 'ETH' },
    connectedAt: { type: Date, default: Date.now },
  }],
});

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
