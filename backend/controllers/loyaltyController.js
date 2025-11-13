const LoyaltyPoint = require('../models/LoyaltyPoint');
const User = require('../models/User');
const PointTransaction = require('../models/PointTransaction');
const asyncHandler = require('express-async-handler');

// @desc    获取用户会员等级信息
// @route   GET /api/loyalty/profile
// @access  Private
const getLoyaltyProfile = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  
  // 获取或创建会员信息
  let loyaltyPoint = await LoyaltyPoint.findOne({ user: userId });
  
  if (!loyaltyPoint) {
    // 如果用户没有会员信息，创建一个
    loyaltyPoint = await LoyaltyPoint.create({
      user: userId,
      points: 0,
      level: 'bronze'
    });
  }
  
  res.json({
    points: loyaltyPoint.points,
    level: loyaltyPoint.level,
    levelName: loyaltyPoint.levelName,
    totalEarned: loyaltyPoint.totalEarned,
    totalSpent: loyaltyPoint.totalSpent,
    levelUpInfo: loyaltyPoint.levelUpInfo,
    benefits: loyaltyPoint.benefits,
    membershipExpiresAt: loyaltyPoint.membershipExpiresAt,
    isMembershipValid: loyaltyPoint.isMembershipValid()
  });
});

// @desc    获取会员等级配置
// @route   GET /api/loyalty/levels
// @access  Public
const getLoyaltyLevels = asyncHandler(async (req, res) => {
  const levelConfig = LoyaltyPoint.getLevelConfig();
  const pointRules = LoyaltyPoint.getPointRules();
  
  res.json({
    levels: levelConfig,
    pointRules: pointRules
  });
});

