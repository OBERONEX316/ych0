const mongoose = require('mongoose');

const flashSaleSchema = new mongoose.Schema({
  // 基本信息
  title: {
    type: String,
    required: [true, '秒杀活动标题不能为空'],
    trim: true,
    maxlength: [100, '活动标题不能超过100个字符']
  },
  description: {
    type: String,
    required: [true, '活动描述不能为空'],
    maxlength: [500, '活动描述不能超过500个字符']
  },
  image: {
    type: String,
    default: '/images/flash-sale-default.jpg'
  },
  
  // 时间设置
  startTime: {
    type: Date,
    required: [true, '活动开始时间不能为空']
  },
  endTime: {
    type: Date,
    required: [true, '活动结束时间不能为空']
  },
  
  // 状态管理
  status: {
    type: String,
    enum: ['draft', 'scheduled', 'active', 'ended', 'cancelled'],
    default: 'draft'
  },
  
  // 商品设置
  products: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    flashPrice: {
      type: Number,
      required: [true, '秒杀价格不能为空'],
      min: [0, '价格不能为负数']
    },
    originalPrice: {
      type: Number,
      required: true
    },
    discount: {
      type: Number,
      min: [0, '折扣不能为负数'],
      max: [100, '折扣不能超过100%']
    },
    stock: {
      type: Number,
      required: [true, '秒杀库存不能为空'],
      min: [1, '库存至少为1']
    },
    sold: {
      type: Number,
      default: 0,
      min: 0
    },
    limitPerUser: {
      type: Number,
      default: 1,
      min: 1
    },
    sortOrder: {
      type: Number,
      default: 0
    }
  }],
  
  // 参与条件
  participationConditions: {
    minLevel: {
      type: Number,
      default: 1,
      min: 1
    },
    requireMembership: {
      type: Boolean,
      default: false
    },
    membershipLevels: [{
      type: String,
      enum: ['bronze', 'silver', 'gold', 'platinum', 'diamond']
    }],
    couponRequired: {
      type: Boolean,
      default: false
    },
    requiredCoupon: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Coupon'
    }
  },
  
  // 预热设置
  preheat: {
    enabled: {
      type: Boolean,
      default: true
    },
    preheatTime: {
      type: Date
    },
    notificationEnabled: {
      type: Boolean,
      default: true
    },
    reminderEnabled: {
      type: Boolean,
      default: true
    }
  },
  
  // 统计信息
  statistics: {
    totalViews: {
      type: Number,
      default: 0
    },
    totalParticipants: {
      type: Number,
      default: 0
    },
    totalOrders: {
      type: Number,
      default: 0
    },
    totalRevenue: {
      type: Number,
      default: 0
    },
    conversionRate: {
      type: Number,
      default: 0
    }
  },
  
  // SEO和分享设置
  seo: {
    metaTitle: String,
    metaDescription: String,
    shareImage: String
  },
  
  // 排序和权重
  sortOrder: {
    type: Number,
    default: 0
  },
  weight: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  
  // 活动标签
  tags: [String],
  
  // 备注
  notes: String,
  
  // 操作日志
  operationLog: [{
    action: String,
    operator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    details: String
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// 虚拟字段
flashSaleSchema.virtual('isActive').get(function() {
  const now = new Date();
  return this.status === 'active' && this.startTime <= now && this.endTime > now;
});

flashSaleSchema.virtual('isUpcoming').get(function() {
  const now = new Date();
  return this.status === 'scheduled' && this.startTime > now;
});

flashSaleSchema.virtual('isExpired').get(function() {
  const now = new Date();
  return this.endTime <= now;
});

flashSaleSchema.virtual('timeRemaining').get(function() {
  if (!this.isActive) return 0;
  return Math.max(0, this.endTime - new Date());
});

flashSaleSchema.virtual('progress').get(function() {
  const totalStock = this.products.reduce((sum, item) => sum + item.stock, 0);
  const totalSold = this.products.reduce((sum, item) => sum + item.sold, 0);
  return totalStock > 0 ? Math.round((totalSold / (totalStock + totalSold)) * 100) : 0;
});

// 实例方法
flashSaleSchema.methods.canUserParticipate = function(user) {
  if (!user) return false;
  
  // 检查会员等级
  if (user.points.level < this.participationConditions.minLevel) {
    return false;
  }
  
  // 检查是否需要特定会员等级
  if (this.participationConditions.requireMembership && 
      this.participationConditions.membershipLevels.length > 0) {
    const userMembership = user.membership?.level || 'bronze';
    if (!this.participationConditions.membershipLevels.includes(userMembership)) {
      return false;
    }
  }
  
  return true;
};

flashSaleSchema.methods.updateStatistics = function() {
  // 更新转化率
  if (this.statistics.totalViews > 0) {
    this.statistics.conversionRate = 
      (this.statistics.totalOrders / this.statistics.totalViews) * 100;
  }
};

// 静态方法
flashSaleSchema.statics.getActiveSales = function() {
  const now = new Date();
  return this.find({
    status: 'active',
    startTime: { $lte: now },
    endTime: { $gt: now }
  }).populate('products.product', 'name images price stock');
};

flashSaleSchema.statics.getUpcomingSales = function() {
  const now = new Date();
  return this.find({
    status: 'scheduled',
    startTime: { $gt: now }
  }).populate('products.product', 'name images price stock');
};

flashSaleSchema.statics.getSalesByStatus = function(status) {
  return this.find({ status }).populate('products.product', 'name images price stock');
};

// 索引优化
flashSaleSchema.index({ startTime: 1, endTime: 1 });
flashSaleSchema.index({ status: 1 });
flashSaleSchema.index({ 'products.product': 1 });
flashSaleSchema.index({ sortOrder: -1 });
flashSaleSchema.index({ weight: -1 });

module.exports = mongoose.model('FlashSale', flashSaleSchema);