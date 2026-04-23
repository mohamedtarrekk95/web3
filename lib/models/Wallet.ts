import mongoose, { Schema, Document } from 'mongoose';

export interface IWallet extends Document {
  symbol: string;
  address: string;
  qrCodeImageUrl: string;
}

const WalletSchema = new Schema<IWallet>({
  symbol: { type: String, required: true, unique: true, uppercase: true },
  address: { type: String, required: true, default: '' },
  qrCodeImageUrl: { type: String, default: '' },
});

export default mongoose.models.Wallet || mongoose.model<IWallet>('Wallet', WalletSchema);