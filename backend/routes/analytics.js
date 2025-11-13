const express = require('express');
const router = express.Router();
const {
  getUserAnalytics,
  getRealTimeAnalytics
} = require('../controllers/analyticsController');

// 获取用户行为分析数据
router.get('/user', getUserAnalytics);

// 获取实时分析数据
router.get('/realtime', getRealTimeAnalytics);

module.exports = router;
