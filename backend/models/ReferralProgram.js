const mongoose = require('mongoose');

const referralProgramSchema = new mongoose.Schema({
  name: {
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
  // 奖励类型
  rewardType: {
    type: String,
    enum: ['points', 'coupon', 'cash', 'discount', 'product'],
    required: true
  },
  // 推荐人奖励
  referrerReward: {
    type: {
      type: String,
      enum: ['points', 'coupon', 'cash', 'discount', 'product'],
      required: true
    },
    value: {
      type: Number,
      required: true,
      min: 0
    },
    couponId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Coupon'
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product'
    },
    description: String
  },
  // 被推荐人奖励
  refereeReward: {
    type: {
      type: String,
      enum: ['points', 'coupon', 'cash', 'discount', 'product'],
      required: true
    },
    value: {
      type: Number,
      required: true,
      min: 0
    },
    couponId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Coupon'
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product'
    },
    description: String
  },
  // 奖励条件
  conditions: {
    // 被推荐人需要完成的条件
    refereeConditions: {
      // 首次购买
      firstPurchaseRequired: {
        type: Boolean,
        default: true
      },
      // 最低消费金额
      minSpending: {
        type: Number,
        default: 0,
        min: 0
      },
      // 指定商品分类
      requiredCategories: [String],
      // 指定支付方式
      requiredPaymentMethods: [String],
      // 完成时间限制（天）
      completionDeadline: {
        type: Number,
        default: 30,
        min: 1
      }
    },
    // 推荐人条件
    referrerConditions: {
      // 最低等级要求
      minLevel: {
        type: Number,
        default: 1,
        min: 1
      },
      // 活跃度要求
      activityRequired: {
        type: Boolean,
        default: false
      },
      // 最大推荐人数
      maxReferrals: {
        type: Number,
        default: null // null表示无限制
      }
    }
  },
  // 活动设置
  settings: {
    // 开始时间
    startDate: {
      type: Date,
      required: true
    },
    // 结束时间
    endDate: {
      type: Date,
      required: true
    },
    // 活动状态
    status: {
      type: String,
      enum: ['draft', 'active', 'paused', 'ended'],
      default: 'draft'
    },
    // 每人最大推荐次数
    maxReferralsPerUser: {
      type: Number,
      default: null // null表示无限制
    },
    // 总推荐人数限制
    totalReferralLimit: {
      type: Number,
      default: null // null表示无限制
    }
  },
  // 推荐码设置
  referralCodeSettings: {
    // 推荐码前缀
    prefix: {
      type: String,
      default: ''
    },
    // 推荐码长度
    length: {
      type: Number,
      default: 8,
      min: 4,
      max: 20
    },
    // 推荐码字符集
    charset: {
      type: String,
      enum: ['alphanumeric', 'numeric', 'alphabetic', 'custom'],
      default: 'alphanumeric'
    },
    // 自定义字符集
    customCharset: String,
    // 是否允许自定义推荐码
    allowCustomCode: {
      type: Boolean,
      default: false
    }
  },
  // 分享设置
  sharingSettings: {
    // 分享标题
    shareTitle: {
      type: String,
      default: '推荐好友，获得奖励'
    },
    // 分享描述
    shareDescription: {
      type: String,
      default: '邀请好友注册，双方都可获得丰厚奖励！'
    },
    // 分享图片
    shareImage: String,
    // 分享链接
    shareLink: String,
    // 社交媒体平台
    socialPlatforms: [{
      type: String,
      enum: ['wechat', 'weibo', 'qq', 'douyin', 'xiaohongshu']
    }]
  },
  // 统计信息
  statistics: {
    // 总推荐人数
    totalReferrals: {
      type: Number,
      default: 0
    },
    // 成功推荐人数
    successfulReferrals: {
      type: Number,
      default: 0
    },
    // 总奖励发放
    totalRewardsGiven: {
      type: Number,
      default: 0
    },
    // 转化率
    conversionRate: {
      type: Number,
      default: 0
    }
  },
  // 活动标签
  tags: [String],
  // 排序权重
  sortOrder: {
    type: Number,
    default: 0
  },
  // 是否置顶
  isPinned: {
    type: Boolean,
    default: false
  },
  // 创建者
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // 更新者
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// 索引
referralProgramSchema.index({ 'settings.status': 1, 'settings.startDate': 1, 'settings.endDate': 1 });
referralProgramSchema.index({ rewardType: 1 });
referralProgramSchema.index({ sortOrder: 1, isPinned: -1 });
referralProgramSchema.index({ createdAt: -1 });

// 静态方法：获取活跃的活动
referralProgramSchema.statics.getActivePrograms = function() {
  const now = new Date();
  return this.find({
    'settings.status': 'active',
    'settings.startDate': { $lte: now },
    'settings.endDate': { $gte: now }
  }).sort({ isPinned: -1, sortOrder: 1 });
};

// 静态方法：检查活动是否有效
referralProgramSchema.statics.isProgramActive = function(programId) {
  const now = new Date();
  return this.findOne({
    _id: programId,
    'settings.status': 'active',
    'settings.startDate': { $lte: now },
    'settings.endDate': { $gte: now }
  });
};

// 实例方法：更新统计数据
referralProgramSchema.methods.updateStatistics = async function() {
  const ReferralRecord = mongoose.model('ReferralRecord');
  
  const stats = await ReferralRecord.aggregate([
    { $match: { programId: this._id } },
    {
      $group: {
        _id: null,
        totalReferrals: { $sum: 1 },
        successfulReferrals: { 
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
        }
      }
    }
  ]);
  
  if (stats.length > 0) {
    this.statistics.totalReferrals = stats[0].totalReferrals;
    this.statistics.successfulReferrals = stats[0].successfulReferrals;
    this.statistics.conversionRate = stats[0].totalReferrals > 0 ? 
      (stats[0].successfulReferrals / stats[0].totalReferrals) * 100 : 0;
  }
  
  return this.save();
};

// 实例方法：检查用户是否符合参与条件
referralProgramSchema.methods.checkUserEligibility = function(userMembership) {
  const conditions = this.conditions.referrerConditions;
  
  // 检查会员等级
  if (userMembership.currentLevel.level < conditions.minLevel) {
    return { eligible: false, reason: '会员等级不足' };
  }
  
  // 检查活跃度
  if (conditions.activityRequired) {
    const lastActive = userMembership.lastActiveDate;
    const daysSinceActive = Math.floor((Date.now() - lastActive) / (1000 * 60 * 60 * 24));
    if (daysSinceActive > 30) {
      return { eligible: false, reason: '活跃度不足' };
    }
  }
  
  return { eligible: true };
};

module.exports = mongoose.model('ReferralProgram', referralProgramSchema);