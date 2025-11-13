const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  experiment: { type: mongoose.Schema.Types.ObjectId, ref: 'Experiment', index: true },
  variant: { type: String },
  type: { type: String },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  sessionId: { type: String },
  createdAt: { type: Date, default: Date.now }
});
module.exports = mongoose.model('ExperimentEvent', schema);