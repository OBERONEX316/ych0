const express = require('express');
const { body, param, query } = require('express-validator');
const GroupBuyingController = require('../controllers/groupBuyingController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Validation middleware
const validateGroupBuying = [
  body('name').trim().isLength({ min: 1, max: 100 }).withMessage('活动名称不能为空且不能超过100字符'),
  body('description').trim().isLength({ min: 1, max: 1000 }).withMessage('活动描述不能为空且不能超过1000字符'),
  body('product').isMongoId().withMessage('商品ID必须是有效的MongoDB ID'),
  body('originalPrice').isFloat({ min: 0.01 }).withMessage('原价必须是大于0的数字'),
  body('groupPrice').isFloat({ min: 0.01 }).withMessage('团购价必须是大于0的数字'),
  body('minParticipants').isInt({ min: 2, max: 100 }).withMessage('最少参与人数必须在2-100之间'),
  body('maxParticipants').isInt({ min: 2, max: 1000 }).withMessage('最多参与人数必须在2-1000之间'),
  body('startTime').isISO8601().withMessage('开始时间必须是有效的ISO8601时间格式'),
  body('endTime').isISO8601().withMessage('结束时间必须是有效的ISO8601时间格式'),
  body('maxGroups').isInt({ min: 1, max: 10000 }).withMessage('最大小组数必须在1-10000之间'),
  body('conditions.maxQuantityPerUser').optional().isInt({ min: 1, max: 100 }).withMessage('每人限购数量必须在1-100之间'),
  body('conditions.requireEmailVerification').optional().isBoolean().withMessage('邮箱验证设置必须是布尔值')
];

const validateParticipation = [
  body('groupBuyingId').isMongoId().withMessage('团购活动ID必须是有效的MongoDB ID'),
  body('quantity').isInt({ min: 1, max: 100 }).withMessage('购买数量必须在1-100之间')
];

const validateId = [
  param('id').isMongoId().withMessage('ID必须是有效的MongoDB ID')
];

const validateStatistics = [
  query('timeRange').optional().isIn(['7d', '30d', '90d', '1y']).withMessage('时间范围必须是7d, 30d, 90d, 或1y'),
  query('startDate').optional().isISO8601().withMessage('开始日期必须是有效的ISO8601时间格式'),
  query('endDate').optional().isISO8601().withMessage('结束日期必须是有效的ISO8601时间格式')
];

// Public routes - no authentication required
router.get('/', GroupBuyingController.getAllGroupBuying);
router.get('/active', GroupBuyingController.getActiveGroupBuying);
router.get('/:id', validateId, GroupBuyingController.getGroupBuyingById);

// Protected routes - authentication required
router.post('/:id/participate', protect, GroupBuyingController.joinGroupBuying);
router.get('/my/participations', protect, GroupBuyingController.getUserParticipation);
router.get('/my/groups', protect, GroupBuyingController.getUserParticipation);

// Admin routes - authentication and admin role required
router.post('/', protect, authorize('admin'), validateGroupBuying, GroupBuyingController.createGroupBuying);
router.put('/:id', protect, authorize('admin'), [...validateId, ...validateGroupBuying], GroupBuyingController.updateGroupBuying);
router.delete('/:id', protect, authorize('admin'), validateId, GroupBuyingController.deleteGroupBuying);
router.patch('/:id/cancel', protect, authorize('admin'), validateId, GroupBuyingController.cancelGroupBuying);
router.patch('/:id/end', protect, authorize('admin'), validateId, GroupBuyingController.endGroupBuying);

// Statistics routes
router.get('/statistics/summary', protect, authorize('admin'), validateStatistics, GroupBuyingController.getStatistics);

module.exports = router;
