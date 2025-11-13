const MembershipLevel = require('../models/MembershipLevel');
const UserMembership = require('../models/UserMembership');
const MembershipTask = require('../models/MembershipTask');
const User = require('../models/User');
const Order = require('../models/Order');
const Coupon = require('../models/Coupon');
const { validationResult } = require('express-validator');

// 获取所有会员等级
const getAllMembershipLevels = async (req, res) => {
  try {
    const levels = await MembershipLevel.getActiveLevels();
    
    res.json({
      success: true,
      data: levels.map(level => ({
        ...level.toObject(),
        benefitsDescription: level.getBenefitsDescription()
      }))
    });
  } catch (error) {
    console.error('获取会员等级失败:', error);
    res.status(500).json({
      success: false,
      error: '获取会员等级失败'
    });
  }
};

// 创建会员等级
const createMembershipLevel = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: '输入数据验证失败',
        details: errors.array()
      });
    }

    const membershipLevel = new MembershipLevel(req.body);
    await membershipLevel.save();

    res.json({
      success: true,
      data: membershipLevel,
      message: '会员等级创建成功'
    });
  } catch (error) {
    console.error('创建会员等级失败:', error);
    res.status(500).json({
      success: false,
      error: '创建会员等级失败'
    });
  }
};

// 更新会员等级
const updateMembershipLevel = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: '输入数据验证失败',
        details: errors.array()
      });
    }

    const membershipLevel = await MembershipLevel.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!membershipLevel) {
      return res.status(404).json({
        success: false,
        error: '会员等级不存在'
      });
    }

    res.json({
      success: true,
      data: membershipLevel,
      message: '会员等级更新成功'
    });
  } catch (error) {
    console.error('更新会员等级失败:', error);
    res.status(500).json({
      success: false,
      error: '更新会员等级失败'
    });
  }
};

// 删除会员等级
const deleteMembershipLevel = async (req, res) => {
  try {
    const membershipLevel = await MembershipLevel.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!membershipLevel) {
      return res.status(404).json({
        success: false,
        error: '会员等级不存在'
      });
    }

    res.json({
      success: true,
      message: '会员等级已停用'
    });
  } catch (error) {
    console.error('删除会员等级失败:', error);
    res.status(500).json({
      success: false,
      error: '删除会员等级失败'
    });
  }
};

// 获取用户会员信息
const getUserMembership = async (req, res) => {
  try {
    const userId = req.user.id;
    
    let userMembership = await UserMembership.getUserMembership(userId);
    
    // 如果用户还没有会员信息，创建默认的
    if (!userMembership) {
      const defaultLevel = await MembershipLevel.findOne({ level: 1 });
      if (!defaultLevel) {
        return res.status(500).json({
          success: false,
          error: '系统未配置默认会员等级'
        });
      }
      
      userMembership = new UserMembership({
        userId: userId,
        currentLevel: defaultLevel._id,
        membershipExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 默认一年有效期
      });
      
      await userMembership.save();
      userMembership = await UserMembership.getUserMembership(userId);
    }
    
    // 检查是否需要升级
    await checkAndUpgradeMembership(userId);
    
    // 重新获取最新的会员信息
    userMembership = await UserMembership.getUserMembership(userId);
    
    // 获取下一等级信息
    const nextLevel = await MembershipLevel.getNextLevel(userMembership.currentLevel.level);
    
    // 获取升级进度
    const upgradeProgress = nextLevel ? nextLevel.checkUpgradeEligibility(userMembership.stats) : null;
    
    res.json({
      success: true,
      data: {
        membership: userMembership,
        nextLevel: nextLevel,
        upgradeProgress: upgradeProgress,
        availablePoints: userMembership.getAvailablePoints(),
        expiringPoints: userMembership.getExpiringPoints(30)
      }
    });
  } catch (error) {
    console.error('获取用户会员信息失败:', error);
    res.status(500).json({
      success: false,
      error: '获取用户会员信息失败'
    });
  }
};

