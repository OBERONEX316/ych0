const { Pool } = require('pg');
const pool = new Pool({
  host: process.env.PG_HOST || 'localhost',
  port: parseInt(process.env.PG_PORT || '5432'),
  user: process.env.PG_USER || 'report',
  password: process.env.PG_PASSWORD || 'reportpwd',
  database: process.env.PG_DB || 'reporting',
  max: 5,
});
module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};