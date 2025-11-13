const express = require('express');
const router = express.Router();
const userActivityController = require('../controllers/userActivityController');
const { protect, authorize } = require('../middleware/auth');

// 所有路由都需要认�?router.use(protect);

// 记录单个用户行为
router.post('/track', userActivityController.trackUserActivity);

// 批量记录用户行为
router.post('/track/batch', userActivityController.trackBatchUserActivities);

// 获取用户行为统计
router.get('/stats', userActivityController.getUserActivityStats);

// 分析用户行为模式
router.get('/analyze', userActivityController.analyzeUserPatterns);

// 管理员专属路�?router.use(authorize('admin', 'moderator'));

// 获取实时用户行为�?router.get('/realtime', userActivityController.getRealTimeActivities);

// 动态调整行为权�?router.post('/weights/adjust', userActivityController.adjustWeights);

// 重置权重到默认�?router.post('/weights/reset', userActivityController.resetWeights);

// 获取当前权重配置
router.get('/weights', userActivityController.getCurrentWeights);

// 清理过期数据
router.delete('/cleanup', userActivityController.cleanupOldData);

// 获取权重调整历史
router.get('/weight-adjustment-history', userActivityController.getWeightAdjustmentHistory);

// 手动触发权重优化
router.post('/trigger-weight-optimization', userActivityController.triggerWeightOptimization);

module.exports = router;
