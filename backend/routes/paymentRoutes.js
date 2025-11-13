const express = require('express');
const router = express.Router();
const {
  createPayment,
  checkPaymentStatus,
  handleAlipayNotify,
  handleWechatNotify,
  getPaymentMethods
} = require('../controllers/paymentController');

const { protect } = require('../middleware/auth');

// 获取支付方式列表（公开接口）
router.get('/methods', getPaymentMethods);

// 创建支付订单（需要认证）
router.post('/create', protect, createPayment);

// 查询支付状态（需要认证）
router.get('/status/:orderId', protect, checkPaymentStatus);

// 支付宝支付回调（公开接口）
router.post('/alipay/notify', handleAlipayNotify);

// 微信支付回调（公开接口）
router.post('/wechat/notify', handleWechatNotify);

module.exports = router;
