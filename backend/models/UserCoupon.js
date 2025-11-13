const mongoose = require('mongoose');

const userCouponSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, '用户不能为空']
  },
  coupon: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Coupon',
    required: [true, '优惠券不能为空']
  },
  
  // 状态
  status: {
    type: String,
    required: [true, '状态不能为空'],
    enum: {
      values: ['available', 'used', 'expired', 'cancelled'],
      message: '状态 {VALUE} 不被支持'
    },
    default: 'available'
  },
  
  // 使用信息
  usedAt: {
    type: Date
  },
  usedInOrder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order'
  },
  discountAmount: {
    type: Number,
    min: [0, '折扣金额不能为负数']
  },
  
  // 有效期（继承自优惠券，但可以单独设置）
  validFrom: {
    type: Date,
    required: [true, '生效时间不能为空']
  },
  validUntil: {
    type: Date,
    required: [true, '过期时间不能为空']
  },
  
  // 来源信息
  source: {
    type: String,
    enum: ['manual', 'system', 'promotion', 'signup', 'birthday'],
    default: 'manual'
  },
  
  // 备注
  notes: {
    type: String,
    maxlength: [200, '备注不能超过200个字符']
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// 虚拟字段：是否有效
userCouponSchema.virtual('isValid').get(function() {
  const now = new Date();
  return this.status === 'available' && 
         now >= this.validFrom && 
         now <= this.validUntil;
});

// 复合索引
userCouponSchema.index({ user: 1, coupon: 1 }, { unique: true });
userCouponSchema.index({ user: 1, status: 1 });
userCouponSchema.index({ validUntil: 1 });
userCouponSchema.index({ status: 1 });

// 静态方法：获取用户可用的优惠券
userCouponSchema.statics.findAvailableForUser = function(userId) {
  const now = new Date();
  return this.find({
    user: userId,
    status: 'available',
    validFrom: { $lte: now },
    validUntil: { $gte: now }
  }).populate('coupon');
};

// 静态方法：获取用户已使用的优惠券
userCouponSchema.statics.findUsedForUser = function(userId, limit = 10) {
  return this.find({
    user: userId,
    status: 'used'
  })
  .populate('coupon')
  .populate('usedInOrder')
  .sort({ usedAt: -1 })
  .limit(limit);
};

// 静态方法：领取优惠券
userCouponSchema.statics.claimCoupon = async function(userId, couponId, source = 'manual', notes = '') {
  const Coupon = mongoose.model('Coupon');
  
  // 检查优惠券是否存在且有效
  const coupon = await Coupon.findById(couponId);
  if (!coupon || !coupon.isActive) {
    throw new Error('优惠券不存在或已失效');
  }
  
  if (!coupon.isValid) {
    throw new Error('优惠券已过期');
  }
  
  // 检查用户是否已经领取过该优惠券
  const existingClaim = await this.findOne({ user: userId, coupon: couponId });
  if (existingClaim) {
    if (existingClaim.status === 'available' && existingClaim.isValid) {
      throw new Error('您已经领取过该优惠券');
    }
    if (existingClaim.status === 'available' && !existingClaim.isValid) {
      existingClaim.status = 'expired';
      await existingClaim.save();
    }
  }
  
  // 检查用户领取次数限制
  if (coupon.usageLimitPerUser > 0) {
    const userClaimCount = await this.countDocuments({
      user: userId,
      coupon: couponId,
      status: { $in: ['available', 'used'] }
    });
    
    if (userClaimCount >= coupon.usageLimitPerUser) {
      throw new Error('您已达到该优惠券的领取次数限制');
    }
  }
  
  // 创建用户优惠券记录
  const userCoupon = new this({
    user: userId,
    coupon: couponId,
    validFrom: coupon.validFrom,
    validUntil: coupon.validUntil,
    source: source,
    notes: notes
  });
  
  return userCoupon.save();
};

// 实例方法：使用优惠券
userCouponSchema.methods.useCoupon = function(orderId, discountAmount) {
  if (this.status !== 'available') {
    throw new Error('优惠券不可用');
  }
  
  if (!this.isValid) {
    this.status = 'expired';
    return this.save().then(() => {
      throw new Error('优惠券已过期');
    });
  }
  
  this.status = 'used';
  this.usedAt = new Date();
  this.usedInOrder = orderId;
  this.discountAmount = discountAmount;
  
  return this.save();
};

// 中间件：保存前验证有效期
userCouponSchema.pre('save', function(next) {
  if (this.validUntil <= this.validFrom) {
    return next(new Error('过期时间必须晚于生效时间'));
  }
  next();
});

// 中间件：自动处理过期优惠券
userCouponSchema.pre('find', function() {
  const now = new Date();
  this.where({
    $or: [
      { status: { $ne: 'available' } },
      { 
        status: 'available',
        validUntil: { $gte: now },
        validFrom: { $lte: now }
      }
    ]
  });
});

const UserCoupon = mongoose.model('UserCoupon', userCouponSchema);

module.exports = UserCoupon;