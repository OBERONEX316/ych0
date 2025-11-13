const express = require('express');
const {
  followUser,
  unfollowUser,
  getFollowers,
  getFollowing,
  getSocialStats,
  checkRelationship,
  checkMultipleRelationships,
  getMutualFriends,
  getRecommendations,
  updateNotificationSettings
} = require('../controllers/socialController');

const { protect } = require('../middleware/auth');

const router = express.Router();

// 所有路由都需要认�?router.use(protect);

// @route   POST /api/social/follow/:userId
// @desc    关注用户
// @access  Private
router.post('/follow/:userId', followUser);

// @route   DELETE /api/social/follow/:userId
// @desc    取消关注
// @access  Private
router.delete('/follow/:userId', unfollowUser);

// @route   GET /api/social/followers
// @desc    获取粉丝列表
// @access  Private
router.get('/followers', getFollowers);

// @route   GET /api/social/following
// @desc    获取关注列表
// @access  Private
router.get('/following', getFollowing);

// @route   GET /api/social/stats/:userId
// @desc    获取用户社交统计（不传userId则获取当前用户统计）
// @access  Private
router.get('/stats/:userId', getSocialStats);

// @route   GET /api/social/stats
// @desc    获取当前用户社交统计
// @access  Private
router.get('/stats', getSocialStats);

// @route   GET /api/social/relationship/:userId
// @desc    检查关注状�?// @access  Private
router.get('/relationship/:userId', checkRelationship);

// @route   POST /api/social/relationships/check
// @desc    批量检查关注状�?// @access  Private
router.post('/relationships/check', checkMultipleRelationships);

// @route   GET /api/social/mutual-friends
// @desc    获取互相关注的好�?// @access  Private
router.get('/mutual-friends', getMutualFriends);

// @route   GET /api/social/recommendations
// @desc    获取用户推荐（可能认识的人）
// @access  Private
router.get('/recommendations', getRecommendations);

// @route   PUT /api/social/notifications/:userId
// @desc    更新关注通知设置
// @access  Private
router.put('/notifications/:userId', updateNotificationSettings);

module.exports = router;
