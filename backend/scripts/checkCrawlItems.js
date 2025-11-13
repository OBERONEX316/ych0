require('dotenv').config();
const connectDB = require('../config/database');
const CrawlItem = require('../models/CrawlItem');

async function main() {
  await connectDB();
  const count = await CrawlItem.countDocuments();
  const latest = await CrawlItem.find().sort({ createdAt: -1 }).limit(5).lean();
  console.log('CrawlItem count:', count);
  console.log('Latest 5:', latest.map(x => ({ url: x.url, name: x.data?.name, price: x.data?.price })));
  process.exit(0);
}

main();
