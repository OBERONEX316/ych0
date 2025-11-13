const mongoose = require('mongoose');

const pointTransactionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: ['earn', 'spend', 'expire', 'adjust']
  },
  amount: {
    type: Number,
    required: true,
    min: 1
  },
  balanceAfter: {
    type: Number,
    required: true,
    min: 0
  },
  // 交易详情
  reason: {
    type: String,
    required: true,
    enum: [
      'purchase',           // 购物消费
      'product_review',     // 商品评价
      'registration',       // 注册奖励
      'birthday',           // 生日奖励
      'referral',           // 推荐好友
      'daily_login',        // 每日登录
      'order_cancellation', // 订单取消（扣回）
      'point_redemption',   // 积分兑换
      'manual_adjustment',  // 手动调整
      'expiration',         // 积分过期
      'level_up_bonus',     // 升级奖励
      'activity_bonus'      // 活动奖励
    ]
  },
  description: {
    type: String,
    trim: true
  },
  // 关联订单（如果是购物相关）
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order'
  },
  // 关联商品（如果是评价相关）
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  },
  // 关联评价（如果是评价奖励）
  review: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Review'
  },
  // 有效期（积分过期时间）
  expiresAt: {
    type: Date,
    default: function() {
      const oneYearFromNow = new Date();
      oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
      return oneYearFromNow;
    }
  },
  // 状态
  status: {
    type: String,
    enum: ['active', 'expired', 'cancelled'],
    default: 'active'
  },
  // 手动调整信息
  adjustment: {
    admin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    note: {
      type: String,
      trim: true
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// 虚拟字段：交易类型名称（中文）
pointTransactionSchema.virtual('typeName').get(function() {
  const typeNames = {
    earn: '获得积分',
    spend: '消费积分',
    expire: '积分过期',
    adjust: '积分调整'
  };
  return typeNames[this.type] || '未知类型';
});

// 虚拟字段：原因名称（中文）
pointTransactionSchema.virtual('reasonName').get(function() {
  const reasonNames = {
    purchase: '购物消费',
    product_review: '商品评价',
    registration: '注册奖励',
    birthday: '生日奖励',
    referral: '推荐好友',
    daily_login: '每日登录',
    order_cancellation: '订单取消',
    point_redemption: '积分兑换',
    manual_adjustment: '手动调整',
    expiration: '积分过期',
    level_up_bonus: '升级奖励',
    activity_bonus: '活动奖励'
  };
  return reasonNames[this.reason] || '其他原因';
});

// 虚拟字段：是否已过期
pointTransactionSchema.virtual('isExpired').get(function() {
  return this.status === 'expired' || 
         (this.type === 'earn' && this.expiresAt && this.expiresAt < new Date());
});

// 静态方法：创建积分交易记录
pointTransactionSchema.statics.createTransaction = async function({
  user,
  type,
  amount,
  reason,
  description,
  order,
  product,
  review,
  admin,
  note
}) {
  // 获取用户当前积分余额
  const LoyaltyPoint = mongoose.model('LoyaltyPoint');
  let loyaltyPoint = await LoyaltyPoint.findOne({ user });
  
  if (!loyaltyPoint) {
    // 如果用户没有积分记录，创建新的
    loyaltyPoint = new LoyaltyPoint({ user, points: 0 });
    await loyaltyPoint.save();
  }
  
  // 计算交易后的余额
  let balanceAfter;
  if (type === 'earn') {
    balanceAfter = loyaltyPoint.points + amount;
  } else if (type === 'spend') {
    if (loyaltyPoint.points < amount) {
      throw new Error('积分不足');
    }
    balanceAfter = loyaltyPoint.points - amount;
  } else {
    balanceAfter = loyaltyPoint.points;
  }
  
  // 创建交易记录
  const transaction = new this({
    user,
    type,
    amount,
    balanceAfter,
    reason,
    description: description || this.generateDescription(type, reason, amount),
    order,
    product,
    review,
    adjustment: admin ? { admin, note } : undefined
  });
  
  await transaction.save();
  
  // 更新用户积分
  if (type === 'earn') {
    await loyaltyPoint.addPoints(amount);
  } else if (type === 'spend') {
    await loyaltyPoint.spendPoints(amount);
  }
  
  await loyaltyPoint.save();
  
  return transaction;
};

// 静态方法：生成交易描述
pointTransactionSchema.statics.generateDescription = function(type, reason, amount) {
  const descriptions = {
    earn: {
      purchase: `购物消费获得 ${amount} 积分`,
      product_review: `商品评价获得 ${amount} 积分`,
      registration: `注册奖励获得 ${amount} 积分`,
      birthday: `生日奖励获得 ${amount} 积分`,
      referral: `推荐好友获得 ${amount} 积分`,
      daily_login: `每日登录获得 ${amount} 积分`,
      level_up_bonus: `等级升级奖励获得 ${amount} 积分`,
      activity_bonus: `活动奖励获得 ${amount} 积分`
    },
    spend: {
      point_redemption: `积分兑换消费 ${amount} 积分`,
      order_cancellation: `订单取消扣回 ${amount} 积分`
    },
    expire: {
      expiration: `${amount} 积分过期`
    },
    adjust: {
      manual_adjustment: `管理员调整积分 ${amount > 0 ? '增加' : '减少'} ${Math.abs(amount)} 积分`
    }
  };
  
  return descriptions[type]?.[reason] || `${type === 'earn' ? '获得' : '消费'} ${amount} 积分`;
};

// 静态方法：获取用户积分交易历史
pointTransactionSchema.statics.getUserTransactions = function(userId, page = 1, limit = 20) {
  return this.find({ user: userId })
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('order', 'orderNumber')
    .populate('product', 'name')
    .populate('review')
    .populate('adjustment.admin', 'username');
};

// 静态方法：检查并处理过期积分
pointTransactionSchema.statics.processExpiredPoints = async function() {
  const now = new Date();
  
  // 查找所有已获得但未过期的积分记录
  const expiredTransactions = await this.find({
    type: 'earn',
    expiresAt: { $lte: now },
    status: 'active'
  });
  
  for (const transaction of expiredTransactions) {
    // 标记为过期
    transaction.status = 'expired';
    await transaction.save();
    
    // 从用户总积分中扣除过期积分
    const LoyaltyPoint = mongoose.model('LoyaltyPoint');
    const loyaltyPoint = await LoyaltyPoint.findOne({ user: transaction.user });
    
    if (loyaltyPoint) {
      // 确保不会扣成负数
      const pointsToDeduct = Math.min(transaction.amount, loyaltyPoint.points);
      if (pointsToDeduct > 0) {
        loyaltyPoint.points -= pointsToDeduct;
        await loyaltyPoint.save();
        
        // 创建过期记录
        await this.createTransaction({
          user: transaction.user,
          type: 'expire',
          amount: pointsToDeduct,
          reason: 'expiration',
          description: `积分过期：${pointsToDeduct} 积分`
        });
      }
    }
  }
  
  return expiredTransactions.length;
};

// 索引优化
pointTransactionSchema.index({ user: 1, createdAt: -1 });
pointTransactionSchema.index({ type: 1 });
pointTransactionSchema.index({ reason: 1 });
pointTransactionSchema.index({ order: 1 });
pointTransactionSchema.index({ product: 1 });
pointTransactionSchema.index({ expiresAt: 1 });
pointTransactionSchema.index({ status: 1 });

module.exports = mongoose.model('PointTransaction', pointTransactionSchema);