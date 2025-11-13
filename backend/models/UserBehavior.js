const mongoose = require('mongoose');

const userBehaviorSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  sessionId: {
    type: String,
    required: true,
    index: true
  },
  action: {
    type: String,
    required: true,
    enum: [
      'page_view',
      'product_view',
      'product_click',
      'add_to_cart',
      'remove_from_cart',
      'cart_view',
      'checkout_start',
      'checkout_complete',
      'search',
      'category_browse',
      'wishlist_add',
      'wishlist_remove',
      'review_view',
      'review_submit',
      'login',
      'logout',
      'register',
      'profile_update',
      'order_view',
      'order_cancel',
      'refund_request',
      'chat_start',
      'chat_end',
      'coupon_use',
      'flash_sale_participate',
      'group_buying_participate',
      'social_share',
      'recommendation_click',
      'recommendation_view'
    ],
    index: true
  },
  targetType: {
    type: String,
    enum: ['product', 'category', 'page', 'search', 'order', 'coupon', 'flash_sale', 'group_buying', 'review', 'chat', 'recommendation'],
    required: function() {
      return ['product_view', 'product_click', 'add_to_cart', 'remove_from_cart', 'wishlist_add', 'wishlist_remove', 'review_view', 'review_submit', 'order_view', 'order_cancel', 'refund_request', 'coupon_use', 'flash_sale_participate', 'group_buying_participate', 'social_share', 'recommendation_click', 'recommendation_view'].includes(this.action);
    }
  },
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    required: function() {
      return ['product', 'category', 'order', 'coupon', 'flash_sale', 'group_buying', 'review', 'chat', 'recommendation'].includes(this.targetType);
    }
  },
  targetData: {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product'
    },
    category: String,
    price: Number,
    quantity: Number,
    searchQuery: String,
    searchResults: Number,
    orderId: mongoose.Schema.Types.ObjectId,
    orderTotal: Number,
    couponCode: String,
    discountAmount: Number,
    recommendationId: String,
    recommendationScore: Number,
    recommendationType: String,
    pageUrl: String,
    pageTitle: String,
    referrer: String,
    deviceInfo: {
      userAgent: String,
      browser: String,
      os: String,
      deviceType: {
        type: String,
        enum: ['desktop', 'mobile', 'tablet'],
        default: 'desktop'
      },
      screenResolution: String,
      viewport: String
    },
    location: {
      ip: String,
      country: String,
      region: String,
      city: String,
      latitude: Number,
      longitude: Number
    },
    duration: Number, // 行为持续时间（秒）
    scrollDepth: Number, // 滚动深度百分比
    clickPosition: {
      x: Number,
      y: Number
    },
    interactionData: mongoose.Schema.Types.Mixed // 其他交互数据
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  metadata: {
    source: {
      type: String,
      enum: ['web', 'mobile_app', 'api'],
      default: 'web'
    },
    version: String, // 应用版本
    campaign: String, // 营销活动
    utmSource: String,
    utmMedium: String,
    utmCampaign: String,
    utmTerm: String,
    utmContent: String
  }
}, {
  timestamps: true,
  collection: 'user_behaviors'
});

// 复合索引优化查询性能
userBehaviorSchema.index({ userId: 1, timestamp: -1 });
userBehaviorSchema.index({ action: 1, timestamp: -1 });
userBehaviorSchema.index({ sessionId: 1, timestamp: 1 });
userBehaviorSchema.index({ 'targetData.productId': 1, timestamp: -1 });
userBehaviorSchema.index({ 'targetData.category': 1, timestamp: -1 });
userBehaviorSchema.index({ 'metadata.campaign': 1, timestamp: -1 });

// 虚拟字段 - 计算行为价值分数
userBehaviorSchema.virtual('behaviorScore').get(function() {
  const scoreMap = {
    'page_view': 1,
    'product_view': 5,
    'product_click': 3,
    'add_to_cart': 15,
    'remove_from_cart': -10,
    'checkout_start': 25,
    'checkout_complete': 50,
    'search': 2,
    'wishlist_add': 8,
    'wishlist_remove': -5,
    'review_submit': 20,
    'order_view': 10,
    'coupon_use': 12,
    'flash_sale_participate': 30,
    'group_buying_participate': 25,
    'social_share': 8,
    'recommendation_click': 6
  };
  return scoreMap[this.action] || 1;
});

// 虚拟字段 - 是否为目标行为
userBehaviorSchema.virtual('isConversion').get(function() {
  return ['checkout_complete', 'order_view', 'review_submit'].includes(this.action);
});

// 虚拟字段 - 行为分类
userBehaviorSchema.virtual('behaviorCategory').get(function() {
  const categories = {
    'browse': ['page_view', 'category_browse', 'product_view'],
    'engagement': ['product_click', 'add_to_cart', 'wishlist_add', 'review_view'],
    'conversion': ['checkout_start', 'checkout_complete', 'order_view', 'coupon_use'],
    'social': ['social_share', 'review_submit'],
    'marketing': ['flash_sale_participate', 'group_buying_participate', 'coupon_use'],
    'search': ['search', 'recommendation_click', 'recommendation_view']
  };
  
  for (const [category, actions] of Object.entries(categories)) {
    if (actions.includes(this.action)) {
      return category;
    }
  }
  return 'other';
});

