const express = require('express');
const {
  getPointsBalance,
  getPointsHistory,
  getPointsLeaderboard,
  adjustUserPoints,
  getPointsRules,
  processExpiredPoints,
  getPointsStats
} = require('../controllers/pointController');
const { protect, admin } = require('../middleware/authMiddleware');

const router = express.Router();

// 公开路由
router.get('/rules', getPointsRules);
router.get('/leaderboard', getPointsLeaderboard);

// 需要认证的路由
router.get('/balance', protect, getPointsBalance);
router.get('/history', protect, getPointsHistory);
router.get('/stats', protect, getPointsStats);

// 管理员路�?router.post('/adjust/:userId', protect, admin, adjustUserPoints);
router.post('/process-expired', protect, admin, processExpiredPoints);

module.exports = router;