// 检查并升级会员等级
const checkAndUpgradeMembership = async (userId) => {
  try {
    const userMembership = await UserMembership.getUserMembership(userId);
    if (!userMembership) return;
    
    const currentLevel = userMembership.currentLevel;
    const userStats = userMembership.stats;
    
    // 计算应该达到的等级
    const deservedLevel = await MembershipLevel.calculateUserLevel(userStats);
    
    // 如果需要升级
    if (deservedLevel.level > currentLevel.level) {
      await userMembership.upgradeLevel(deservedLevel, 'auto_upgrade', '自动升级');
      
      // 发送升级通知（这里可以集成通知系统）
      console.log(`用户 ${userId} 升级到 ${deservedLevel.name} 等级`);
    }
  } catch (error) {
    console.error('检查升级失败:', error);
  }
};

// 获取所有会员任务
const getAllMembershipTasks = async (req, res) => {
  try {
    const tasks = await MembershipTask.getActiveTasks();
    
    res.json({
      success: true,
      data: tasks.map(task => ({
        ...task.toObject(),
        progressDescription: task.getProgressDescription(),
        rewardsDescription: task.getRewardsDescription()
      }))
    });
  } catch (error) {
    console.error('获取会员任务失败:', error);
    res.status(500).json({
      success: false,
      error: '获取会员任务失败'
    });
  }
};

// 获取用户可参与的任务
const getUserAvailableTasks = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const userMembership = await UserMembership.getUserMembership(userId);
    if (!userMembership) {
      return res.status(404).json({
        success: false,
        error: '用户会员信息不存在'
      });
    }
    
    const tasks = await MembershipTask.getAvailableTasks(
      userMembership.currentLevel.level,
      userMembership.stats
    );
    
    res.json({
      success: true,
      data: tasks.map(task => ({
        ...task.toObject(),
        progressDescription: task.getProgressDescription(),
        rewardsDescription: task.getRewardsDescription()
      }))
    });
  } catch (error) {
    console.error('获取用户可参与任务失败:', error);
    res.status(500).json({
      success: false,
      error: '获取用户可参与任务失败'
    });
  }
};

// 更新任务进度
const updateTaskProgress = async (req, res) => {
  try {
    const { taskId, progress } = req.body;
    const userId = req.user.id;
    
    const userMembership = await UserMembership.getUserMembership(userId);
    if (!userMembership) {
      return res.status(404).json({
        success: false,
        error: '用户会员信息不存在'
      });
    }
    
    const task = await MembershipTask.findById(taskId);
    if (!task) {
      return res.status(404).json({
        success: false,
        error: '任务不存在'
      });
    }
    
    // 查找任务进度
    const taskProgress = userMembership.tasksProgress.find(tp => tp.taskId.toString() === taskId);
    
    if (!taskProgress) {
      // 创建新的任务进度
      userMembership.tasksProgress.push({
        taskId: taskId,
        progress: progress,
        target: task.target,
        isCompleted: progress >= task.target
      });
    } else {
      // 更新现有进度
      if (taskProgress.isCompleted && !task.isRepeatable()) {
        return res.status(400).json({
          success: false,
          error: '任务已完成，不可重复'
        });
      }
      
      taskProgress.progress = progress;
      taskProgress.isCompleted = progress >= task.target;
      
      if (taskProgress.isCompleted) {
        taskProgress.completedAt = new Date();
      }
    }
    
    await userMembership.save();
    
    // 如果任务完成，发放奖励
    const updatedTaskProgress = userMembership.tasksProgress.find(tp => tp.taskId.toString() === taskId);
    if (updatedTaskProgress.isCompleted && !updatedTaskProgress.rewardsClaimed) {
      await claimTaskRewards(userId, taskId);
    }
    
    res.json({
      success: true,
      message: '任务进度更新成功',
      data: updatedTaskProgress
    });
  } catch (error) {
    console.error('更新任务进度失败:', error);
    res.status(500).json({
      success: false,
      error: '更新任务进度失败'
    });
  }
};

