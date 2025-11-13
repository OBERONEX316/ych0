const mongoose = require('mongoose');

const membershipLevelSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  level: {
    type: Number,
    required: true,
    unique: true,
    min: 1,
    max: 10
  },
  description: {
    type: String,
    required: true,
    maxlength: 500
  },
  icon: {
    type: String,
    default: ''
  },
  color: {
    type: String,
    default: '#4F46E5'
  },
  // 升级条件
  upgradeConditions: {
    minPoints: {
      type: Number,
      required: true,
      min: 0
    },
    minTotalSpent: {
      type: Number,
      required: true,
      min: 0
    },
    minOrders: {
      type: Number,
      required: true,
      min: 0
    },
    minReferrals: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  // 权益配置
  benefits: {
    // 折扣权益
    discountRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    // 积分倍数
    pointsMultiplier: {
      type: Number,
      default: 1,
      min: 1
    },
    // 免运费门槛
    freeShippingThreshold: {
      type: Number,
      default: 0,
      min: 0
    },
    // 专属客服
    hasPrioritySupport: {
      type: Boolean,
      default: false
    },
    // 专属活动
    hasExclusiveEvents: {
      type: Boolean,
      default: false
    },
    // 生日特权
    birthdayBenefits: {
      type: String,
      default: ''
    },
    // 专属优惠券
    exclusiveCoupons: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Coupon'
    }],
    // 其他权益
    otherBenefits: [String]
  },
  // 等级状态
  isActive: {
    type: Boolean,
    default: true
  },
  // 排序权重
  sortOrder: {
    type: Number,
    default: 0
  },
  // 有效期设置
  validityPeriod: {
    type: Number,
    default: 365, // 默认365天
    min: 1
  },
  // 降级条件
  downgradeConditions: {
    maintainPoints: {
      type: Number,
      default: 0
    },
    maintainSpending: {
      type: Number,
      default: 0
    }
  }
}, {
  timestamps: true
});

// 索引
membershipLevelSchema.index({ level: 1 });
membershipLevelSchema.index({ isActive: 1, sortOrder: 1 });

// 静态方法：获取所有活跃等级
membershipLevelSchema.statics.getActiveLevels = function() {
  return this.find({ isActive: true }).sort({ level: 1 });
};

// 静态方法：根据用户数据计算应得等级
membershipLevelSchema.statics.calculateUserLevel = async function(userStats) {
  const levels = await this.getActiveLevels();
  
  for (let i = levels.length - 1; i >= 0; i--) {
    const level = levels[i];
    const conditions = level.upgradeConditions;
    
    if (
      userStats.totalPoints >= conditions.minPoints &&
      userStats.totalSpent >= conditions.minTotalSpent &&
      userStats.totalOrders >= conditions.minOrders &&
      userStats.totalReferrals >= conditions.minReferrals
    ) {
      return level;
    }
  }
  
  return levels[0]; // 返回最低等级
};

// 静态方法：获取下一等级
membershipLevelSchema.statics.getNextLevel = async function(currentLevel) {
  return this.findOne({ 
    level: { $gt: currentLevel }, 
    isActive: true 
  }).sort({ level: 1 });
};

// 实例方法：检查用户是否符合升级条件
membershipLevelSchema.methods.checkUpgradeEligibility = function(userStats) {
  const conditions = this.upgradeConditions;
  
  return {
    eligible: (
      userStats.totalPoints >= conditions.minPoints &&
      userStats.totalSpent >= conditions.minTotalSpent &&
      userStats.totalOrders >= conditions.minOrders &&
      userStats.totalReferrals >= conditions.minReferrals
    ),
    missing: {
      points: Math.max(0, conditions.minPoints - userStats.totalPoints),
      spent: Math.max(0, conditions.minTotalSpent - userStats.totalSpent),
      orders: Math.max(0, conditions.minOrders - userStats.totalOrders),
      referrals: Math.max(0, conditions.minReferrals - userStats.totalReferrals)
    }
  };
};

// 实例方法：获取权益描述
membershipLevelSchema.methods.getBenefitsDescription = function() {
  const benefits = [];
  const b = this.benefits;
  
  if (b.discountRate > 0) {
    benefits.push(`${b.discountRate}% 专属折扣`);
  }
  
  if (b.pointsMultiplier > 1) {
    benefits.push(`${b.pointsMultiplier}倍积分奖励`);
  }
  
  if (b.freeShippingThreshold > 0) {
    benefits.push(`满${b.freeShippingThreshold}元免运费`);
  }
  
  if (b.hasPrioritySupport) {
    benefits.push('专属客服支持');
  }
  
  if (b.hasExclusiveEvents) {
    benefits.push('专属活动参与权');
  }
  
  if (b.birthdayBenefits) {
    benefits.push('生日特权: ' + b.birthdayBenefits);
  }
  
  if (b.otherBenefits && b.otherBenefits.length > 0) {
    benefits.push(...b.otherBenefits);
  }
  
  return benefits;
};

module.exports = mongoose.model('MembershipLevel', membershipLevelSchema);