const mongoose = require('mongoose');

const syncStateSchema = new mongoose.Schema({
  key: { type: String, unique: true, required: true },
  value: { type: String },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('SyncState', syncStateSchema);