// 静态方法 - 获取用户行为统计
userBehaviorSchema.statics.getUserStats = async function(userId, timeRange = '30d') {
  const dateLimit = new Date();
  const days = parseInt(timeRange.replace('d', ''));
  dateLimit.setDate(dateLimit.getDate() - days);
  
  const stats = await this.aggregate([
    {
      $match: {
        userId: mongoose.Types.ObjectId(userId),
        timestamp: { $gte: dateLimit }
      }
    },
    {
      $group: {
        _id: null,
        totalBehaviors: { $sum: 1 },
        totalScore: { $sum: '$behaviorScore' },
        conversionCount: {
          $sum: { $cond: [{ $in: ['$action', ['checkout_complete', 'order_view', 'review_submit']] }, 1, 0] }
        },
        avgSessionDuration: { $avg: '$targetData.duration' },
        uniqueSessions: { $addToSet: '$sessionId' }
      }
    },
    {
      $project: {
        _id: 0,
        totalBehaviors: 1,
        totalScore: 1,
        conversionCount: 1,
        avgSessionDuration: { $round: ['$avgSessionDuration', 2] },
        uniqueSessionsCount: { $size: '$uniqueSessions' }
      }
    }
  ]);
  
  return stats[0] || {
    totalBehaviors: 0,
    totalScore: 0,
    conversionCount: 0,
    avgSessionDuration: 0,
    uniqueSessionsCount: 0
  };
};

// 静态方法 - 获取行为趋势
userBehaviorSchema.statics.getBehaviorTrends = async function(timeRange = '30d', groupBy = 'day') {
  const dateLimit = new Date();
  const days = parseInt(timeRange.replace('d', ''));
  dateLimit.setDate(dateLimit.getDate() - days);
  
  const groupFormat = {
    day: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
    week: { $dateToString: { format: '%Y-%U', date: '$timestamp' } },
    month: { $dateToString: { format: '%Y-%m', date: '$timestamp' } }
  };
  
  const trends = await this.aggregate([
    {
      $match: {
        timestamp: { $gte: dateLimit }
      }
    },
    {
      $group: {
        _id: groupFormat[groupBy] || groupFormat.day,
        totalBehaviors: { $sum: 1 },
        uniqueUsers: { $addToSet: '$userId' },
        uniqueSessions: { $addToSet: '$sessionId' },
        avgScore: { $avg: '$behaviorScore' },
        conversionCount: {
          $sum: { $cond: [{ $in: ['$action', ['checkout_complete', 'order_view', 'review_submit']] }, 1, 0] }
        }
      }
    },
    {
      $project: {
        date: '$_id',
        _id: 0,
        totalBehaviors: 1,
        uniqueUsersCount: { $size: '$uniqueUsers' },
        uniqueSessionsCount: { $size: '$uniqueSessions' },
        avgScore: { $round: ['$avgScore', 2] },
        conversionCount: 1,
        conversionRate: {
          $cond: [
            { $gt: ['$totalBehaviors', 0] },
            { $multiply: [{ $divide: ['$conversionCount', '$totalBehaviors'] }, 100] },
            0
          ]
        }
      }
    },
    { $sort: { date: 1 } }
  ]);
  
  return trends;
};

// 静态方法 - 获取热门行为
userBehaviorSchema.statics.getPopularBehaviors = async function(timeRange = '30d', limit = 10) {
  const dateLimit = new Date();
  const days = parseInt(timeRange.replace('d', ''));
  dateLimit.setDate(dateLimit.getDate() - days);
  
  const behaviors = await this.aggregate([
    {
      $match: {
        timestamp: { $gte: dateLimit }
      }
    },
    {
      $group: {
        _id: '$action',
        count: { $sum: 1 },
        uniqueUsers: { $addToSet: '$userId' },
        avgScore: { $avg: '$behaviorScore' }
      }
    },
    {
      $project: {
        action: '$_id',
        _id: 0,
        count: 1,
        uniqueUsersCount: { $size: '$uniqueUsers' },
        avgScore: { $round: ['$avgScore', 2] }
      }
    },
    { $sort: { count: -1 } },
    { $limit: limit }
  ]);
  
  return behaviors;
};

// 静态方法 - 获取用户行为路径
userBehaviorSchema.statics.getUserJourney = async function(userId, sessionId = null) {
  const match = { userId: mongoose.Types.ObjectId(userId) };
  if (sessionId) {
    match.sessionId = sessionId;
  }
  
  const journey = await this.find(match)
    .populate('targetData.productId', 'name price images')
    .sort({ timestamp: 1 })
    .limit(100);
  
  return journey;
};

module.exports = mongoose.model('UserBehavior', userBehaviorSchema);