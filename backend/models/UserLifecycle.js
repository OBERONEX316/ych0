const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', unique: true },
  recencyDays: { type: Number, default: 0 },
  frequency: { type: Number, default: 0 },
  monetary: { type: Number, default: 0 },
  segment: { type: String, enum: ['platinum','gold','silver','bronze'], default: 'bronze' },
  updatedAt: { type: Date, default: Date.now }
});

schema.index({ segment: 1 });

module.exports = mongoose.model('UserLifecycle', schema);
