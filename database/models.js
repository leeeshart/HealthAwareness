// database/models.js
import mongoose from 'mongoose';

// Enhanced MongoDB schemas based on provided data structure
const alertLogSchema = new mongoose.Schema({
  disease: { type: String, required: true },
  region_code: { type: String, required: true },
  message: { type: String, required: true },
  sentAt: { type: Date, default: Date.now },
  status: { type: String, default: 'sent' }
});

const userSchema = new mongoose.Schema({
  phone: { type: String, required: true, unique: true },
  region_code: { type: String, required: true },
  lang: { type: String, default: 'en' },
  subscribedAlerts: [{ type: String }],
  createdAt: { type: Date, default: Date.now }
});

const outbreakSchema = new mongoose.Schema({
  disease: { type: String, required: true },
  cases: { type: Number, required: true },
  location: { type: String, required: true },
  date: { type: Date, default: Date.now },
  region_code: { type: String },
  severity: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' }
});

export const AlertLog = mongoose.model('AlertLog', alertLogSchema);
export const User = mongoose.model('User', userSchema);
export const Outbreak = mongoose.model('Outbreak', outbreakSchema);