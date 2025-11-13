require('dotenv').config();
const connectDB = require('../config/database');
const { Crawler } = require('../crawler');
const mongoPipeline = require('../crawler/pipelines/MongoPipeline');

async function main() {
  await connectDB();
  const port = process.env.PORT || 5000;
  const startUrl = `http://localhost:${port}/api/products?limit=20`;

  const crawler = new Crawler({ concurrency: 2, intervalMs: 100 });
  crawler.use(mongoPipeline);

  crawler.add({
    url: startUrl,
    handler: async (ctx) => {
      const items = [];
      const json = ctx.json || {};
      const arr = Array.isArray(json.data) ? json.data : [];
      for (const p of arr) {
        items.push({ url: `${startUrl}`, status: ctx.status, headers: ctx.headers, data: { productId: String(p._id), name: p.name, price: p.price } });
      }
      return { items };
    }
  });

  await crawler.start();
  process.exit(0);
}

main();
