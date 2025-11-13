const pg = require('../services/postgres');

exports.dailyRevenue = async (req,res)=>{
  try{
    const { start, end } = req.query;
    const rows = await pg.query(
      `SELECT DATE(created_at) AS day, SUM(total_price) AS revenue
       FROM orders
       WHERE created_at BETWEEN COALESCE($1, '1970-01-01') AND COALESCE($2, NOW())
       GROUP BY day
       ORDER BY day ASC`, [start||null, end||null]
    );
    res.setHeader('Cache-Control','public, max-age=60');
    res.json({ success:true, data: rows.rows });
  }catch(e){ res.status(500).json({ success:false, error:e.message }); }
};

exports.categorySales = async (req,res)=>{
  try{
    const rows = await pg.query(
      `SELECT oi.product_id AS product, SUM(oi.quantity*oi.unit_price) AS revenue
       FROM order_items oi
       GROUP BY oi.product_id
       ORDER BY revenue DESC LIMIT 20`);
    res.json({ success:true, data: rows.rows });
  }catch(e){ res.status(500).json({ success:false, error:e.message }); }
};