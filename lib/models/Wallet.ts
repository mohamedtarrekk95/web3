import mongoose, { Schema, Document } from 'mongoose';

export interface IWallet extends Document {
  coinSymbol: string;
  address: string;
  qrCodeUrl: string;
}

const WalletSchema = new Schema<IWallet>({
  coinSymbol: { type: String, required: true, unique: true, uppercase: true },
  address: { type: String, required: true },
  qrCodeUrl: { type: String, default: '' },
});

export default mongoose.models.Wallet || mongoose.model<IWallet>('Wallet', WalletSchema);
