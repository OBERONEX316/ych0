const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
  // 基本信息
  code: {
    type: String,
    required: [true, '优惠券代码不能为空'],
    unique: true,
    trim: true,
    uppercase: true,
    match: [/^[A-Z0-9]+$/, '优惠券代码只能包含大写字母和数字']
  },
  name: {
    type: String,
    required: [true, '优惠券名称不能为空'],
    trim: true,
    maxlength: [100, '优惠券名称不能超过100个字符']
  },
  description: {
    type: String,
    maxlength: [500, '优惠券描述不能超过500个字符']
  },
  
  // 优惠类型和金额
  discountType: {
    type: String,
    required: [true, '优惠类型不能为空'],
    enum: {
      values: ['percentage', 'fixed', 'free_shipping'],
      message: '优惠类型 {VALUE} 不被支持'
    }
  },
  discountValue: {
    type: Number,
    required: function() {
      return this.discountType !== 'free_shipping';
    },
    min: [0, '优惠金额不能为负数'],
    validate: {
      validator: function(value) {
        if (this.discountType === 'percentage') {
          return value >= 0 && value <= 100;
        }
        return value >= 0;
      },
      message: '百分比折扣必须在0-100之间'
    }
  },
  
  // 使用条件
  minPurchaseAmount: {
    type: Number,
    min: [0, '最低消费金额不能为负数'],
    default: 0
  },
  maxDiscountAmount: {
    type: Number,
    min: [0, '最大折扣金额不能为负数']
  },
  applicableCategories: [{
    type: String,
    enum: ['electronics', 'clothing', 'books', 'home', 'sports', 'beauty']
  }],
  excludedProducts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  }],
  
  // 使用限制
  usageLimit: {
    type: Number,
    min: [0, '使用次数限制不能为负数'],
    default: 1
  },
  usageLimitPerUser: {
    type: Number,
    min: [0, '每人使用次数限制不能为负数'],
    default: 1
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
  
  // 状态
  isActive: {
    type: Boolean,
    default: true
  },
  isPublic: {
    type: Boolean,
    default: true
  },
  
  // 统计信息
  totalUsage: {
    type: Number,
    default: 0,
    min: [0, '总使用次数不能为负数']
  },
  totalDiscountAmount: {
    type: Number,
    default: 0,
    min: [0, '总折扣金额不能为负数']
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
couponSchema.virtual('isValid').get(function() {
  const now = new Date();
  return this.isActive && 
         now >= this.validFrom && 
         now <= this.validUntil &&
         (this.usageLimit === 0 || this.totalUsage < this.usageLimit);
});

// 虚拟字段：剩余使用次数
couponSchema.virtual('remainingUsage').get(function() {
  if (this.usageLimit === 0) return Infinity;
  return Math.max(0, this.usageLimit - this.totalUsage);
});

// 索引优化
couponSchema.index({ isActive: 1, validFrom: 1, validUntil: 1 });
couponSchema.index({ discountType: 1 });
couponSchema.index({ createdBy: 1 });

// 静态方法：根据代码查找有效优惠券
couponSchema.statics.findValidByCode = function(code) {
  const now = new Date();
  return this.findOne({
    code: code.toUpperCase(),
    isActive: true,
    validFrom: { $lte: now },
    validUntil: { $gte: now },
    $or: [
      { usageLimit: 0 },
      { totalUsage: { $lt: { $ifNull: ['$usageLimit', 1] } } }
    ]
  });
};

// 静态方法：获取用户可用的优惠券
couponSchema.statics.findAvailableForUser = function(userId) {
  const now = new Date();
  return this.find({
    isActive: true,
    isPublic: true,
    validFrom: { $lte: now },
    validUntil: { $gte: now },
    $or: [
      { usageLimit: 0 },
      { totalUsage: { $lt: { $ifNull: ['$usageLimit', 1] } } }
    ]
  });
};

// 静态方法：验证优惠券是否适用于订单
couponSchema.statics.validateForOrder = async function(couponCode, orderAmount, userId, productItems = []) {
  const coupon = await this.findValidByCode(couponCode);
  if (!coupon) {
    return { isValid: false, error: '优惠券无效或已过期' };
  }
  
  // 检查最低消费金额
  if (orderAmount < coupon.minPurchaseAmount) {
    return { 
      isValid: false, 
      error: `订单金额不足，需满¥${coupon.minPurchaseAmount}才能使用` 
    };
  }
  
  // 检查用户使用次数限制
  if (coupon.usageLimitPerUser > 0) {
    const UserCoupon = mongoose.model('UserCoupon');
    const userUsage = await UserCoupon.countDocuments({
      coupon: coupon._id,
      user: userId,
      status: 'used'
    });
    
    if (userUsage >= coupon.usageLimitPerUser) {
      return { isValid: false, error: '您已达到该优惠券的使用次数限制' };
    }
  }
  
  // 检查商品适用范围
  if (coupon.applicableCategories && coupon.applicableCategories.length > 0) {
    const Product = mongoose.model('Product');
    const applicableProducts = await Product.find({
      _id: { $in: productItems.map(item => item.product) },
      category: { $in: coupon.applicableCategories }
    });
    
    if (applicableProducts.length === 0) {
      return { isValid: false, error: '该优惠券不适用于当前商品' };
    }
  }
  
  // 计算折扣金额
  let discountAmount = 0;
  
  switch (coupon.discountType) {
    case 'percentage':
      discountAmount = orderAmount * (coupon.discountValue / 100);
      break;
    case 'fixed':
      discountAmount = coupon.discountValue;
      break;
    case 'free_shipping':
      discountAmount = 15; // 假设运费为15元
      break;
  }
  
  // 应用最大折扣限制
  if (coupon.maxDiscountAmount && discountAmount > coupon.maxDiscountAmount) {
    discountAmount = coupon.maxDiscountAmount;
  }
  
  // 确保折扣金额不超过订单金额
  discountAmount = Math.min(discountAmount, orderAmount);
  
  return {
    isValid: true,
    coupon: coupon,
    discountAmount: discountAmount,
    finalAmount: orderAmount - discountAmount
  };
};

// 实例方法：使用优惠券
couponSchema.methods.useCoupon = function(userId, orderAmount) {
  if (!this.isValid) {
    throw new Error('优惠券无效');
  }
  
  this.totalUsage += 1;
  
  // 计算折扣金额
  let discountAmount = 0;
  
  switch (this.discountType) {
    case 'percentage':
      discountAmount = orderAmount * (this.discountValue / 100);
      break;
    case 'fixed':
      discountAmount = this.discountValue;
      break;
    case 'free_shipping':
      discountAmount = 15; // 假设运费为15元
      break;
  }
  
  // 应用最大折扣限制
  if (this.maxDiscountAmount && discountAmount > this.maxDiscountAmount) {
    discountAmount = this.maxDiscountAmount;
  }
  
  this.totalDiscountAmount += discountAmount;
  
  return this.save();
};

const Coupon = mongoose.model('Coupon', couponSchema);

module.exports = Coupon;
