const connectDB = require('../config/database');
const { query } = require('../services/postgres');
const Order = require('../models/Order');
const Product = require('../models/Product');

async function ensureProduct(productId){
  const p = await Product.findById(productId).lean();
  if(!p) return;
  await query(
    `INSERT INTO products (id,name,category,price) VALUES ($1,$2,$3,$4)
     ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, category=EXCLUDED.category, price=EXCLUDED.price`,
    [String(p._id), p.name, p.category, p.price]
  );
}

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
      [String(item._id), String(order._id), String(item.product), item.quantity, item.price]
    );
  }
}

async function main(){
  await connectDB();
  const start = process.argv[2] ? new Date(process.argv[2]) : new Date('1970-01-01');
  const end = process.argv[3] ? new Date(process.argv[3]) : new Date();
  const batchSize = 200;
  let synced = 0;
  const cursor = Order.find({ createdAt: { $gte: start, $lte: end } }).cursor();
  for await (const order of cursor){
    try{
      for(const it of order.orderItems||[]) await ensureProduct(it.product);
      await upsertOrder(order);
      synced++;
      if(synced % batchSize === 0) console.log(`synced ${synced}`);
    }catch(e){
      console.error('backfill error', String(order._id), e.message);
    }
  }
  console.log(`backfill completed: ${synced}`);
  process.exit(0);
}

if(require.main===module){ main(); }