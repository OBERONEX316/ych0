const express = require('express');
const { body, query } = require('express-validator');
const UserBehavior = require('../models/UserBehavior');
const auth = require('../middleware/auth');
const userBehaviorTracker = require('../middleware/userBehaviorTracker');

const router = express.Router();

// 验证中间件
const validateBehavior = [
  body('action').isIn([
    'page_view', 'product_view', 'product_click', 'add_to_cart', 'remove_from_cart',
    'cart_view', 'checkout_start', 'checkout_complete', 'search', 'category_browse',
    'wishlist_add', 'wishlist_remove', 'review_view', 'review_submit', 'login',
    'logout', 'register', 'profile_update', 'order_view', 'order_cancel',
    'refund_request', 'chat_start', 'chat_end', 'coupon_use', 'flash_sale_participate',
    'group_buying_participate', 'social_share', 'recommendation_click', 'recommendation_view'
  ]).withMessage('无效的行为类型'),
  body('targetType').optional().isIn(['product', 'category', 'page', 'search', 'order', 'coupon', 'flash_sale', 'group_buying', 'review', 'chat', 'recommendation']).withMessage('无效的目标类型'),
  body('targetId').optional().isMongoId().withMessage('目标ID必须是有效的MongoDB ID'),
  body('targetData').optional().isObject().withMessage('目标数据必须是对象'),
  body('timestamp').optional().isISO8601().withMessage('时间戳必须是有效的ISO8601格式'),
  body('sessionId').optional().isString().withMessage('会话ID必须是字符串'),
  body('metadata').optional().isObject().withMessage('元数据必须是对象')
];

const validateBatchBehaviors = [
  body('behaviors').isArray({ min: 1, max: 1000 }).withMessage('行为数据必须是数组，长度1-1000'),
  body('behaviors.*.action').isIn([
    'page_view', 'product_view', 'product_click', 'add_to_cart', 'remove_from_cart',
    'cart_view', 'checkout_start', 'checkout_complete', 'search', 'category_browse',
    'wishlist_add', 'wishlist_remove', 'review_view', 'review_submit', 'login',
    'logout', 'register', 'profile_update', 'order_view', 'order_cancel',
    'refund_request', 'chat_start', 'chat_end', 'coupon_use', 'flash_sale_participate',
    'group_buying_participate', 'social_share', 'recommendation_click', 'recommendation_view'
  ]).withMessage('无效的行为类型'),
  body('behaviors.*.targetType').optional().isIn(['product', 'category', 'page', 'search', 'order', 'coupon', 'flash_sale', 'group_buying', 'review', 'chat', 'recommendation']).withMessage('无效的目标类型'),
  body('behaviors.*.targetId').optional().isMongoId().withMessage('目标ID必须是有效的MongoDB ID'),
  body('behaviors.*.targetData').optional().isObject().withMessage('目标数据必须是对象'),
  body('behaviors.*.timestamp').optional().isISO8601().withMessage('时间戳必须是有效的ISO8601格式'),
  body('behaviors.*.sessionId').optional().isString().withMessage('会话ID必须是字符串'),
  body('behaviors.*.metadata').optional().isObject().withMessage('元数据必须是对象')
];

/**
 * 记录单个用户行为
 */
router.post('/', auth, validateBehavior, async (req, res) => {
  try {
    const {
      action,
      targetType,
      targetId,
      targetData = {},
      timestamp,
      sessionId,
      metadata = {}
    } = req.body;

    // 如果用户已登录，使用用户ID，否则使用会话ID
    const userId = req.user?._id || null;
    const finalSessionId = sessionId || req.behaviorTracker?.sessionId || userBehaviorTracker.generateSessionId();

    const behaviorData = {
      userId,
      sessionId: finalSessionId,
      action,
      targetType,
      targetId,
      targetData,
      timestamp: timestamp ? new Date(timestamp) : new Date(),
      metadata: {
        source: metadata.source || 'web',
        version: metadata.version || '1.0.0',
        ...metadata
      }
    };

    const behavior = await userBehaviorTracker.trackBehavior(behaviorData);

    res.json({
      success: true,
      data: behavior,
      message: '用户行为记录成功'
    });
  } catch (error) {
    console.error('记录用户行为失败:', error);
    res.status(500).json({
      success: false,
      message: '记录用户行为失败',
      error: error.message
    });
  }
});

