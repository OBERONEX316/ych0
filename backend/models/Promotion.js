const mongoose = require('mongoose');

const promotionSchema = new mongoose.Schema({
  // 基本信息
  name: {
    type: String,
    required: [true, '促销名称不能为空'],
    trim: true,
    maxlength: [100, '促销名称不能超过100个字符']
  },
  description: {
    type: String,
    maxlength: [500, '促销描述不能超过500个字符']
  },
  
  // 促销类型
  promotionType: {
    type: String,
    required: [true, '促销类型不能为空'],
    enum: {
      values: [
        'new_user',          // 新用户
        'loyal_customer',    // 忠实客户
        'cart_abandonment',  // 购物车挽回
        'birthday',          // 生日
        'product_specific',  // 商品专属
        'low_activity',      // 低活跃度用户
        'seasonal',          // 季节性
        'flash_sale'         // 限时抢购
      ],
      message: '促销类型 {VALUE} 不被支持'
    }
  },
  
  // 奖励类型
  rewardType: {
    type: String,
    required: [true, '奖励类型不能为空'],
    enum: {
      values: ['coupon', 'points', 'discount', 'free_shipping', 'gift'],
      message: '奖励类型 {VALUE} 不被支持'
    }
  },
  
  // 奖励值
  rewardValue: {
    type: mongoose.Schema.Types.Mixed,
    required: function() {
      return this.rewardType !== 'free_shipping';
    }
  },
  
  // 关联优惠券（如果奖励类型是coupon）
  coupon: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Coupon',
    validate: {
      validator: function(value) {
        return this.rewardType !== 'coupon' || value !== null;
      },
      message: '优惠券奖励必须关联一个优惠券'
    }
  },
  
  // 目标用户条件
  targetConditions: {
    minOrderCount: { type: Number, min: 0, default: 0 },          // 最小订单数
    maxOrderCount: { type: Number, min: 0 },                      // 最大订单数
    minTotalSpent: { type: Number, min: 0, default: 0 },          // 最小消费金额
    maxTotalSpent: { type: Number, min: 0 },                      // 最大消费金额
    minActivityScore: { type: Number, min: 0, default: 0 },       // 最小活动分数
    userAgeRange: {                                               // 用户年龄范围
      min: { type: Number, min: 0 },
      max: { type: Number, min: 0 }
    },
    registrationDaysRange: {                                      // 注册天数范围
      min: { type: Number, min: 0 },
      max: { type: Number, min: 0 }
    },
    specificCategories: [{                                        // 特定商品分类
      type: String,
      enum: ['electronics', 'clothing', 'books', 'home', 'sports', 'beauty']
    }],
    excludedCategories: [{                                         // 排除商品分类
      type: String,
      enum: ['electronics', 'clothing', 'books', 'home', 'sports', 'beauty']
    }],
    specificProducts: [{                                          // 特定商品
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product'
    }],
    excludedProducts: [{                                          // 排除商品
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product'
    }]
  },
  
  // 触发条件
  triggerConditions: {
    cartValueThreshold: { type: Number, min: 0 },                 // 购物车金额阈值
    cartAbandonmentTime: { type: Number, min: 0 },                 // 购物车放弃时间（小时）
    inactivityDays: { type: Number, min: 0 },                     // 不活跃天数
    birthdayDaysBefore: { type: Number, min: 0, default: 7 },     // 生日前天数
    seasonalStartMonth: { type: Number, min: 1, max: 12 },        // 季节性开始月份
    seasonalEndMonth: { type: Number, min: 1, max: 12 },         // 季节性结束月份
    flashSaleDuration: { type: Number, min: 0 }                   // 限时抢购持续时间（分钟）
  },
  
  // 有效期
  validFrom: {
    type: Date,
    required: [true, '生效时间不能为空']
  },
  validUntil: {
    type: Date,
    required: [true, '过期时间不能为空'],
    validate: {
      validator: function(value) {
        return value > this.validFrom;
      },
      message: '过期时间必须晚于生效时间'
    }
  },
  
  // 优先级（数值越小优先级越高）
  priority: {
    type: Number,
    default: 10,
    min: [1, '优先级不能小于1']
  },
  
  // 状态
  isActive: {
    type: Boolean,
    default: true
  },
  isAutomatic: {
    type: Boolean,
    default: false
  },
  
  // 统计信息
  totalDistributed: {
    type: Number,
    default: 0,
    min: [0, '总发放次数不能为负数']
  },
  totalUsed: {
    type: Number,
    default: 0,
    min: [0, '总使用次数不能为负数']
  },
  totalRevenueImpact: {
    type: Number,
    default: 0,
    min: [0, '总收入影响不能为负数']
  },
  
  // 创建信息
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// 虚拟字段：是否有效
promotionSchema.virtual('isValid').get(function() {
  const now = new Date();
  return this.isActive && 
         now >= this.validFrom && 
         now <= this.validUntil;
});

// 虚拟字段：剩余有效期（天）
promotionSchema.virtual('daysRemaining').get(function() {
  const now = new Date();
  const diffTime = this.validUntil - now;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// 索引优化
promotionSchema.index({ promotionType: 1 });
promotionSchema.index({ rewardType: 1 });
promotionSchema.index({ isActive: 1, validFrom: 1, validUntil: 1 });
promotionSchema.index({ priority: 1 });
promotionSchema.index({ createdBy: 1 });

// 静态方法：获取用户适用的促销
promotionSchema.statics.findApplicableForUser = async function(userId, userData = {}) {
  const now = new Date();
  const applicablePromotions = [];
  
  // 获取所有有效促销
  const promotions = await this.find({
    isActive: true,
    validFrom: { $lte: now },
    validUntil: { $gte: now }
  }).sort({ priority: 1 });
  
  // 检查每个促销是否适用于用户
  for (const promotion of promotions) {
    if (await promotion.isApplicableToUser(userId, userData)) {
      applicablePromotions.push(promotion);
    }
  }
  
  return applicablePromotions;
};

// 实例方法：检查促销是否适用于用户
promotionSchema.methods.isApplicableToUser = async function(userId, userData = {}) {
  const User = mongoose.model('User');
  const UserCoupon = mongoose.model('UserCoupon');
  
  // 获取用户信息（如果未提供）
  let user = userData;
  if (Object.keys(userData).length === 0) {
    user = await User.findById(userId);
    if (!user) return false;
  }
  
  const conditions = this.targetConditions;
  
  // 检查订单数量条件
  if (conditions.minOrderCount > 0 && user.orderCount < conditions.minOrderCount) {
    return false;
  }
  if (conditions.maxOrderCount > 0 && user.orderCount > conditions.maxOrderCount) {
    return false;
  }
  
  // 检查消费金额条件
  if (conditions.minTotalSpent > 0 && user.totalSpent < conditions.minTotalSpent) {
    return false;
  }
  if (conditions.maxTotalSpent > 0 && user.totalSpent > conditions.maxTotalSpent) {
    return false;
  }
  
  // 检查活动分数条件
  if (conditions.minActivityScore > 0 && user.activityScore < conditions.minActivityScore) {
    return false;
  }
  
  // 检查用户是否已经领取过该促销
  const existingPromotion = await UserCoupon.findOne({
    user: userId,
    promotion: this._id,
    status: { $in: ['active', 'used'] }
  });
  
  if (existingPromotion) {
    return false;
  }
  
  return true;
};

// 实例方法：应用促销奖励
promotionSchema.methods.applyReward = async function(userId) {
  const User = mongoose.model('User');
  const UserCoupon = mongoose.model('UserCoupon');
  const Coupon = mongoose.model('Coupon');
  
  try {
    let rewardDetails = {};
    
    switch (this.rewardType) {
      case 'coupon':
        // 创建用户优惠券记录
        const userCoupon = new UserCoupon({
          user: userId,
          coupon: this.coupon,
          promotion: this._id,
          status: 'active'
        });
        await userCoupon.save();
        rewardDetails = { couponId: this.coupon, userCouponId: userCoupon._id };
        break;
        
      case 'points':
        // 添加积分
        const points = parseInt(this.rewardValue);
        await User.findByIdAndUpdate(userId, {
          $inc: { 'points.available': points, 'points.total': points }
        });
        rewardDetails = { points: points };
        break;
        
      case 'discount':
        // 直接折扣（需要特殊处理）
        rewardDetails = { discount: this.rewardValue, type: 'direct_discount' };
        break;
        
      case 'free_shipping':
        rewardDetails = { freeShipping: true };
        break;
        
      case 'gift':
        rewardDetails = { gift: this.rewardValue };
        break;
    }
    
    // 更新促销统计
    this.totalDistributed += 1;
    await this.save();
    
    return {
      success: true,
      promotion: this._id,
      rewardType: this.rewardType,
      rewardDetails: rewardDetails
    };
    
  } catch (error) {
    console.error('应用促销奖励失败:', error);
    return { success: false, error: error.message };
  }
};

// 静态方法：获取促销统计数据
promotionSchema.statics.getStatistics = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: '$promotionType',
        totalPromotions: { $sum: 1 },
        activePromotions: {
          $sum: {
            $cond: [
              { $and: [
                { $eq: ['$isActive', true] },
                { $lte: ['$validFrom', new Date()] },
                { $gte: ['$validUntil', new Date()] }
              ]},
              1,
              0
            ]
          }
        },
        totalDistributed: { $sum: '$totalDistributed' },
        totalUsed: { $sum: '$totalUsed' },
        totalRevenue: { $sum: '$totalRevenueImpact' }
      }
    },
    { $sort: { _id: 1 } }
  ]);
  
  return stats;
};

const Promotion = mongoose.model('Promotion', promotionSchema);

module.exports = Promotion;