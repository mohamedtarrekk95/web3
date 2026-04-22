import mongoose, { Schema, Document } from 'mongoose';

export interface ICoin extends Document {
  symbol: string;
  name: string;
  icon: string;
  isActive: boolean;
}

const CoinSchema = new Schema<ICoin>({
  symbol: { type: String, required: true, unique: true, uppercase: true },
  name: { type: String, required: true },
  icon: { type: String, required: true },
  isActive: { type: Boolean, default: true },
});

export default mongoose.models.Coin || mongoose.model<ICoin>('Coin', CoinSchema);
