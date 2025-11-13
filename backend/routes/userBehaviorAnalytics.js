const express = require('express');
const { query, param } = require('express-validator');
const userBehaviorAnalyticsController = require('../controllers/userBehaviorAnalyticsController');
const { protect, authorize } = require('../middleware/auth');
const UserBehavior = require('../models/UserBehavior');

const router = express.Router();

// 验证中间件
const validateTimeRange = [
  query('timeRange').optional().isIn(['7d', '30d', '90d', '1y']).withMessage('时间范围必须是7d, 30d, 90d, 或1y')
];

const validateUserId = [
  query('userId').optional().isMongoId().withMessage('用户ID必须是有效的MongoDB ID')
];

const validatePagination = [
  query('page').optional().isInt({ min: 1 }).withMessage('页码必须是大于0的整数'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('每页数量必须在1-100之间')
];

const validateGroupBy = [
  query('groupBy').optional().isIn(['day', 'week', 'month']).withMessage('分组方式必须是day, week, 或month')
];

// 公开路由 - 用户行为概览（需要认证）
router.get('/overview', 
  protect,
  [...validateTimeRange, ...validateUserId],
  userBehaviorAnalyticsController.getOverview
);

// 用户行为趋势分析
router.get('/trends', 
  protect,
  authorize('admin'),
  [...validateTimeRange, ...validateGroupBy],
  userBehaviorAnalyticsController.getBehaviorTrends
);

// 热门行为分析
router.get('/popular', 
  protect,
  authorize('admin'),
  [...validateTimeRange, query('limit').optional().isInt({ min: 1, max: 100 })],
  userBehaviorAnalyticsController.getPopularBehaviors
);

// 用户行为分布
router.get('/distribution', 
  protect,
  authorize('admin'),
  validateTimeRange,
  userBehaviorAnalyticsController.getBehaviorDistribution
);

// 用户旅程分析
router.get('/journey', 
  protect,
  [...validateUserId, query('sessionId').optional().isString()],
  userBehaviorAnalyticsController.getUserJourney
);

// 转化漏斗分析
router.get('/conversion-funnel', 
  protect,
  authorize('admin'),
  validateTimeRange,
  userBehaviorAnalyticsController.getConversionFunnel
);

// 热力图数据
router.get('/heatmap', 
  protect,
  authorize('admin'),
  [...validateTimeRange, query('pageUrl').optional().isString()],
  userBehaviorAnalyticsController.getHeatmapData
);

// 用户细分分析
router.get('/segmentation', 
  protect,
  authorize('admin'),
  validateTimeRange,
  userBehaviorAnalyticsController.getUserSegmentation
);

// 导出用户行为数据（管理员）
router.get('/export', 
  protect,
  authorize('admin'),
  [
    ...validateTimeRange,
    ...validateUserId,
    query('format').optional().isIn(['csv', 'json']).withMessage('导出格式必须是csv或json')
  ],
  async (req, res) => {
    try {
      const { timeRange = '30d', userId, format = 'json' } = req.query;
      const dateLimit = new Date();
      const days = parseInt(timeRange.replace('d', ''));
      dateLimit.setDate(dateLimit.getDate() - days);

      const matchStage = {
        timestamp: { $gte: dateLimit }
      };

      if (userId) {
        matchStage.userId = require('mongoose').Types.ObjectId(userId);
      }

      const behaviors = await UserBehavior.find(matchStage)
        .populate('userId', 'username email')
        .populate('targetData.productId', 'name price')
        .sort({ timestamp: -1 })
        .limit(10000); // 限制导出数量

      if (format === 'csv') {
        // 转换为CSV格式
        const csvData = behaviors.map(behavior => ({
          时间: behavior.timestamp.toISOString(),
          用户: behavior.userId?.username || '匿名用户',
          行为: behavior.action,
          目标类型: behavior.targetType,
          行为分数: behavior.behaviorScore,
          会话ID: behavior.sessionId,
          行为分类: behavior.behaviorCategory
        }));

        const csvHeaders = Object.keys(csvData[0] || {}).join(',');
        const csvRows = csvData.map(row => Object.values(row).join(','));
        const csvContent = [csvHeaders, ...csvRows].join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="user_behaviors_${Date.now()}.csv"`);
        res.send(csvContent);
      } else {
        res.json({
          success: true,
          data: behaviors,
          count: behaviors.length
        });
      }
    } catch (error) {
      console.error('导出用户行为数据失败:', error);
      res.status(500).json({
        success: false,
        message: '导出用户行为数据失败',
        error: error.message
      });
    }
  }
);

module.exports = router;
