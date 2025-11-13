const mongoose = require('mongoose');

const userMembershipSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },
  currentLevel: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MembershipLevel',
    required: true
  },
  // 会员统计数据
  stats: {
    totalPoints: {
      type: Number,
      default: 0,
      min: 0
    },
    totalSpent: {
      type: Number,
      default: 0,
      min: 0
    },
    totalOrders: {
      type: Number,
      default: 0,
      min: 0
    },
    totalReferrals: {
      type: Number,
      default: 0,
      min: 0
    },
    // 最近统计（用于降级判断）
    recentStats: {
      periodStart: {
        type: Date,
        default: Date.now
      },
      points: {
        type: Number,
        default: 0
      },
      spent: {
        type: Number,
        default: 0
      },
      orders: {
        type: Number,
        default: 0
      }
    }
  },
  // 会员状态
  status: {
    type: String,
    enum: ['active', 'expired', 'suspended'],
    default: 'active'
  },
  // 会员有效期
  membershipExpiry: {
    type: Date,
    required: true
  },
  // 升级历史
  upgradeHistory: [{
    previousLevel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MembershipLevel'
    },
    newLevel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MembershipLevel'
    },
    upgradeDate: {
      type: Date,
      default: Date.now
    },
    reason: {
      type: String,
      enum: ['auto_upgrade', 'manual_upgrade', 'system_upgrade', 'promotion'],
      default: 'auto_upgrade'
    },
    description: String
  }],
  // 获得的专属优惠券
  exclusiveCoupons: [{
    couponId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Coupon'
    },
    receivedDate: {
      type: Date,
      default: Date.now
    },
    isUsed: {
      type: Boolean,
      default: false
    },
    usedDate: Date
  }],
  // 会员特权使用记录
  benefitUsage: [{
    benefitType: {
      type: String,
      enum: ['discount', 'free_shipping', 'exclusive_coupon', 'priority_support', 'exclusive_event', 'birthday_gift'],
      required: true
    },
    usedDate: {
      type: Date,
      default: Date.now
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order'
    },
    savings: {
      type: Number,
      default: 0
    },
    description: String
  }],
  // 积分明细
  pointsHistory: [{
    type: {
      type: String,
      enum: ['earn', 'redeem', 'expire', 'adjustment', 'bonus'],
      required: true
    },
    points: {
      type: Number,
      required: true
    },
    reason: {
      type: String,
      required: true
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order'
    },
    expiryDate: Date,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  // 会员等级任务进度
  tasksProgress: [{
    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MembershipTask'
    },
    progress: {
      type: Number,
      default: 0,
      min: 0
    },
    target: {
      type: Number,
      required: true
    },
    isCompleted: {
      type: Boolean,
      default: false
    },
    completedAt: Date,
    rewardsClaimed: {
      type: Boolean,
      default: false
    }
  }],
  // 会员设置
  settings: {
    // 是否接收等级变更通知
    receiveLevelChangeNotification: {
      type: Boolean,
      default: true
    },
    // 是否接收专属优惠信息
    receiveExclusiveOffers: {
      type: Boolean,
      default: true
    },
    // 是否接收生日特权提醒
    receiveBirthdayReminders: {
      type: Boolean,
      default: true
    }
  }
}, {
  timestamps: true
});

// 索引
userMembershipSchema.index({ userId: 1 });
userMembershipSchema.index({ currentLevel: 1 });
userMembershipSchema.index({ status: 1, membershipExpiry: 1 });
userMembershipSchema.index({ 'stats.totalPoints': -1 });

// 静态方法：获取用户会员信息
userMembershipSchema.statics.getUserMembership = async function(userId) {
  return this.findOne({ userId })
    .populate('currentLevel')
    .populate('upgradeHistory.previousLevel')
    .populate('upgradeHistory.newLevel')
    .populate('exclusiveCoupons.couponId')
    .populate('pointsHistory.orderId');
};

// 静态方法：更新用户统计
userMembershipSchema.statics.updateUserStats = async function(userId, statsUpdate) {
  return this.findOneAndUpdate(
    { userId },
    { $inc: statsUpdate },
    { new: true, upsert: true }
  ).populate('currentLevel');
};

// 实例方法：添加积分
userMembershipSchema.methods.addPoints = function(points, reason, orderId = null, expiryDays = 365) {
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + expiryDays);
  
  this.stats.totalPoints += points;
  this.pointsHistory.push({
    type: 'earn',
    points: points,
    reason: reason,
    orderId: orderId,
    expiryDate: expiryDate
  });
  
  return this.save();
};

// 实例方法：使用积分
userMembershipSchema.methods.usePoints = function(points, reason, orderId = null) {
  if (this.stats.totalPoints < points) {
    throw new Error('积分不足');
  }
  
  this.stats.totalPoints -= points;
  this.pointsHistory.push({
    type: 'redeem',
    points: -points,
    reason: reason,
    orderId: orderId
  });
  
  return this.save();
};

// 实例方法：升级会员等级
userMembershipSchema.methods.upgradeLevel = function(newLevel, reason = 'auto_upgrade', description = '') {
  this.upgradeHistory.push({
    previousLevel: this.currentLevel,
    newLevel: newLevel,
    reason: reason,
    description: description
  });
  
  this.currentLevel = newLevel;
  
  // 更新会员有效期
  const validityPeriod = newLevel.validityPeriod || 365;
  const newExpiryDate = new Date();
  newExpiryDate.setDate(newExpiryDate.getDate() + validityPeriod);
  this.membershipExpiry = newExpiryDate;
  
  return this.save();
};

// 实例方法：检查是否需要降级
userMembershipSchema.methods.checkDowngrade = async function() {
  const MembershipLevel = mongoose.model('MembershipLevel');
  const currentLevel = await MembershipLevel.findById(this.currentLevel);
  
  if (!currentLevel || !currentLevel.downgradeConditions) {
    return false;
  }
  
  const conditions = currentLevel.downgradeConditions;
  const recentStats = this.stats.recentStats;
  
  return (
    recentStats.points < conditions.maintainPoints ||
    recentStats.spent < conditions.maintainSpending
  );
};

// 实例方法：获取可用积分
userMembershipSchema.methods.getAvailablePoints = function() {
  const now = new Date();
  return this.pointsHistory.reduce((total, record) => {
    if (record.type === 'earn' && record.expiryDate && record.expiryDate > now) {
      return total + record.points;
    } else if (record.type === 'redeem') {
      return total + record.points; // redeem points are negative
    }
    return total;
  }, 0);
};

// 实例方法：获取即将过期的积分
userMembershipSchema.methods.getExpiringPoints = function(daysAhead = 30) {
  const now = new Date();
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + daysAhead);
  
  return this.pointsHistory.filter(record => 
    record.type === 'earn' && 
    record.expiryDate && 
    record.expiryDate > now && 
    record.expiryDate <= futureDate
  ).reduce((total, record) => total + record.points, 0);
};

module.exports = mongoose.model('UserMembership', userMembershipSchema);