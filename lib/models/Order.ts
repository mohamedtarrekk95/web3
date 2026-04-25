import mongoose, { Schema, Document } from 'mongoose';

export interface IOrder extends Document {
  orderId: string;
  userId?: mongoose.Types.ObjectId;
  type: 'exchange' | 'p2p_buy' | 'p2p_sell';
  fromCoin: string;
  toCoin: string;
  amountSent: number;
  amountReceived: number;
  walletAddress: string;
  receivingAddress: string;
  status: 'pending' | 'accepted' | 'rejected' | 'completed' | 'cancelled';
  adminNote: string;
  paymentMethod: string;
  telegramUsername: string;
  txid: string;
  createdAt: Date;
  platformFee?: number;
  platformFeeCurrency?: string;
  platformFeeWallet?: string;
  aggregator?: string;
}

const OrderSchema = new Schema<IOrder>({
  orderId: { type: String, required: true, unique: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User' },
  type: { type: String, enum: ['exchange', 'p2p_buy', 'p2p_sell'], default: 'exchange' },
  fromCoin: { type: String, required: true },
  toCoin: { type: String, required: true },
  amountSent: { type: Number, required: true },
  amountReceived: { type: Number, required: true },
  walletAddress: { type: String, required: true },
  receivingAddress: { type: String, default: '' },
  status: { type: String, enum: ['pending', 'accepted', 'rejected', 'completed', 'cancelled'], default: 'pending' },
  adminNote: { type: String, default: '' },
  paymentMethod: { type: String, default: '' },
  telegramUsername: { type: String, default: '' },
  txid: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
  platformFee: { type: Number, default: 0 },
  platformFeeCurrency: { type: String, default: '' },
  platformFeeWallet: { type: String, default: '' },
  aggregator: { type: String, default: '' },
});

export default mongoose.models.Order || mongoose.model<IOrder>('Order', OrderSchema);