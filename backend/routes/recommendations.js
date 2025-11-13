const express = require('express');
const router = express.Router();
const {
  getPersonalizedRecommendations,
  getSimilarProducts,
  getPopularProducts,
  getNewArrivals,
  getRealTimeRecommendations,
  getRecommendationSystemStatus,
  getDeepLearningRecommendations
} = require('../controllers/recommendationController');
const { protect } = require('../middleware/auth');

// 获取个性化推荐（需要登录）
router.get('/personalized', protect, getPersonalizedRecommendations);

// 获取实时推荐（基于最近用户行为）
router.get('/real-time', protect, getRealTimeRecommendations);

// 获取相似商品推荐
router.get('/similar/:productId', getSimilarProducts);

// 获取热门商品
router.get('/popular', getPopularProducts);

// 获取新上架商品
router.get('/new-arrivals', getNewArrivals);

// 获取推荐系统状态（公开接口）
router.get('/status', getRecommendationSystemStatus);

// 获取深度学习推荐（实验性功能，需要登录）
router.get('/deep-learning', protect, getDeepLearningRecommendations);

module.exports = router;
