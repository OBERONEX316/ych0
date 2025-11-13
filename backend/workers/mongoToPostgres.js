const connectDB = require('../config/database');
const { query } = require('../services/postgres');
const Order = require('../models/Order');
const Product = require('../models/Product');
const mongoose = require('mongoose');

async function upsertOrder(order){
  await query(
    `INSERT INTO orders (id,user_id,created_at,status,total_price)
     VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (id) DO UPDATE SET user_id=EXCLUDED.user_id, status=EXCLUDED.status, total_price=EXCLUDED.total_price`,
    [String(order._id), String(order.user), order.createdAt, order.status, order.totalPrice]
  );
  for(const item of order.orderItems||[]){
    await query(
      `INSERT INTO order_items (id,order_id,product_id,quantity,unit_price)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (id) DO UPDATE SET quantity=EXCLUDED.quantity, unit_price=EXCLUDED.unit_price`,
      [String(item._id||new mongoose.Types.ObjectId()), String(order._id), String(item.product), item.quantity, item.price]
    );
  }
}

async function ensureProduct(productId){
  const p = await Product.findById(productId).lean();
  if(!p) return;
  await query(
    `INSERT INTO products (id,name,category,price) VALUES ($1,$2,$3,$4)
     ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, category=EXCLUDED.category, price=EXCLUDED.price`,
    [String(p._id), p.name, p.category, p.price]
  );
}

async function run(){
  await connectDB();
  const pipeline = [{ $match: { operationType: { $in: ['insert','update','replace'] } } }];
  const cs = Order.watch(pipeline, { fullDocument: 'updateLookup' });
  cs.on('change', async (change) => {
    try{
      const doc = change.fullDocument;
      if(!doc) return;
      for(const it of doc.orderItems||[]) await ensureProduct(it.product);
      await upsertOrder(doc);
      console.log('synced', String(doc._id));
    }catch(e){ console.error('sync error', e.message); }
  });
  console.log('worker started');
}

if(require.main===module){ run(); }
module.exports = { run };