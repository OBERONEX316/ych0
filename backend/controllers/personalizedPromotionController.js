const User = require('../models/User');
const UserActivity = require('../models/UserActivity');
const Coupon = require('../models/Coupon');
const UserCoupon = require('../models/UserCoupon');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Promotion = require('../models/Promotion');

// 促销策略配置
const PROMOTION_STRATEGIES = {
  NEW_USER: {
    name: '新用户欢迎礼',
    priority: 10,
    conditions: {
      minOrders: 0,
      maxOrders: 0,
      accountAgeDays: 7,
      minActivityScore: 10
    },
    rewards: [
      { type: 'coupon', value: 'WELCOME10', description: '新用户专享10元优惠券' },
      { type: 'points', value: 100, description: '新用户注册奖励100积分' }
    ]
  },
  
  FREQUENT_SHOPPER: {
    name: '忠实客户回馈',
    priority: 8,
    conditions: {
      minOrders: 5,
      minOrderAmount: 1000,
      lastOrderDays: 30
    },
    rewards: [
      { type: 'coupon', value: 'LOYAL15', description: '忠实客户15元优惠券' },
      { type: 'points', value: 200, description: '忠实客户奖励200积分' }
    ]
  },
  
  CART_ABANDONMENT: {
    name: '购物车挽回',
    priority: 9,
    conditions: {
      cartAbandonmentHours: 24,
      minCartValue: 50,
      maxRecentOrders: 0
    },
    rewards: [
      { type: 'coupon', value: 'COMEBACK8', description: '购物车挽回8元优惠券' },
      { type: 'free_shipping', description: '免运费优惠' }
    ]
  },
  
  BIRTHDAY: {
    name: '生日特惠',
    priority: 7,
    conditions: {
      isBirthday: true,
      minActivityScore: 20
    },
    rewards: [
      { type: 'coupon', value: 'BIRTHDAY20', description: '生日专属20元优惠券' },
      { type: 'points', value: 300, description: '生日奖励300积分' }
    ]
  },
  
  PRODUCT_SPECIFIC: {
    name: '商品专属促销',
    priority: 6,
    conditions: {
      viewedProducts: [],
      minViewCount: 3,
      notPurchased: true
    },
    rewards: [
      { type: 'coupon', value: 'PRODUCT10', description: '商品专属10元优惠券' }
    ]
  },
  
  LOW_ACTIVITY: {
    name: '唤醒沉睡用户',
    priority: 5,
    conditions: {
      lastActivityDays: 60,
      minPastOrders: 1,
      maxRecentOrders: 0
    },
    rewards: [
      { type: 'coupon', value: 'MISSYOU5', description: '想念您5元优惠券' }
    ]
  }
};

// 计算用户活动分数
const calculateUserActivityScore = async (userId) => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const activities = await UserActivity.find({
      userId,
      timestamp: { $gte: thirtyDaysAgo },
      isValid: true
    });
    
    let score = 0;
    activities.forEach(activity => {
      // 使用衰减后的权重计算分数
      const hoursPassed = (new Date() - activity.timestamp) / (1000 * 60 * 60);
      const decayedWeight = activity.weight * Math.pow(activity.decayFactor, hoursPassed / 24);
      score += decayedWeight;
    });
    
    return Math.round(score);
  } catch (error) {
    console.error('计算用户活动分数失败:', error);
    return 0;
  }
};

// 获取用户订单统计
const getUserOrderStats = async (userId) => {
  try {
    const stats = await Order.aggregate([
      {
        $match: {
          user: userId,
          status: { $in: ['delivered', 'completed'] }
        }
      },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalAmount: { $sum: '$totalPrice' },
          avgOrderValue: { $avg: '$totalPrice' },
          lastOrderDate: { $max: '$createdAt' }
        }
      }
    ]);
    
    return stats[0] || {
      totalOrders: 0,
      totalAmount: 0,
      avgOrderValue: 0,
      lastOrderDate: null
    };
  } catch (error) {
    console.error('获取用户订单统计失败:', error);
    return {
      totalOrders: 0,
      totalAmount: 0,
      avgOrderValue: 0,
      lastOrderDate: null
    };
  }
};

