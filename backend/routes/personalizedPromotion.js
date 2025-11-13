const express = require('express');
const router = express.Router();
const {
  getPersonalizedPromotions,
  claimPromotionReward,
  getPromotionStatistics
} = require('../controllers/personalizedPromotionController');
const { protect, authorize } = require('../middleware/auth');

// 所有路由都需要认�?router.use(protect);

// 获取个性化促销
router.get('/promotions/personalized', getPersonalizedPromotions);

// 领取促销奖励
router.post('/promotions/:promotionId/claim', claimPromotionReward);

// 管理员路�?- 获取促销统计
router.get('/admin/promotions/statistics', authorize('admin', 'moderator'), getPromotionStatistics);

module.exports = router;
