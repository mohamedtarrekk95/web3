import mongoose, { Schema, Document } from 'mongoose';

export interface ISettings extends Document {
  key: string;
  value: string;
}

const SettingsSchema = new Schema<ISettings>({
  key: { type: String, required: true, unique: true },
  value: { type: String, default: '' },
});

export default mongoose.models.Settings || mongoose.model<ISettings>('Settings', SettingsSchema);