// 检查购物车放弃情况
const checkCartAbandonment = async (userId) => {
  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    // 查找24小时内的购物车相关活动
    const cartActivities = await UserActivity.find({
      userId,
      actionType: { $in: ['add_to_cart', 'remove_from_cart'] },
      timestamp: { $gte: twentyFourHoursAgo }
    }).sort({ timestamp: -1 });
    
    // 获取用户当前购物车
    const user = await User.findById(userId).populate('cart.items.product');
    
    if (!user || user.cart.items.length === 0) {
      return null;
    }
    
    const cartValue = user.cart.totalPrice;
    const lastCartActivity = cartActivities[0];
    
    if (lastCartActivity && lastCartActivity.actionType === 'add_to_cart') {
      return {
        abandoned: true,
        cartValue,
        lastActivityTime: lastCartActivity.timestamp,
        hoursSinceLastActivity: (new Date() - lastCartActivity.timestamp) / (1000 * 60 * 60)
      };
    }
    
    return null;
  } catch (error) {
    console.error('检查购物车放弃失败:', error);
    return null;
  }
};

// 获取用户浏览历史
const getUserViewHistory = async (userId, days = 30) => {
  try {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    const viewHistory = await UserActivity.aggregate([
      {
        $match: {
          userId: userId,
          actionType: 'product_view',
          timestamp: { $gte: startDate },
          isValid: true
        }
      },
      {
        $group: {
          _id: '$actionData.productId',
          viewCount: { $sum: 1 },
          lastView: { $max: '$timestamp' },
          productName: { $first: '$actionData.productName' },
          productCategory: { $first: '$actionData.productCategory' }
        }
      },
      {
        $sort: { viewCount: -1 }
      },
      {
        $limit: 20
      }
    ]);
    
    return viewHistory;
  } catch (error) {
    console.error('获取用户浏览历史失败:', error);
    return [];
  }
};

// 检查用户是否购买过某商品
const hasUserPurchasedProduct = async (userId, productId) => {
  try {
    const order = await Order.findOne({
      user: userId,
      'orderItems.product': productId,
      status: { $in: ['delivered', 'completed'] }
    });
    
    return !!order;
  } catch (error) {
    console.error('检查用户购买记录失败:', error);
    return false;
  }
};

