const SocialRelationship = require('../models/SocialRelationship');
const User = require('../models/User');
const asyncHandler = require('express-async-handler');

// @desc    关注用户
// @route   POST /api/social/follow/:userId
// @access  Private
const followUser = asyncHandler(async (req, res) => {
  const followerId = req.user._id;
  const followingId = req.params.userId;

  // 不能关注自己
  if (followerId.toString() === followingId) {
    return res.status(400).json({
      success: false,
      message: '不能关注自己'
    });
  }

  // 检查用户是否存在
  const userToFollow = await User.findById(followingId);
  if (!userToFollow) {
    return res.status(404).json({
      success: false,
      message: '用户不存在'
    });
  }

  // 检查是否已经关注
  const existingRelationship = await SocialRelationship.findOne({
    follower: followerId,
    following: followingId
  });

  if (existingRelationship) {
    if (existingRelationship.status === 'active') {
      return res.status(400).json({
        success: false,
        message: '已经关注该用户'
      });
    } else {
      // 重新激活关注关系
      existingRelationship.status = 'active';
      existingRelationship.followedAt = new Date();
      await existingRelationship.save();
      
      return res.json({
        success: true,
        message: '关注成功',
        relationship: existingRelationship
      });
    }
  }

  // 创建新的关注关系
  const relationship = await SocialRelationship.create({
    follower: followerId,
    following: followingId,
    status: 'active'
  });

  res.status(201).json({
    success: true,
    message: '关注成功',
    relationship
  });
});

// @desc    取消关注
// @route   DELETE /api/social/follow/:userId
// @access  Private
const unfollowUser = asyncHandler(async (req, res) => {
  const followerId = req.user._id;
  const followingId = req.params.userId;

  const relationship = await SocialRelationship.findOne({
    follower: followerId,
    following: followingId,
    status: 'active'
  });

  if (!relationship) {
    return res.status(404).json({
      success: false,
      message: '未关注该用户'
    });
  }

  // 软删除：将状态改为非活跃
  relationship.status = 'blocked';
  await relationship.save();

  res.json({
    success: true,
    message: '取消关注成功'
  });
});

// @desc    获取粉丝列表
// @route   GET /api/social/followers
// @access  Private
const getFollowers = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;

  const followers = await SocialRelationship.find({
    following: userId,
    status: 'active'
  })
    .populate('follower', 'username avatar firstName lastName')
    .sort({ followedAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);

  const totalCount = await SocialRelationship.countDocuments({
    following: userId,
    status: 'active'
  });

  res.json({
    success: true,
    followers: followers.map(rel => ({
      user: rel.follower,
      followedAt: rel.followedAt,
      formattedFollowedAt: rel.formattedFollowedAt,
      isMutual: rel.isMutual
    })),
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(totalCount / limit),
      totalCount,
      hasNext: page < Math.ceil(totalCount / limit),
      hasPrev: page > 1
    }
  });
});

// @desc    获取关注列表
// @route   GET /api/social/following
// @access  Private
const getFollowing = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;

  const following = await SocialRelationship.find({
    follower: userId,
    status: 'active'
  })
    .populate('following', 'username avatar firstName lastName')
    .sort({ followedAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);

  const totalCount = await SocialRelationship.countDocuments({
    follower: userId,
    status: 'active'
  });

  res.json({
    success: true,
    following: following.map(rel => ({
      user: rel.following,
      followedAt: rel.followedAt,
      formattedFollowedAt: rel.formattedFollowedAt,
      isMutual: rel.isMutual
    })),
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(totalCount / limit),
      totalCount,
      hasNext: page < Math.ceil(totalCount / limit),
      hasPrev: page > 1
    }
  });
});

// @desc    获取用户社交统计
// @route   GET /api/social/stats/:userId
// @access  Private
const getSocialStats = asyncHandler(async (req, res) => {
  const userId = req.params.userId || req.user._id;

  const [followerCount, followingCount, mutualCount] = await Promise.all([
    SocialRelationship.countDocuments({ following: userId, status: 'active' }),
    SocialRelationship.countDocuments({ follower: userId, status: 'active' }),
    SocialRelationship.countDocuments({ 
      follower: userId, 
      status: 'active', 
      isMutual: true 
    })
  ]);

  res.json({
    success: true,
    stats: {
      followers: followerCount,
      following: followingCount,
      mutualFriends: mutualCount
    }
  });
});

