// models/TempStore.js
import mongoose from 'mongoose';

const tempStoreSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  value: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, expires: 600 } // Auto-delete after 10 minutes
});

export default mongoose.model('TempStore', tempStoreSchema);
