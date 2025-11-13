const mongoose = require('mongoose');

const membershipTaskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
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
  // 任务类型
  taskType: {
    type: String,
    required: true,
    enum: [
      'daily_login',          // 每日登录
      'first_purchase',       // 首次购买
      'total_spending',       // 累计消费
      'total_orders',         // 累计订单
      'product_review',       // 商品评价
      'social_share',         // 社交分享
      'referral',             // 推荐好友
      'category_purchase',    // 分类购买
      'payment_method',       // 支付方式
      'profile_complete',     // 完善资料
      'birthday_purchase',    // 生日购买
      'seasonal_activity',    // 季节活动
      'custom'                // 自定义
    ]
  },
  // 任务目标
  target: {
    type: Number,
    required: true,
    min: 1
  },
  // 目标单位
  targetUnit: {
    type: String,
    enum: ['count', 'amount', 'percentage', 'days', 'times'],
    default: 'count'
  },
  // 任务条件
  conditions: {
    // 适用等级
    applicableLevels: [{
      type: Number,
      min: 1
    }],
    // 最低消费金额
    minSpending: {
      type: Number,
      default: 0,
      min: 0
    },
    // 指定商品分类
    categories: [String],
    // 指定支付方式
    paymentMethods: [String],
    // 时间限制
    timeLimit: {
      type: Number,
      default: 0 // 0表示无时间限制，单位：天
    },
    // 其他条件
    customConditions: mongoose.Schema.Types.Mixed
  },
  // 奖励配置
  rewards: {
    // 积分奖励
    points: {
      type: Number,
      default: 0,
      min: 0
    },
    // 经验值奖励
    experience: {
      type: Number,
      default: 0,
      min: 0
    },
    // 优惠券奖励
    coupons: [{
      couponId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Coupon'
      },
      quantity: {
        type: Number,
        default: 1,
        min: 1
      }
    }],
    // 专属权益
    exclusiveBenefits: [String],
    // 其他奖励
    otherRewards: [String]
  },
  // 任务状态
  isActive: {
    type: Boolean,
    default: true
  },
  // 任务难度
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard', 'expert'],
    default: 'medium'
  },
  // 任务标签
  tags: [String],
  // 排序权重
  sortOrder: {
    type: Number,
    default: 0
  },
  // 任务有效期
  validFrom: {
    type: Date,
    default: Date.now
  },
  validTo: {
    type: Date,
    default: null // null表示长期有效
  },
  // 每日重置
  dailyReset: {
    type: Boolean,
    default: false
  },
  // 每周重置
  weeklyReset: {
    type: Boolean,
    default: false
  },
  // 每月重置
  monthlyReset: {
    type: Boolean,
    default: false
  },
  // 最大完成次数
  maxCompletions: {
    type: Number,
    default: 1 // 默认只能完成一次
  },
  // 任务进度类型
  progressType: {
    type: String,
    enum: ['cumulative', 'single', 'daily', 'weekly', 'monthly'],
    default: 'single'
  }
}, {
  timestamps: true
});

// 索引
membershipTaskSchema.index({ taskType: 1, isActive: 1 });
membershipTaskSchema.index({ difficulty: 1, sortOrder: 1 });
membershipTaskSchema.index({ validFrom: 1, validTo: 1 });
membershipTaskSchema.index({ tags: 1 });

// 静态方法：获取所有活跃任务
membershipTaskSchema.statics.getActiveTasks = function() {
  const now = new Date();
  return this.find({
    isActive: true,
    $or: [
      { validFrom: { $lte: now }, validTo: null },
      { validFrom: { $lte: now }, validTo: { $gte: now } }
    ]
  }).sort({ difficulty: 1, sortOrder: 1 });
};

// 静态方法：根据类型获取任务
membershipTaskSchema.statics.getTasksByType = function(taskType) {
  return this.getActiveTasks().where('taskType', taskType);
};

// 静态方法：获取用户可参与的任务
membershipTaskSchema.statics.getAvailableTasks = async function(userLevel, userStats) {
  const tasks = await this.getActiveTasks();
  
  return tasks.filter(task => {
    // 检查等级限制
    if (task.conditions.applicableLevels && task.conditions.applicableLevels.length > 0) {
      if (!task.conditions.applicableLevels.includes(userLevel)) {
        return false;
      }
    }
    
    // 检查最低消费要求
    if (userStats.totalSpent < task.conditions.minSpending) {
      return false;
    }
    
    return true;
  });
};

// 实例方法：检查任务是否可重复完成
membershipTaskSchema.methods.isRepeatable = function() {
  return this.maxCompletions > 1 || this.dailyReset || this.weeklyReset || this.monthlyReset;
};

// 实例方法：获取任务进度描述
membershipTaskSchema.methods.getProgressDescription = function() {
  const { target, targetUnit, taskType } = this;
  
  let description = '';
  
  switch (taskType) {
    case 'daily_login':
      description = `连续登录${target}天`;
      break;
    case 'total_spending':
      description = `累计消费${target}元`;
      break;
    case 'total_orders':
      description = `完成${target}笔订单`;
      break;
    case 'product_review':
      description = `评价${target}个商品`;
      break;
    case 'social_share':
      description = `分享${target}次`;
      break;
    case 'referral':
      description = `推荐${target}位好友`;
      break;
    default:
      description = `完成${target}${this.getUnitText(targetUnit)}`;
  }
  
  return description;
};

// 实例方法：获取单位文本
membershipTaskSchema.methods.getUnitText = function(unit) {
  const unitMap = {
    'count': '次',
    'amount': '元',
    'percentage': '%',
    'days': '天',
    'times': '次'
  };
  return unitMap[unit] || '';
};

// 实例方法：获取奖励描述
membershipTaskSchema.methods.getRewardsDescription = function() {
  const rewards = [];
  const r = this.rewards;
  
  if (r.points > 0) {
    rewards.push(`${r.points}积分`);
  }
  
  if (r.experience > 0) {
    rewards.push(`${r.experience}经验值`);
  }
  
  if (r.coupons && r.coupons.length > 0) {
    rewards.push(`${r.coupons.length}张优惠券`);
  }
  
  if (r.exclusiveBenefits && r.exclusiveBenefits.length > 0) {
    rewards.push(...r.exclusiveBenefits);
  }
  
  if (r.otherRewards && r.otherRewards.length > 0) {
    rewards.push(...r.otherRewards);
  }
  
  return rewards;
};

module.exports = mongoose.model('MembershipTask', membershipTaskSchema);