// @desc    检查关注状态
// @route   GET /api/social/relationship/:userId
// @access  Private
const checkRelationship = asyncHandler(async (req, res) => {
  const followerId = req.user._id;
  const followingId = req.params.userId;

  const relationship = await SocialRelationship.findOne({
    follower: followerId,
    following: followingId,
    status: 'active'
  });

  res.json({
    success: true,
    isFollowing: !!relationship,
    relationship: relationship || null
  });
});

// @desc    批量检查关注状态
// @route   POST /api/social/relationships/check
// @access  Private
const checkMultipleRelationships = asyncHandler(async (req, res) => {
  const followerId = req.user._id;
  const { userIds } = req.body;

  if (!userIds || !Array.isArray(userIds)) {
    return res.status(400).json({
      success: false,
      message: '用户ID列表是必需的'
    });
  }

  const relationships = await SocialRelationship.checkMultipleRelationships(followerId, userIds);

  res.json({
    success: true,
    relationships
  });
});

// @desc    获取互相关注的好友
// @route   GET /api/social/mutual-friends
// @access  Private
const getMutualFriends = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;

  const mutualFriends = await SocialRelationship.find({
    follower: userId,
    status: 'active',
    isMutual: true
  })
    .populate('following', 'username avatar firstName lastName')
    .sort({ followedAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);

  const totalCount = await SocialRelationship.countDocuments({
    follower: userId,
    status: 'active',
    isMutual: true
  });

  res.json({
    success: true,
    mutualFriends: mutualFriends.map(rel => rel.following),
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(totalCount / limit),
      totalCount,
      hasNext: page < Math.ceil(totalCount / limit),
      hasPrev: page > 1
    }
  });
});

// @desc    获取用户推荐（可能认识的人）
// @route   GET /api/social/recommendations
// @access  Private
const getRecommendations = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const limit = parseInt(req.query.limit) || 10;

  // 获取用户的好友的好友（二级关系）
  const userFollowing = await SocialRelationship.find({
    follower: userId,
    status: 'active'
  }).select('following');

  const followingIds = userFollowing.map(rel => rel.following);

  if (followingIds.length === 0) {
    // 如果用户没有关注任何人，返回一些热门用户
    const popularUsers = await User.find({ 
      _id: { $ne: userId },
      isActive: true 
    })
      .select('username avatar firstName lastName')
      .sort({ createdAt: -1 })
      .limit(limit);

    return res.json({
      success: true,
      recommendations: popularUsers,
      reason: '热门用户推荐'
    });
  }

  // 获取好友关注的人（排除自己和自己已经关注的人）
  const recommendations = await SocialRelationship.find({
    follower: { $in: followingIds },
    following: { 
      $ne: userId,
      $nin: followingIds 
    },
    status: 'active'
  })
    .populate('following', 'username avatar firstName lastName')
    .distinct('following');

  // 如果推荐数量不足，补充一些随机用户
  if (recommendations.length < limit) {
    const additionalUsers = await User.find({
      _id: { 
        $ne: userId, 
        $nin: followingIds,
        $nin: recommendations.map(user => user._id)
      },
      isActive: true
    })
      .select('username avatar firstName lastName')
      .limit(limit - recommendations.length);

    recommendations.push(...additionalUsers);
  }

  res.json({
    success: true,
    recommendations: recommendations.slice(0, limit),
    reason: '好友的好友推荐'
  });
});

// @desc    更新关注通知设置
// @route   PUT /api/social/notifications/:userId
// @access  Private
const updateNotificationSettings = asyncHandler(async (req, res) => {
  const followerId = req.user._id;
  const followingId = req.params.userId;
  const { notifications } = req.body;

  const relationship = await SocialRelationship.findOne({
    follower: followerId,
    following: followingId,
    status: 'active'
  });

  if (!relationship) {
    return res.status(404).json({
      success: false,
      message: '未关注该用户'
    });
  }

  if (notifications) {
    relationship.notifications = { ...relationship.notifications, ...notifications };
    await relationship.save();
  }

  res.json({
    success: true,
    message: '通知设置更新成功',
    notifications: relationship.notifications
  });
});

module.exports = {
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
};