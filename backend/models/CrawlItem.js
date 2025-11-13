const mongoose = require('mongoose');

const crawlItemSchema = new mongoose.Schema({
  url: { type: String, index: true },
  status: Number,
  headers: mongoose.Schema.Types.Mixed,
  data: mongoose.Schema.Types.Mixed,
  createdAt: { type: Date, default: Date.now }
}, { strict: false });

module.exports = mongoose.model('CrawlItem', crawlItemSchema);