// 领取任务奖励
const claimTaskRewards = async (userId, taskId) => {
  try {
    const userMembership = await UserMembership.getUserMembership(userId);
    const task = await MembershipTask.findById(taskId);
    
    if (!userMembership || !task) return;
    
    const taskProgress = userMembership.tasksProgress.find(tp => tp.taskId.toString() === taskId);
    
    if (!taskProgress || !taskProgress.isCompleted || taskProgress.rewardsClaimed) return;
    
    const rewards = task.rewards;
    
    // 发放积分奖励
    if (rewards.points > 0) {
      await userMembership.addPoints(rewards.points, `完成任务: ${task.title}`);
    }
    
    // 发放优惠券奖励
    if (rewards.coupons && rewards.coupons.length > 0) {
      for (const couponReward of rewards.coupons) {
        const coupon = await Coupon.findById(couponReward.couponId);
        if (coupon) {
          // 这里可以添加发放优惠券的逻辑
          userMembership.exclusiveCoupons.push({
            couponId: couponReward.couponId,
            receivedDate: new Date()
          });
        }
      }
    }
    
    // 标记奖励已领取
    taskProgress.rewardsClaimed = true;
    await userMembership.save();
    
    console.log(`用户 ${userId} 领取了任务 ${task.title} 的奖励`);
  } catch (error) {
    console.error('领取任务奖励失败:', error);
  }
};

// 使用积分兑换
const redeemPoints = async (req, res) => {
  try {
    const { points, reason, orderId } = req.body;
    const userId = req.user.id;
    
    if (!points || points <= 0) {
      return res.status(400).json({
        success: false,
        error: '积分数量无效'
      });
    }
    
    const userMembership = await UserMembership.getUserMembership(userId);
    if (!userMembership) {
      return res.status(404).json({
        success: false,
        error: '用户会员信息不存在'
      });
    }
    
    // 检查积分是否足够
    const availablePoints = userMembership.getAvailablePoints();
    if (availablePoints < points) {
      return res.status(400).json({
        success: false,
        error: '积分不足'
      });
    }
    
    await userMembership.usePoints(points, reason, orderId);
    
    res.json({
      success: true,
      message: '积分兑换成功',
      data: {
        remainingPoints: userMembership.getAvailablePoints()
      }
    });
  } catch (error) {
    console.error('积分兑换失败:', error);
    res.status(500).json({
      success: false,
      error: error.message || '积分兑换失败'
    });
  }
};

// 获取用户积分历史
const getUserPointsHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20, type } = req.query;
    
    const userMembership = await UserMembership.getUserMembership(userId);
    if (!userMembership) {
      return res.status(404).json({
        success: false,
        error: '用户会员信息不存在'
      });
    }
    
    let query = {};
    if (type) {
      query.type = type;
    }
    
    const pointsHistory = userMembership.pointsHistory.filter(record => {
      if (type && record.type !== type) return false;
      return true;
    });
    
    // 分页
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedHistory = pointsHistory.slice(startIndex, endIndex);
    
    res.json({
      success: true,
      data: {
        history: paginatedHistory,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: pointsHistory.length,
          pages: Math.ceil(pointsHistory.length / limit)
        }
      }
    });
  } catch (error) {
    console.error('获取积分历史失败:', error);
    res.status(500).json({
      success: false,
      error: '获取积分历史失败'
    });
  }
};

module.exports = {
  getAllMembershipLevels,
  createMembershipLevel,
  updateMembershipLevel,
  deleteMembershipLevel,
  getUserMembership,
  getAllMembershipTasks,
  getUserAvailableTasks,
  updateTaskProgress,
  redeemPoints,
  getUserPointsHistory,
  checkAndUpgradeMembership
};