// 评估用户适用的促销策略
const evaluatePromotionStrategies = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      return [];
    }
    
    const [activityScore, orderStats, cartAbandonment, viewHistory] = await Promise.all([
      calculateUserActivityScore(userId),
      getUserOrderStats(userId),
      checkCartAbandonment(userId),
      getUserViewHistory(userId)
    ]);
    
    const applicableStrategies = [];
    
    // 检查新用户策略
    if (orderStats.totalOrders === 0 && 
        activityScore >= PROMOTION_STRATEGIES.NEW_USER.conditions.minActivityScore) {
      const accountAgeDays = (new Date() - user.createdAt) / (1000 * 60 * 60 * 24);
      if (accountAgeDays <= PROMOTION_STRATEGIES.NEW_USER.conditions.accountAgeDays) {
        applicableStrategies.push({
          ...PROMOTION_STRATEGIES.NEW_USER,
          matchScore: 0.9
        });
      }
    }
    
    // 检查忠实客户策略
    if (orderStats.totalOrders >= PROMOTION_STRATEGIES.FREQUENT_SHOPPER.conditions.minOrders &&
        orderStats.totalAmount >= PROMOTION_STRATEGIES.FREQUENT_SHOPPER.conditions.minOrderAmount) {
      const lastOrderDays = orderStats.lastOrderDate ? 
        (new Date() - orderStats.lastOrderDate) / (1000 * 60 * 60 * 24) : Infinity;
      
      if (lastOrderDays <= PROMOTION_STRATEGIES.FREQUENT_SHOPPER.conditions.lastOrderDays) {
        applicableStrategies.push({
          ...PROMOTION_STRATEGIES.FREQUENT_SHOPPER,
          matchScore: 0.8
        });
      }
    }
    
    // 检查购物车放弃策略
    if (cartAbandonment && 
        cartAbandonment.abandoned &&
        cartAbandonment.cartValue >= PROMOTION_STRATEGIES.CART_ABANDONMENT.conditions.minCartValue &&
        orderStats.totalOrders === 0) {
      applicableStrategies.push({
        ...PROMOTION_STRATEGIES.CART_ABANDONMENT,
        matchScore: 0.85
      });
    }
    
    // 检查生日策略（简化版）
    const today = new Date();
    const userBirthday = user.birthday; // 假设用户模型有birthday字段
    if (userBirthday && 
        userBirthday.getMonth() === today.getMonth() &&
        userBirthday.getDate() === today.getDate() &&
        activityScore >= PROMOTION_STRATEGIES.BIRTHDAY.conditions.minActivityScore) {
      applicableStrategies.push({
        ...PROMOTION_STRATEGIES.BIRTHDAY,
        matchScore: 0.95
      });
    }
    
    // 检查商品专属策略
    for (const viewedProduct of viewHistory) {
      if (viewedProduct.viewCount >= PROMOTION_STRATEGIES.PRODUCT_SPECIFIC.conditions.minViewCount) {
        const hasPurchased = await hasUserPurchasedProduct(userId, viewedProduct._id);
        if (!hasPurchased) {
          applicableStrategies.push({
            ...PROMOTION_STRATEGIES.PRODUCT_SPECIFIC,
            targetProduct: viewedProduct,
            matchScore: 0.7
          });
          break;
        }
      }
    }
    
    // 检查沉睡用户策略
    const lastActivityDays = activityScore > 0 ? 0 : 90; // 简化处理
    if (lastActivityDays >= 60 &&
        orderStats.totalOrders >= PROMOTION_STRATEGIES.LOW_ACTIVITY.conditions.minPastOrders &&
        orderStats.totalOrders === 0) {
      applicableStrategies.push({
        ...PROMOTION_STRATEGIES.LOW_ACTIVITY,
        matchScore: 0.6
      });
    }
    
    // 按优先级和匹配度排序
    return applicableStrategies.sort((a, b) => {
      const priorityDiff = b.priority - a.priority;
      if (priorityDiff !== 0) return priorityDiff;
      return b.matchScore - a.matchScore;
    });
    
  } catch (error) {
    console.error('评估促销策略失败:', error);
    return [];
  }
};

// 应用促销奖励
const applyPromotionRewards = async (userId, strategy) => {
  try {
    const rewards = [];
    
    for (const reward of strategy.rewards) {
      switch (reward.type) {
        case 'coupon':
          // 查找优惠券
          const coupon = await Coupon.findOne({ code: reward.value });
          if (coupon && coupon.isValid) {
            // 为用户分配优惠券
            const userCoupon = await UserCoupon.claimCoupon(
              userId,
              coupon._id,
              'promotion',
              `促销活动: ${strategy.name}`
            );
            rewards.push({
              type: 'coupon',
              code: coupon.code,
              value: coupon.discountValue,
              description: reward.description
            });
          }
          break;
          
        case 'points':
          // 添加积分
          const user = await User.findById(userId);
          if (user) {
            user.points.available += reward.value;
            user.points.total += reward.value;
            await user.save();
            rewards.push({
              type: 'points',
              value: reward.value,
              description: reward.description
            });
          }
          break;
          
        case 'free_shipping':
          rewards.push({
            type: 'free_shipping',
            value: 0,
            description: reward.description
          });
          break;
      }
    }
    
    return rewards;
  } catch (error) {
    console.error('应用促销奖励失败:', error);
    return [];
  }
};

