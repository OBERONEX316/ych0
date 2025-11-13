const express = require('express');
const router = express.Router();
const {
  getStockAlerts,
  getStockStatistics,
  updateStockAlertSettings,
  getProductStockAlert,
  exportStockAlertReport
} = require('../controllers/stockAlertController');
const { protect, authorize } = require('../middleware/auth');

// 所有库存预警路由都需要管理员权限
router.use(protect);
router.use(authorize(['admin']));

// 获取库存预警列表
router.get('/alerts', getStockAlerts);

// 获取库存统计信息
router.get('/statistics', getStockStatistics);

// 批量更新库存预警设置
router.patch('/settings', updateStockAlertSettings);

// 获取单个商品的库存预警信�?router.get('/product/:id', getProductStockAlert);

// 导出库存预警报告
router.get('/export', exportStockAlertReport);

module.exports = router;
