const mongoose = require('mongoose');
const experimentSchema = new mongoose.Schema({
  key: { type: String, unique: true, required: true },
  variants: [{ name: String, ratio: Number }],
  status: { type: String, enum: ['active','paused','ended'], default: 'active' }
},{timestamps:true});
module.exports = mongoose.model('Experiment', experimentSchema);