const express = require('express');
const router = express.Router();
const {
  generateSalesReport,
  generateUserReport,
  generateProductReport,
  getReportTemplates
} = require('../controllers/reportController');

const { protect } = require('../middleware/auth');

// 所有报表路由都需要认�?router.use(protect);

// 生成销售报�?router.post('/sales', generateSalesReport);

// 生成用户分析报表
router.post('/users', generateUserReport);

// 生成商品分析报表
router.post('/products', generateProductReport);

// 获取报表模板列表
router.get('/templates', getReportTemplates);

module.exports = router;
