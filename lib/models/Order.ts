import mongoose, { Schema, Document } from 'mongoose';

export interface IOrder extends Document {
  orderId: string;
  fromCoin: string;
  toCoin: string;
  amountSent: number;
  amountReceived: number;
  walletAddress: string;
  status: 'pending' | 'completed';
  createdAt: Date;
}

const OrderSchema = new Schema<IOrder>({
  orderId: { type: String, required: true, unique: true },
  fromCoin: { type: String, required: true },
  toCoin: { type: String, required: true },
  amountSent: { type: Number, required: true },
  amountReceived: { type: Number, required: true },
  walletAddress: { type: String, required: true },
  status: { type: String, enum: ['pending', 'completed'], default: 'pending' },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.Order || mongoose.model<IOrder>('Order', OrderSchema);
