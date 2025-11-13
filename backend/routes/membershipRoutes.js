const express = require('express');
const { body } = require('express-validator');
const {
  getAllMembershipLevels,
  createMembershipLevel,
  updateMembershipLevel,
  deleteMembershipLevel,
  getUserMembership,
  getAllMembershipTasks,
  getUserAvailableTasks,
  updateTaskProgress,
  redeemPoints,
  getUserPointsHistory
} = require('../controllers/membershipController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// 会员等级验证规则
const membershipLevelValidation = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('等级名称必须在1-50个字符之间'),
  body('level')
    .isInt({ min: 1, max: 10 })
    .withMessage('等级必须在1-10之间'),
  body('description')
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('等级描述必须在1-500个字符之间'),
  body('upgradeConditions.minPoints')
    .isInt({ min: 0 })
    .withMessage('最低积分必须为非负整数'),
  body('upgradeConditions.minTotalSpent')
    .isFloat({ min: 0 })
    .withMessage('最低消费必须为非负数'),
  body('upgradeConditions.minOrders')
    .isInt({ min: 0 })
    .withMessage('最低订单数必须为非负整数'),
  body('upgradeConditions.minReferrals')
    .optional()
    .isInt({ min: 0 })
    .withMessage('最低推荐数必须为非负整数'),
  body('benefits.discountRate')
    .optional()
    .isInt({ min: 0, max: 100 })
    .withMessage('折扣率必须在0-100之间'),
  body('benefits.pointsMultiplier')
    .optional()
    .isFloat({ min: 1 })
    .withMessage('积分倍数必须大于等于1'),
  body('benefits.freeShippingThreshold')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('免运费门槛必须为非负数')
];

// 积分兑换验证规则
const redeemPointsValidation = [
  body('points')
    .isInt({ min: 1 })
    .withMessage('积分数量必须为正整数'),
  body('reason')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('兑换原因必须在1-200个字符之间'),
  body('orderId')
    .optional()
    .isMongoId()
    .withMessage('订单ID格式无效')
];

// 任务进度更新验证规则
const taskProgressValidation = [
  body('taskId')
    .isMongoId()
    .withMessage('任务ID格式无效'),
  body('progress')
    .isFloat({ min: 0 })
    .withMessage('进度必须为非负数')
];

// ===== 公开路由 =====

// 获取所有会员等级（公开）
router.get('/levels', getAllMembershipLevels);

// 获取用户会员信息（需要登录）
router.get('/user', protect, getUserMembership);

// 获取所有会员任务（公开）
router.get('/tasks', getAllMembershipTasks);

// 获取用户可参与的任务（需要登录）
router.get('/user/tasks', protect, getUserAvailableTasks);

// 更新任务进度（需要登录）
router.post('/user/task-progress', protect, taskProgressValidation, updateTaskProgress);

// 积分兑换（需要登录）
router.post('/user/redeem-points', protect, redeemPointsValidation, redeemPoints);

// 获取用户积分历史（需要登录）
router.get('/user/points-history', protect, getUserPointsHistory);

// ===== 管理员路由 =====

// 创建会员等级（管理员）
router.post('/levels', protect, authorize('admin'), membershipLevelValidation, createMembershipLevel);

// 更新会员等级（管理员）
router.put('/levels/:id', protect, authorize('admin'), membershipLevelValidation, updateMembershipLevel);

// 删除会员等级（管理员）
router.delete('/levels/:id', protect, authorize('admin'), deleteMembershipLevel);

module.exports = router;
