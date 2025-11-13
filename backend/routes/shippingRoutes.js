const express = require('express');
const router = express.Router();
const {
  createShipping,
  getShippingDetail,
  getShippingByOrder,
  getUserShippingHistory,
  updateShippingStatus,
  getShippingStats,
  getCarrierStats,
  searchShippings
} = require('../controllers/shippingController');

const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/auth');

// 创建配送订单（需要管理员权限�?router.post('/', protect, authorize(['admin']), createShipping);

// 获取配送详情（需要认证）
router.get('/:shippingId', protect, getShippingDetail);

// 根据订单ID获取配送信息（需要认证）
router.get('/order/:orderId', protect, getShippingByOrder);

// 获取用户的配送历史（需要认证）
router.get('/user/history', protect, getUserShippingHistory);

// 更新配送状态（需要管理员权限�?router.patch('/:shippingId/status', protect, authorize(['admin']), updateShippingStatus);

// 获取配送统计（需要管理员权限�?router.get('/stats/summary', protect, authorize(['admin']), getShippingStats);

// 获取承运商统计（需要管理员权限�?router.get('/stats/carriers', protect, authorize(['admin']), getCarrierStats);

// 搜索配送记录（需要管理员权限�?router.get('/search', protect, authorize(['admin']), searchShippings);

module.exports = router;