// 获取用户个性化促销
const getPersonalizedPromotions = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // 使用新的促销模型获取适用的促销
    const promotions = await Promotion.findApplicableForUser(userId);
    
    if (promotions.length === 0) {
      return res.json({
        success: true,
        data: [],
        message: '暂无适用的促销活动'
      });
    }
    
    // 格式化返回数据
    const formattedPromotions = promotions.map(promotion => ({
      id: promotion._id,
      name: promotion.name,
      description: promotion.description || `根据您的购物行为为您量身定制的专属优惠`,
      promotionType: promotion.promotionType,
      rewardType: promotion.rewardType,
      rewardValue: promotion.rewardValue,
      priority: promotion.priority,
      validFrom: promotion.validFrom,
      validUntil: promotion.validUntil,
      daysRemaining: promotion.daysRemaining
    }));
    
    res.json({
      success: true,
      data: formattedPromotions,
      message: '个性化促销获取成功'
    });
    
  } catch (error) {
    console.error('获取个性化促销失败:', error);
    res.status(500).json({
      success: false,
      error: '获取个性化促销失败',
      message: error.message
    });
  }
};

// 领取促销奖励
const claimPromotionReward = async (req, res) => {
  try {
    const userId = req.user.id;
    const { promotionId } = req.params;
    
    // 查找促销
    const promotion = await Promotion.findById(promotionId);
    
    if (!promotion || !promotion.isValid) {
      return res.status(404).json({
        success: false,
        error: '促销活动不存在或已过期'
      });
    }
    
    // 检查促销是否适用于用户
    const isApplicable = await promotion.isApplicableToUser(userId);
    if (!isApplicable) {
      return res.status(400).json({
        success: false,
        error: '您不符合该促销活动的条件'
      });
    }
    
    // 应用奖励
    const result = await promotion.applyReward(userId);
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error || '领取奖励失败'
      });
    }
    
    res.json({
      success: true,
      data: result,
      message: '奖励领取成功'
    });
    
  } catch (error) {
    console.error('领取促销奖励失败:', error);
    res.status(500).json({
      success: false,
      error: '领取奖励失败',
      message: error.message
    });
  }
};

// 获取促销效果统计（管理员）
const getPromotionStatistics = async (req, res) => {
  try {
    // 使用新的促销模型获取统计
    const stats = await Promotion.getStatistics();
    
    // 获取用户优惠券的促销相关统计
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const couponStats = await UserCoupon.aggregate([
      {
        $match: {
          promotion: { $exists: true, $ne: null },
          createdAt: { $gte: thirtyDaysAgo }
        }
      },
      {
        $lookup: {
          from: 'promotions',
          localField: 'promotion',
          foreignField: '_id',
          as: 'promotionInfo'
        }
      },
      {
        $unwind: '$promotionInfo'
      },
      {
        $group: {
          _id: '$promotionInfo.promotionType',
          totalClaims: { $sum: 1 },
          totalUsed: {
            $sum: { $cond: [{ $eq: ['$status', 'used'] }, 1, 0] }
          },
          totalDiscount: {
            $sum: { $cond: [{ $eq: ['$status', 'used'] }, '$discountAmount', 0] }
          }
        }
      },
      {
        $sort: { totalClaims: -1 }
      }
    ]);
    
    res.json({
      success: true,
      data: {
        promotionStats: stats,
        couponStats: couponStats
      },
      message: '促销统计获取成功'
    });
    
  } catch (error) {
    console.error('获取促销统计失败:', error);
    res.status(500).json({
      success: false,
      error: '获取促销统计失败',
      message: error.message
    });
  }
};

module.exports = {
  getPersonalizedPromotions,
  claimPromotionReward,
  getPromotionStatistics,
  evaluatePromotionStrategies,
  applyPromotionRewards
};