const mongoose = require('mongoose');

const userActivitySchema = new mongoose.Schema({
  // 用户信息
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // 会话信息
  sessionId: {
    type: String,
    required: true,
    index: true
  },
  
  // 行为类型
  actionType: {
    type: String,
    required: true,
    enum: [
      'page_view',      // 页面浏览
      'product_view',   // 商品查看
      'add_to_cart',   // 加入购物车
      'remove_from_cart', // 从购物车移除
      'add_to_wishlist', // 加入心愿单
      'remove_from_wishlist', // 从心愿单移除
      'search',         // 搜索
      'filter',         // 筛选
      'sort',           // 排序
      'checkout_start', // 开始结算
      'checkout_complete', // 完成结算
      'payment_success', // 支付成功
      'payment_failed',  // 支付失败
      'review_submit',  // 提交评价
      'review_like',    // 点赞评价
      'share_product',  // 分享商品
      'click_banner',   // 点击横幅
      'click_recommendation' // 点击推荐
    ]
  },
  
  // 行为目标
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'targetModel'
  },
  
  targetModel: {
    type: String,
    enum: ['Product', 'Category', 'Banner', 'Review']
  },
  
  // 行为数据
  actionData: {
    // 搜索相关
    searchQuery: String,
    searchResults: Number,
    
    // 商品相关
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product'
    },
    productName: String,
    productCategory: String,
    productPrice: Number,
    
    // 购物车相关
    cartItemId: mongoose.Schema.Types.ObjectId,
    quantity: Number,
    
    // 筛选相关
    filters: mongoose.Schema.Types.Mixed,
    sortBy: String,
    
    // 支付相关
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order'
    },
    amount: Number,
    paymentMethod: String,
    
    // 评价相关
    rating: Number,
    reviewText: String,
    
    // 推荐相关
    recommendationType: String,
    recommendationScore: Number,
    
    // 页面相关
    pageUrl: String,
    pageTitle: String,
    referrer: String,
    
    // 设备信息
    userAgent: String,
    screenResolution: String,
    language: String,
    
    // 地理位置
    ipAddress: String,
    country: String,
    region: String,
    city: String
  },
  
  // 行为权重（用于推荐算法）
  weight: {
    type: Number,
    default: 1.0,
    min: 0.1,
    max: 10.0
  },
  
  // 时间衰减因子
  decayFactor: {
    type: Number,
    default: 0.95,
    min: 0.5,
    max: 1.0
  },
  
  // 行为有效性
  isValid: {
    type: Boolean,
    default: true
  },
  
  // 时间信息
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  
  // 会话开始时间
  sessionStartTime: {
    type: Date,
    default: Date.now
  },
  
  // 行为持续时间（毫秒）
  duration: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// 虚拟字段：计算衰减后的权重
userActivitySchema.virtual('decayedWeight').get(function() {
  const now = new Date();
  const hoursPassed = (now - this.timestamp) / (1000 * 60 * 60);
  return this.weight * Math.pow(this.decayFactor, hoursPassed);
});

// 静态方法：获取用户行为统计
userActivitySchema.statics.getUserActivityStats = async function(userId, timeRange = '7d') {
  const now = new Date();
  let startDate;
  
  switch (timeRange) {
    case '1h':
      startDate = new Date(now - 60 * 60 * 1000);
      break;
    case '24h':
      startDate = new Date(now - 24 * 60 * 60 * 1000);
      break;
    case '7d':
      startDate = new Date(now - 7 * 24 * 60 * 60 * 1000);
      break;
    case '30d':
      startDate = new Date(now - 30 * 24 * 60 * 60 * 1000);
      break;
    default:
      startDate = new Date(now - 7 * 24 * 60 * 60 * 1000);
  }
  
  const stats = await this.aggregate([
    {
      $match: {
        userId: mongoose.Types.ObjectId(userId),
        timestamp: { $gte: startDate },
        isValid: true
      }
    },
    {
      $group: {
        _id: '$actionType',
        count: { $sum: 1 },
        totalWeight: { $sum: '$weight' },
        avgDuration: { $avg: '$duration' }
      }
    },
    {
      $sort: { count: -1 }
    }
  ]);
  
  return stats;
};

// 静态方法：获取用户兴趣偏好
userActivitySchema.statics.getUserInterests = async function(userId, limit = 10) {
  const interests = await this.aggregate([
    {
      $match: {
        userId: mongoose.Types.ObjectId(userId),
        actionType: { $in: ['product_view', 'add_to_cart', 'add_to_wishlist', 'search'] },
        isValid: true,
        'actionData.productCategory': { $exists: true }
      }
    },
    {
      $group: {
        _id: '$actionData.productCategory',
        totalViews: {
          $sum: {
            $cond: [{ $eq: ['$actionType', 'product_view'] }, 1, 0]
          }
        },
        totalCarts: {
          $sum: {
            $cond: [{ $eq: ['$actionType', 'add_to_cart'] }, 1, 0]
          }
        },
        totalWishlists: {
          $sum: {
            $cond: [{ $eq: ['$actionType', 'add_to_wishlist'] }, 1, 0]
          }
        },
        totalSearches: {
          $sum: {
            $cond: [{ $eq: ['$actionType', 'search'] }, 1, 0]
          }
        },
        totalWeight: { $sum: '$decayedWeight' }
      }
    },
    {
      $project: {
        category: '$_id',
        totalViews: 1,
        totalCarts: 1,
        totalWishlists: 1,
        totalSearches: 1,
        totalWeight: 1,
        interestScore: {
          $add: [
            { $multiply: ['$totalViews', 0.3] },
            { $multiply: ['$totalCarts', 0.5] },
            { $multiply: ['$totalWishlists', 0.7] },
            { $multiply: ['$totalSearches', 0.4] },
            { $multiply: ['$totalWeight', 0.2] }
          ]
        }
      }
    },
    {
      $sort: { interestScore: -1 }
    },
    {
      $limit: limit
    }
  ]);
  
  return interests;
};

// 静态方法：清理过期数据
userActivitySchema.statics.cleanupOldData = async function(days = 90) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  
  const result = await this.deleteMany({
    timestamp: { $lt: cutoffDate }
  });
  
  return result;
};

// 索引优化
userActivitySchema.index({ userId: 1, timestamp: -1 });
userActivitySchema.index({ actionType: 1, timestamp: -1 });
userActivitySchema.index({ 'actionData.productId': 1, timestamp: -1 });
userActivitySchema.index({ sessionId: 1, timestamp: -1 });

module.exports = mongoose.model('UserActivity', userActivitySchema);