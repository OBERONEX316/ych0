const express = require('express');
const {
  getLoyaltyProfile,
  getLoyaltyLevels,
  getLoyaltyLeaderboard,
  adjustLoyaltyPoints,
  renewMembership,
  getLoyaltyStats,
  processLevelUp
} = require('../controllers/loyaltyController');
const { protect, admin } = require('../middleware/auth');

const router = express.Router();

// 公开路由
router.get('/levels', getLoyaltyLevels);
router.get('/leaderboard', getLoyaltyLeaderboard);

// 需要认证的路由
router.get('/profile', protect, getLoyaltyProfile);
router.post('/renew', protect, renewMembership);

// 管理员路由
router.post('/admin/adjust-points', protect, admin, adjustLoyaltyPoints);
router.get('/admin/stats', protect, admin, getLoyaltyStats);
router.post('/admin/process-level-up', protect, admin, processLevelUp);

module.exports = router;