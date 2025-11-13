const express = require('express');
const router = express.Router();
const {
  exportUsersToExcel,
  exportOrdersToExcel,
  exportProductsToExcel,
  generateSalesReportPDF,
  exportMultipleData,
  getExportTemplates
} = require('../controllers/exportController');

const { protect } = require('../middleware/auth');

// 所有导出路由都需要认�?router.use(protect);

// 导出用户数据
router.post('/users', exportUsersToExcel);

// 导出订单数据
router.post('/orders', exportOrdersToExcel);

// 导出商品数据
router.post('/products', exportProductsToExcel);

// 生成销售报表PDF
router.post('/sales-report', generateSalesReportPDF);

// 批量导出多种数据
router.post('/bulk', exportMultipleData);

// 获取可用的导出模�?router.get('/templates', getExportTemplates);

module.exports = router;
