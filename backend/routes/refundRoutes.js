const express = require('express');
const router = express.Router();
const {
  createRefund,
  getRefundDetail,
  getUserRefunds,
  getAllRefunds,
  processRefund,
  completeRefund,
  getRefundStats,
  addCommunication
} = require('../controllers/refundController');

const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/auth');

// 创建退款申请（需要认证）
router.post('/', protect, createRefund);

// 获取退款详情（需要认证）
router.get('/:refundId', protect, getRefundDetail);

// 获取用户的退款历史（需要认证）
router.get('/user/history', protect, getUserRefunds);

// 添加沟通记录（需要认证）
router.post('/:refundId/communication', protect, addCommunication);

// 获取所有退款申请（需要管理员权限�?router.get('/', protect, authorize(['admin']), getAllRefunds);

// 处理退款申请（需要管理员权限�?router.patch('/:refundId/process', protect, authorize(['admin']), processRefund);

// 完成退款处理（需要管理员权限�?router.patch('/:refundId/complete', protect, authorize(['admin']), completeRefund);

// 获取退款统计（需要管理员权限�?router.get('/stats/summary', protect, authorize(['admin']), getRefundStats);

module.exports = router;
