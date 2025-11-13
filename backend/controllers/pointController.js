const PointTransaction = require('../models/PointTransaction');
const User = require('../models/User');
const asyncHandler = require('express-async-handler');

// @desc    获取用户积分余额
// @route   GET /api/points/balance
// @access  Private
const getPointsBalance = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  
  res.json({
    availablePoints: user.points.available,
    totalPoints: user.points.total,
    level: user.points.level,
    levelName: user.points.levelName,
    nextLevelPoints: user.points.nextLevelPoints
  });
});

// @desc    获取用户积分交易历史
// @route   GET /api/points/history
// @access  Private
const getPointsHistory = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  
  const user = await User.findById(userId);
  
  const transactions = await PointTransaction.find({ user: userId })
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);
  
  const total = await PointTransaction.countDocuments({ user: userId });
  
  res.json({
    transactions,
    page,
    pages: Math.ceil(total / limit),
    total,
    currentPoints: user.points.available
  });
});

// @desc    获取积分排行榜
// @route   GET /api/points/leaderboard
// @access  Public
const getPointsLeaderboard = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  
  const leaderboard = await User.find({ 'points.available': { $gt: 0 } })
    .select('username avatar points.available points.level points.levelName')
    .sort({ 'points.available': -1, 'points.level': -1 })
    .skip((page - 1) * limit)
    .limit(limit);
  
  const totalCount = await User.countDocuments({ 'points.available': { $gt: 0 } });
  
  res.json({
    leaderboard: leaderboard.map((item, index) => ({
      rank: (page - 1) * limit + index + 1,
      username: item.username,
      avatar: item.avatar,
      points: item.points.available,
      level: item.points.level,
      levelName: item.points.levelName
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
// @route   POST /api/points/admin/adjust
// @access  Private/Admin
const adjustUserPoints = asyncHandler(async (req, res) => {
  const { userId, amount, reason, description } = req.body;
  
  if (!userId || !amount || !reason) {
    return res.status(400).json({ message: '缺少必要参数' });
  }
  
  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({ message: '用户不存在' });
  }
  
  const oldPoints = user.points.available;
  const newPoints = oldPoints + amount;
  
  if (newPoints < 0) {
    return res.status(400).json({ message: '积分不能为负数' });
  }
  
  user.points.available = newPoints;
  user.points.total += amount > 0 ? amount : 0;
  await user.save();
  
  // 创建积分交易记录
  const transaction = await PointTransaction.create({
    user: userId,
    type: amount > 0 ? 'adjust_add' : 'adjust_deduct',
    amount: Math.abs(amount),
    balanceAfter: newPoints,
    reason: reason,
    description: description || '管理员手动调整',
    status: 'active',
    processedBy: req.user._id
  });
  
  res.json({
    message: '积分调整成功',
    oldPoints,
    newPoints,
    transaction
  });
});

// @desc    获取积分规则信息
// @route   GET /api/points/rules
// @access  Public
const getPointsRules = asyncHandler(async (req, res) => {
  const rules = {
    // 积分获取规则
    earningRules: {
      purchase: {
        name: '购物消费',
        description: '每消费1元获得1积分',
        rate: 1,
        maxPerDay: 1000
      },
      review: {
        name: '商品评价',
        description: '每完成一个有效评价获得10积分',
        points: 10,
        maxPerDay: 50
      },
      dailyLogin: {
        name: '每日登录',
        description: '每日首次登录获得5积分',
        points: 5,
        maxPerDay: 5
      },
      referral: {
        name: '邀请好友',
        description: '成功邀请好友注册并获得首单获得100积分',
        points: 100,
        maxPerDay: 500
      }
    },
    
    // 等级规则
    levelRules: {
      1: { name: '新手', pointsRequired: 0, discount: 0, benefits: ['基础会员权益'] },
      2: { name: '青铜会员', pointsRequired: 100, discount: 5, benefits: ['5%折扣', '优先客服'] },
      3: { name: '白银会员', pointsRequired: 500, discount: 10, benefits: ['10%折扣', '免费配送', '生日优惠'] },
      4: { name: '黄金会员', pointsRequired: 1000, discount: 15, benefits: ['15%折扣', '专属优惠', '提前购'] },
      5: { name: '铂金会员', pointsRequired: 2000, discount: 20, benefits: ['20%折扣', 'VIP客服', '专属礼品'] }
    },
    
    // 积分有效期
    expiration: {
      enabled: true,
      duration: 365, // 天
      reminderDays: [30, 15, 7, 3, 1]
    },
    
    // 积分使用规则
    usageRules: {
      minPointsToUse: 100,
      maxPointsPerOrder: 500,
      pointsToMoneyRatio: 100 // 100积分=1元
    }
  };
  
  res.json(rules);
});

// @desc    处理积分过期（定时任务）
// @route   POST /api/points/process-expired
// @access  Private/Admin
const processExpiredPoints = asyncHandler(async (req, res) => {
  const expiredCount = await PointTransaction.processExpiredPoints();
  
  res.json({
    message: `成功处理 ${expiredCount} 条过期积分记录`,
    expiredCount
  });
});

// @desc    获取用户积分统计
// @route   GET /api/points/stats
// @access  Private
const getPointsStats = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  
  const user = await User.findById(userId);
  
  const totalEarned = await PointTransaction.aggregate([
    { $match: { user: userId, type: { $in: ['earn', 'adjust_add'] } } },
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ]);
  
  const totalSpent = await PointTransaction.aggregate([
    { $match: { user: userId, type: { $in: ['spend', 'adjust_deduct'] } } },
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ]);
  
  res.json({
    availablePoints: user.points.available,
    totalEarned: totalEarned[0]?.total || 0,
    totalSpent: totalSpent[0]?.total || 0,
    level: user.points.level,
    levelName: user.points.levelName,
    nextLevelPoints: user.points.nextLevelPoints
  });
});

module.exports = {
  getPointsBalance,
  getPointsHistory,
  getPointsLeaderboard,
  adjustUserPoints,
  getPointsRules,
  processExpiredPoints,
  getPointsStats
};