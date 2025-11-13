const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  experiment: { type: mongoose.Schema.Types.ObjectId, ref: 'Experiment', index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  sessionId: { type: String },
  variant: { type: String },
  createdAt: { type: Date, default: Date.now }
});
module.exports = mongoose.model('ExperimentAssignment', schema);