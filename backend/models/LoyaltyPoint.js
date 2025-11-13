const mongoose = require('mongoose');

const loyaltyPointSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  points: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  level: {
    type: String,
    enum: ['bronze', 'silver', 'gold', 'platinum', 'diamond'],
    default: 'bronze'
  },
  totalEarned: {
    type: Number,
    default: 0,
    min: 0
  },
  totalSpent: {
    type: Number,
    default: 0,
    min: 0
  },
  // 等级升级信息
  levelUpInfo: {
    currentLevelPoints: {
      type: Number,
      default: 0
    },
    nextLevel: {
      type: String,
      enum: ['silver', 'gold', 'platinum', 'diamond', null],
      default: null
    },
    pointsToNextLevel: {
      type: Number,
      default: 0
    },
    progressPercentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    }
  },
  // 会员有效期
  membershipExpiresAt: {
    type: Date,
    default: function() {
      const oneYearFromNow = new Date();
      oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
      return oneYearFromNow;
    }
  },
  // 会员权益
  benefits: {
    discountRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    freeShipping: {
      type: Boolean,
      default: false
    },
    prioritySupport: {
      type: Boolean,
      default: false
    },
    birthdayBonus: {
      type: Boolean,
      default: false
    },
    exclusiveOffers: {
      type: Boolean,
      default: false
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// 等级配置
const LEVEL_CONFIG = {
  bronze: { minPoints: 0, maxPoints: 999, discount: 0, freeShipping: false },
  silver: { minPoints: 1000, maxPoints: 4999, discount: 5, freeShipping: false },
  gold: { minPoints: 5000, maxPoints: 14999, discount: 10, freeShipping: true },
  platinum: { minPoints: 15000, maxPoints: 49999, discount: 15, freeShipping: true },
  diamond: { minPoints: 50000, maxPoints: Infinity, discount: 20, freeShipping: true }
};

// 积分获取规则
const POINT_RULES = {
  purchase: {
    rate: 0.1, // 每消费1元获得0.1积分
    maxPerOrder: 1000
  },
  review: 50, // 每条评价
  registration: 500, // 注册奖励
  birthday: 200, // 生日奖励
  referral: 300, // 推荐好友
  dailyLogin: 10 // 每日登录
};

// 虚拟字段：等级名称（中文）
loyaltyPointSchema.virtual('levelName').get(function() {
  const levelNames = {
    bronze: '青铜会员',
    silver: '白银会员',
    gold: '黄金会员',
    platinum: '铂金会员',
    diamond: '钻石会员'
  };
  return levelNames[this.level] || '未知等级';
});

// 静态方法：获取等级配置
loyaltyPointSchema.statics.getLevelConfig = function() {
  return LEVEL_CONFIG;
};

// 静态方法：获取积分规则
loyaltyPointSchema.statics.getPointRules = function() {
  return POINT_RULES;
};

// 实例方法：计算等级信息
loyaltyPointSchema.methods.calculateLevelInfo = function() {
  const config = LEVEL_CONFIG;
  const currentLevel = this.level;
  const currentPoints = this.points;
  
  // 确定当前等级
  let newLevel = 'bronze';
  for (const [level, levelConfig] of Object.entries(config)) {
    if (currentPoints >= levelConfig.minPoints) {
      newLevel = level;
    }
  }
  
  // 更新等级
  this.level = newLevel;
  
  // 计算下一等级信息
  const levels = Object.keys(config);
  const currentIndex = levels.indexOf(newLevel);
  
  if (currentIndex < levels.length - 1) {
    const nextLevel = levels[currentIndex + 1];
    const nextLevelConfig = config[nextLevel];
    
    this.levelUpInfo = {
      currentLevelPoints: currentPoints - config[newLevel].minPoints,
      nextLevel: nextLevel,
      pointsToNextLevel: nextLevelConfig.minPoints - currentPoints,
      progressPercentage: Math.min(
        Math.round(((currentPoints - config[newLevel].minPoints) / 
                   (nextLevelConfig.minPoints - config[newLevel].minPoints)) * 100),
        100
      )
    };
  } else {
    // 最高等级
    this.levelUpInfo = {
      currentLevelPoints: currentPoints - config[newLevel].minPoints,
      nextLevel: null,
      pointsToNextLevel: 0,
      progressPercentage: 100
    };
  }
  
  // 更新会员权益
  this.updateBenefits();
  
  return this;
};

// 实例方法：更新会员权益
loyaltyPointSchema.methods.updateBenefits = function() {
  const config = LEVEL_CONFIG[this.level];
  this.benefits = {
    discountRate: config.discount,
    freeShipping: config.freeShipping,
    prioritySupport: this.level === 'platinum' || this.level === 'diamond',
    birthdayBonus: this.level !== 'bronze',
    exclusiveOffers: this.level !== 'bronze'
  };
  return this;
};

// 实例方法：添加积分
loyaltyPointSchema.methods.addPoints = function(amount, reason) {
  if (amount <= 0) {
    throw new Error('积分数量必须大于0');
  }
  
  this.points += amount;
  this.totalEarned += amount;
  
  // 重新计算等级信息
  this.calculateLevelInfo();
  
  return this;
};

// 实例方法：消费积分
loyaltyPointSchema.methods.spendPoints = function(amount) {
  if (amount <= 0) {
    throw new Error('消费积分数量必须大于0');
  }
  
  if (this.points < amount) {
    throw new Error('积分不足');
  }
  
  this.points -= amount;
  this.totalSpent += amount;
  
  return this;
};

// 实例方法：检查会员是否有效
loyaltyPointSchema.methods.isMembershipValid = function() {
  return this.membershipExpiresAt > new Date();
};

// 实例方法：续费会员
loyaltyPointSchema.methods.renewMembership = function() {
  const oneYearFromNow = new Date();
  oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
  this.membershipExpiresAt = oneYearFromNow;
  return this;
};

// 中间件：保存前计算等级信息
loyaltyPointSchema.pre('save', function(next) {
  if (this.isModified('points')) {
    this.calculateLevelInfo();
  }
  next();
});

// 索引优化
loyaltyPointSchema.index({ user: 1 }, { unique: true });
loyaltyPointSchema.index({ level: 1 });
loyaltyPointSchema.index({ points: -1 });
loyaltyPointSchema.index({ membershipExpiresAt: 1 });

module.exports = mongoose.model('LoyaltyPoint', loyaltyPointSchema);