// @desc    获取会员排行榜
// @route   GET /api/loyalty/leaderboard
// @access  Public
const getLoyaltyLeaderboard = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  
  const leaderboard = await LoyaltyPoint.find({})
    .populate('user', 'username avatar')
    .sort({ points: -1, level: -1 })
    .skip((page - 1) * limit)
    .limit(limit);
  
  const totalCount = await LoyaltyPoint.countDocuments();
  
  res.json({
    leaderboard: leaderboard.map((item, index) => ({
      rank: (page - 1) * limit + index + 1,
      username: item.user.username,
      avatar: item.user.avatar,
      points: item.points,
      level: item.level,
      levelName: item.levelName,
      benefits: item.benefits
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

// @desc    管理员调整用户积分
// @route   POST /api/loyalty/admin/adjust-points
// @access  Private/Admin
const adjustLoyaltyPoints = asyncHandler(async (req, res) => {
  const { userId, amount, reason, description } = req.body;
  
  if (!userId || !amount || !reason) {
    return res.status(400).json({ message: '缺少必要参数' });
  }
  
  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({ message: '用户不存在' });
  }
  
  let loyaltyPoint = await LoyaltyPoint.findOne({ user: userId });
  if (!loyaltyPoint) {
    loyaltyPoint = await LoyaltyPoint.create({
      user: userId,
      points: 0,
      level: 'bronze'
    });
  }
  
  const oldPoints = loyaltyPoint.points;
  
  if (amount > 0) {
    loyaltyPoint.addPoints(amount, reason);
  } else {
    loyaltyPoint.spendPoints(Math.abs(amount));
  }
  
  await loyaltyPoint.save();
  
  // 创建积分交易记录
  const transaction = await PointTransaction.create({
    user: userId,
    type: amount > 0 ? 'earn' : 'spend',
    amount: Math.abs(amount),
    balanceAfter: loyaltyPoint.points,
    reason: reason,
    description: description || '管理员手动调整',
    status: 'active',
    processedBy: req.user._id
  });
  
  res.json({
    message: '积分调整成功',
    oldPoints,
    newPoints: loyaltyPoint.points,
    newLevel: loyaltyPoint.level,
    newLevelName: loyaltyPoint.levelName,
    transaction
  });
});

// @desc    续费会员
// @route   POST /api/loyalty/renew
// @access  Private
const renewMembership = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  
  let loyaltyPoint = await LoyaltyPoint.findOne({ user: userId });
  if (!loyaltyPoint) {
    loyaltyPoint = await LoyaltyPoint.create({
      user: userId,
      points: 0,
      level: 'bronze'
    });
  }
  
  loyaltyPoint.renewMembership();
  await loyaltyPoint.save();
  
  res.json({
    message: '会员续费成功',
    membershipExpiresAt: loyaltyPoint.membershipExpiresAt,
    isMembershipValid: loyaltyPoint.isMembershipValid()
  });
});

// @desc    获取会员统计信息
// @route   GET /api/loyalty/stats
// @access  Private/Admin
const getLoyaltyStats = asyncHandler(async (req, res) => {
  // 获取各等级用户数量
  const levelStats = await LoyaltyPoint.aggregate([
    {
      $group: {
        _id: '$level',
        count: { $sum: 1 },
        avgPoints: { $avg: '$points' },
        totalPoints: { $sum: '$points' }
      }
    }
  ]);
  
  // 获取总会员数
  const totalMembers = await LoyaltyPoint.countDocuments();
  
  // 获取有效会员数
  const validMembers = await LoyaltyPoint.countDocuments({
    membershipExpiresAt: { $gt: new Date() }
  });
  
  // 获取积分统计数据
  const pointsStats = await LoyaltyPoint.aggregate([
    {
      $group: {
        _id: null,
        totalPointsEarned: { $sum: '$totalEarned' },
        totalPointsSpent: { $sum: '$totalSpent' },
        avgPointsPerMember: { $avg: '$points' }
      }
    }
  ]);
  
  res.json({
    totalMembers,
    validMembers,
    levelDistribution: levelStats.reduce((acc, curr) => {
      acc[curr._id] = {
        count: curr.count,
        avgPoints: Math.round(curr.avgPoints),
        totalPoints: curr.totalPoints
      };
      return acc;
    }, {}),
    pointsStats: pointsStats[0] || {}
  });
});

// @desc    处理会员等级升级
// @route   POST /api/loyalty/process-level-up
// @access  Private/Admin
const processLevelUp = asyncHandler(async (req, res) => {
  const { userId } = req.body;
  
  if (!userId) {
    return res.status(400).json({ message: '用户ID不能为空' });
  }
  
  const loyaltyPoint = await LoyaltyPoint.findOne({ user: userId });
  if (!loyaltyPoint) {
    return res.status(404).json({ message: '会员信息不存在' });
  }
  
  const oldLevel = loyaltyPoint.level;
  const oldLevelName = loyaltyPoint.levelName;
  
  // 重新计算等级信息
  loyaltyPoint.calculateLevelInfo();
  await loyaltyPoint.save();
  
  // 如果等级发生变化，记录等级升级奖励
  if (oldLevel !== loyaltyPoint.level) {
    // 根据新等级给予升级奖励
    const levelConfig = LoyaltyPoint.getLevelConfig();
    const upgradeBonus = levelConfig[loyaltyPoint.level].minPoints * 0.1; // 10%的升级奖励
    
    if (upgradeBonus > 0) {
      loyaltyPoint.addPoints(upgradeBonus, 'level_up_bonus');
      await loyaltyPoint.save();
      
      // 创建积分交易记录
      await PointTransaction.create({
        user: userId,
        type: 'earn',
        amount: upgradeBonus,
        balanceAfter: loyaltyPoint.points,
        reason: 'level_up_bonus',
        description: `等级升级奖励：从${oldLevelName}升级到${loyaltyPoint.levelName}`,
        status: 'active'
      });
    }
  }
  
  res.json({
    message: '等级处理完成',
    oldLevel,
    newLevel: loyaltyPoint.level,
    newLevelName: loyaltyPoint.levelName,
    points: loyaltyPoint.points,
    levelUpInfo: loyaltyPoint.levelUpInfo
  });
});

module.exports = {
  getLoyaltyProfile,
  getLoyaltyLevels,
  getLoyaltyLeaderboard,
  adjustLoyaltyPoints,
  renewMembership,
  getLoyaltyStats,
  processLevelUp
};