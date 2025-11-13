const express = require('express');
const router = express.Router();
const {
  recordShare,
  getPopularSharedProducts,
  getFriendSharedProducts,
  getSocialRecommendations,
  getShareStatistics
} = require('../controllers/socialShareController');

const { protect } = require('../middleware/auth');

// 记录分享行为
router.post('/record', protect, recordShare);

// 获取热门分享商品（公开�?router.get('/popular', getPopularSharedProducts);

// 获取好友分享的商品（需要认证）
router.get('/friends', protect, getFriendSharedProducts);

// 获取社交推荐（需要认证）
router.get('/recommendations', protect, getSocialRecommendations);

// 获取个人分享统计（需要认证）
router.get('/statistics', protect, getShareStatistics);

module.exports = router;
