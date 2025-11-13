const mongoose = require('mongoose');
let Model;

function ensureModel() {
  if (Model) return Model;
  try {
    Model = mongoose.model('CrawlItem');
  } catch (e) {
    const schema = new mongoose.Schema({
      url: String,
      data: mongoose.Schema.Types.Mixed,
      createdAt: { type: Date, default: Date.now }
    }, { strict: false });
    Model = mongoose.model('CrawlItem', schema);
  }
  return Model;
}

module.exports = {
  type: 'pipeline',
  run: async (item) => {
    const M = ensureModel();
    const doc = new M(item);
    await doc.save();
  }
};
