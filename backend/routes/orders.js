const express = require('express');
const {
  createOrder,
  getUserOrders,
  getOrder,
  updateOrderStatus,
  cancelOrder,
  getAllOrders,
  initiatePayment,
  handlePaymentCallback,
  checkPaymentStatus,
  exportOrders,
  getTrackingInfo,
  getAnalytics,
  exportAnalytics
} = require('../controllers/orderController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// 所有路由都需要认�?router.use(protect);

// POST /api/orders - 创建新订�?router.post('/', createOrder);

// GET /api/orders - 获取用户订单列表
router.get('/', getUserOrders);

// GET /api/orders/:id - 获取单个订单详情
router.get('/:id', getOrder);

// PUT /api/orders/:id/cancel - 取消订单
router.put('/:id/cancel', cancelOrder);

// POST /api/orders/:id/payment - 发起支付
router.post('/:id/payment', initiatePayment);

// POST /api/orders/:id/payment/callback - 支付回调处理
router.post('/:id/payment/callback', handlePaymentCallback);

// GET /api/orders/:id/payment/status - 检查支付状�?router.get('/:id/payment/status', checkPaymentStatus);

// GET /api/orders/:id/tracking - 获取物流跟踪信息
router.get('/:id/tracking', getTrackingInfo);

// 管理员路�?router.use(authorize('admin'));

// GET /api/orders/admin/all - 获取所有订单（管理员）
router.get('/admin/all', getAllOrders);

// PUT /api/orders/:id/status - 更新订单状态（管理员）
router.put('/:id/status', updateOrderStatus);

// GET /api/orders/admin/export - 导出订单数据（管理员�?router.get('/admin/export', exportOrders);

// GET /api/orders/admin/analytics - 获取订单分析数据（管理员�?router.get('/admin/analytics', getAnalytics);

// GET /api/orders/admin/analytics/export - 导出订单分析数据（管理员�?router.get('/admin/analytics/export', exportAnalytics);

module.exports = router;
