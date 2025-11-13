CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  price NUMERIC NOT NULL
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  created_at TIMESTAMP NOT NULL,
  status TEXT NOT NULL,
  total_price NUMERIC NOT NULL
);

CREATE TABLE IF NOT EXISTS order_items (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id),
  product_id TEXT NOT NULL REFERENCES products(id),
  quantity INT NOT NULL,
  unit_price NUMERIC NOT NULL
);

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_daily_revenue AS
SELECT DATE(created_at) AS day, SUM(total_price) AS revenue
FROM orders
GROUP BY day
WITH NO DATA;

CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_order_items_product ON order_items(product_id);