/**
 * 批量记录用户行为（用于前端批量同步）
 */
router.post('/batch', auth, validateBatchBehaviors, async (req, res) => {
  try {
    const { behaviors } = req.body;
    const userId = req.user?._id || null;

    // 为每个行为添加用户ID和处理时间戳
    const processedBehaviors = behaviors.map(behavior => ({
      ...behavior,
      userId,
      timestamp: behavior.timestamp ? new Date(behavior.timestamp) : new Date()
    }));

    const result = await userBehaviorTracker.batchTrackBehaviors(processedBehaviors);

    res.json({
      success: true,
      data: {
        insertedCount: result.length,
        behaviors: result
      },
      message: `成功记录 ${result.length} 条用户行为`
    });
  } catch (error) {
    console.error('批量记录用户行为失败:', error);
    res.status(500).json({
      success: false,
      message: '批量记录用户行为失败',
      error: error.message
    });
  }
});

/**
 * 获取当前用户的行为历史
 */
router.get('/my-history', auth, async (req, res) => {
  try {
    const { page = 1, limit = 20, action, timeRange = '30d' } = req.query;
    
    const dateLimit = new Date();
    const days = parseInt(timeRange.replace('d', ''));
    dateLimit.setDate(dateLimit.getDate() - days);

    const matchStage = {
      userId: req.user._id,
      timestamp: { $gte: dateLimit }
    };

    if (action) {
      matchStage.action = action;
    }

    const behaviors = await UserBehavior.find(matchStage)
      .populate('targetData.productId', 'name price images')
      .sort({ timestamp: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await UserBehavior.countDocuments(matchStage);

    res.json({
      success: true,
      data: behaviors,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('获取用户行为历史失败:', error);
    res.status(500).json({
      success: false,
      message: '获取用户行为历史失败',
      error: error.message
    });
  }
});

/**
 * 获取用户行为统计（个人）
 */
router.get('/my-stats', auth, async (req, res) => {
  try {
    const { timeRange = '30d' } = req.query;
    const stats = await UserBehavior.getUserStats(req.user._id, timeRange);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('获取用户行为统计失败:', error);
    res.status(500).json({
      success: false,
      message: '获取用户行为统计失败',
      error: error.message
    });
  }
});

/**
 * 更新页面停留时间
 */
router.patch('/update-duration', auth, async (req, res) => {
  try {
    const { pageUrl, duration, sessionId } = req.body;

    if (!pageUrl || duration === undefined) {
      return res.status(400).json({
        success: false,
        message: '页面URL和停留时间不能为空'
      });
    }

    // 找到最近的页面访问记录并更新停留时间
    const recentPageView = await UserBehavior.findOne({
      userId: req.user._id,
      sessionId: sessionId,
      action: 'page_view',
      'targetData.pageUrl': pageUrl
    }).sort({ timestamp: -1 });

    if (recentPageView) {
      recentPageView.targetData.duration = duration;
      await recentPageView.save();

      res.json({
        success: true,
        message: '页面停留时间更新成功'
      });
    } else {
      res.status(404).json({
        success: false,
        message: '未找到对应的页面访问记录'
      });
    }
  } catch (error) {
    console.error('更新页面停留时间失败:', error);
    res.status(500).json({
      success: false,
      message: '更新页面停留时间失败',
      error: error.message
    });
  }
});

/**
 * 清理过期数据（管理员功能）
 */
router.delete('/cleanup', auth, async (req, res) => {
  try {
    // 检查用户权限
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '权限不足'
      });
    }

    const { daysToKeep = 90 } = req.query;
    const result = await userBehaviorTracker.cleanupOldData(parseInt(daysToKeep));

    res.json({
      success: true,
      data: {
        deletedCount: result.deletedCount,
        daysToKeep: daysToKeep
      },
      message: `成功清理了 ${result.deletedCount} 条过期用户行为数据`
    });
  } catch (error) {
    console.error('清理过期用户行为数据失败:', error);
    res.status(500).json({
      success: false,
      message: '清理过期用户行为数据失败',
      error: error.message
    });
  }
});

module.exports = router;