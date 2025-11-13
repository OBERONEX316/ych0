const UserActivity = require('../models/UserActivity');
const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');

// 默认行为权重配置
const DEFAULT_WEIGHTS = {
  page_view: 0.3,
  product_view: 1.0,
  add_to_cart: 2.0,
  remove_from_cart: -1.0,
  add_to_wishlist: 1.5,
  remove_from_wishlist: -0.8,
  search: 0.7,
  filter: 0.5,
  sort: 0.4,
  checkout_start: 2.5,
  checkout_complete: 3.0,
  payment_success: 4.0,
  payment_failed: -0.5,
  review_submit: 1.8,
  review_like: 0.6,
  share_product: 1.2,
  click_banner: 0.8,
  click_recommendation: 1.1,
  recommend_like: 1.2,
  recommend_hide: -1.5
};

// 动态权重调整配置
let dynamicWeights = { ...DEFAULT_WEIGHTS };

// 权重调整历史记录
const weightAdjustmentHistory = [];

// 行为效果评估指标
const actionEffectivenessMetrics = {
  conversionRates: new Map(),
  engagementScores: new Map(),
  revenueImpact: new Map()
};

// 自动权重优化配置
const AUTO_OPTIMIZATION_CONFIG = {
  enabled: true,
  optimizationInterval: 24 * 60 * 60 * 1000, // 24小时
  minDataPoints: 100,
  maxAdjustment: 0.5, // 最大调整幅度
  learningRate: 0.1,
  decayRate: 0.99
};

// 记录用户行为
exports.trackUserActivity = async (req, res) => {
  try {
    const {
      actionType,
      targetId,
      targetModel,
      actionData,
      sessionId,
      weight,
      decayFactor
    } = req.body;
    
    const userId = req.user?.id;
    
    if (!actionType || !sessionId) {
      return res.status(400).json({
        success: false,
        message: 'actionType和sessionId是必填字段'
      });
    }
    
    // 验证行为类型
    if (!DEFAULT_WEIGHTS.hasOwnProperty(actionType)) {
      return res.status(400).json({
        success: false,
        message: '无效的行为类型'
      });
    }
    
    // 计算动态权重
    const finalWeight = weight !== undefined ? weight : dynamicWeights[actionType];
    const finalDecayFactor = decayFactor !== undefined ? decayFactor : 0.95;
    
    const userActivity = new UserActivity({
      userId,
      sessionId,
      actionType,
      targetId,
      targetModel,
      actionData: actionData || {},
      weight: finalWeight,
      decayFactor: finalDecayFactor
    });
    
    await userActivity.save();
    
    res.status(201).json({
      success: true,
      message: '用户行为记录成功',
      data: userActivity
    });
    
  } catch (error) {
    console.error('记录用户行为失败:', error);
    res.status(500).json({
      success: false,
      message: '记录用户行为失败',
      error: error.message
    });
  }
};

// 自动权重优化函数
exports.autoOptimizeWeights = async () => {
  try {
    if (!AUTO_OPTIMIZATION_CONFIG.enabled) {
      return;
    }
    
    console.log('🚀 开始自动权重优化...');
    
    // 获取最近7天的行为数据
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    const activities = await UserActivity.find({
      timestamp: { $gte: sevenDaysAgo },
      isValid: true
    });
    
    if (activities.length < AUTO_OPTIMIZATION_CONFIG.minDataPoints) {
      console.log('📊 数据点不足，跳过权重优化');
      return;
    }
    
    // 计算行为转化率
    const conversionRates = calculateConversionRates(activities);
    
    // 计算用户参与度
    const engagementScores = calculateEngagementScores(activities);
    
    // 计算收入影响
    const revenueImpact = await calculateRevenueImpact(activities);
    
    // 更新效果指标
    updateEffectivenessMetrics(conversionRates, engagementScores, revenueImpact);
    
    // 调整权重
    const adjustments = optimizeWeights(conversionRates, engagementScores, revenueImpact);
    
    // 应用调整
    applyWeightAdjustments(adjustments);
    
    // 记录调整历史
    weightAdjustmentHistory.push({
      timestamp: new Date(),
      adjustments,
      conversionRates: Object.fromEntries(conversionRates),
      engagementScores: Object.fromEntries(engagementScores),
      revenueImpact: Object.fromEntries(revenueImpact)
    });
    
    console.log('✅ 权重优化完成');
    console.log('📈 调整详情:', adjustments);
    
  } catch (error) {
    console.error('❌ 自动权重优化失败:', error);
  }
};

// 计算行为转化率
const calculateConversionRates = (activities) => {
  const conversionRates = new Map();
  const actionCounts = new Map();
  const conversionCounts = new Map();
  
  // 初始化计数
  Object.keys(DEFAULT_WEIGHTS).forEach(actionType => {
    actionCounts.set(actionType, 0);
    conversionCounts.set(actionType, 0);
  });
  
  // 统计行为次数和转化次数
  activities.forEach(activity => {
    const { actionType } = activity;
    actionCounts.set(actionType, (actionCounts.get(actionType) || 0) + 1);
    
    // 检查是否转化为购买
    if (isConversionAction(activity)) {
      conversionCounts.set(actionType, (conversionCounts.get(actionType) || 0) + 1);
    }
  });
  
  // 计算转化率
  actionCounts.forEach((count, actionType) => {
    if (count > 10) { // 最小样本要求
      const conversionRate = conversionCounts.get(actionType) / count;
      conversionRates.set(actionType, conversionRate);
    }
  });
  
  return conversionRates;
};

// 判断是否为转化行为
const isConversionAction = (activity) => {
  const { actionType, actionData } = activity;
  
  // 购买完成、支付成功等视为转化
  return actionType === 'checkout_complete' || 
         actionType === 'payment_success' ||
         (actionData?.orderId && actionType === 'add_to_cart');
};

// 计算用户参与度分数
const calculateEngagementScores = (activities) => {
  const engagementScores = new Map();
  const sessionEngagement = new Map();
  
  // 按会话分组
  activities.forEach(activity => {
    const { sessionId, actionType, weight } = activity;
    if (!sessionEngagement.has(sessionId)) {
      sessionEngagement.set(sessionId, new Map());
    }
    
    const sessionActions = sessionEngagement.get(sessionId);
    sessionActions.set(actionType, (sessionActions.get(actionType) || 0) + weight);
  });
  
  // 计算平均参与度
  sessionEngagement.forEach((actions, sessionId) => {
    actions.forEach((score, actionType) => {
      const currentScore = engagementScores.get(actionType) || 0;
      engagementScores.set(actionType, currentScore + score);
    });
  });
  
  // 标准化分数
  engagementScores.forEach((score, actionType) => {
    engagementScores.set(actionType, score / sessionEngagement.size);
  });
  
  return engagementScores;
};

// 计算收入影响
const calculateRevenueImpact = async (activities) => {
  const revenueImpact = new Map();
  const orderActivities = activities.filter(activity => 
    activity.actionType === 'checkout_complete' || activity.actionType === 'payment_success'
  );
  
  for (const activity of orderActivities) {
    if (activity.actionData?.orderId) {
      try {
        const order = await Order.findById(activity.actionData.orderId);
        if (order) {
          const revenue = order.totalAmount || 0;
          revenueImpact.set(activity.actionType, 
            (revenueImpact.get(activity.actionType) || 0) + revenue
          );
        }
      } catch (error) {
        console.error('获取订单信息失败:', error);
      }
    }
  }
  
  return revenueImpact;
};

// 更新效果指标
const updateEffectivenessMetrics = (conversionRates, engagementScores, revenueImpact) => {
  conversionRates.forEach((rate, actionType) => {
    const currentRate = actionEffectivenessMetrics.conversionRates.get(actionType) || 0;
    const newRate = currentRate * 0.7 + rate * 0.3; // 指数平滑
    actionEffectivenessMetrics.conversionRates.set(actionType, newRate);
  });
  
  engagementScores.forEach((score, actionType) => {
    const currentScore = actionEffectivenessMetrics.engagementScores.get(actionType) || 0;
    const newScore = currentScore * 0.7 + score * 0.3;
    actionEffectivenessMetrics.engagementScores.set(actionType, newScore);
  });
  
  revenueImpact.forEach((revenue, actionType) => {
    const currentRevenue = actionEffectivenessMetrics.revenueImpact.get(actionType) || 0;
    const newRevenue = currentRevenue * 0.7 + revenue * 0.3;
    actionEffectivenessMetrics.revenueImpact.set(actionType, newRevenue);
  });
};

// 优化权重
const optimizeWeights = (conversionRates, engagementScores, revenueImpact) => {
  const adjustments = {};
  
  Object.keys(DEFAULT_WEIGHTS).forEach(actionType => {
    const currentWeight = dynamicWeights[actionType];
    const conversionRate = conversionRates.get(actionType) || 0;
    const engagementScore = engagementScores.get(actionType) || 0;
    const revenue = revenueImpact.get(actionType) || 0;
    
    // 计算综合得分
    let score = 0;
    if (conversionRate > 0) score += conversionRate * 0.4;
    if (engagementScore > 0) score += engagementScore * 0.3;
    if (revenue > 0) score += Math.log1p(revenue) * 0.3;
    
    // 计算调整幅度
    let adjustment = 0;
    if (score > 0.1) { // 有显著效果
      adjustment = AUTO_OPTIMIZATION_CONFIG.learningRate * score;
      adjustment = Math.min(adjustment, AUTO_OPTIMIZATION_CONFIG.maxAdjustment);
      adjustment = Math.max(adjustment, -AUTO_OPTIMIZATION_CONFIG.maxAdjustment);
    }
    
    // 应用衰减
    adjustment *= AUTO_OPTIMIZATION_CONFIG.decayRate;
    
    if (Math.abs(adjustment) > 0.01) { // 最小调整阈值
      adjustments[actionType] = {
        oldWeight: currentWeight,
        newWeight: currentWeight + adjustment,
        adjustment,
        conversionRate,
        engagementScore,
        revenue
      };
    }
  });
  
  return adjustments;
};

// 应用权重调整
const applyWeightAdjustments = (adjustments) => {
  Object.entries(adjustments).forEach(([actionType, adjustment]) => {
    dynamicWeights[actionType] = Math.max(0.1, Math.min(10, adjustment.newWeight));
  });
};

// 获取权重调整历史
exports.getWeightAdjustmentHistory = async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    const history = weightAdjustmentHistory
      .slice(-Math.min(limit, weightAdjustmentHistory.length))
      .reverse();
    
    res.json({
      success: true,
      data: history,
      currentWeights: dynamicWeights
    });
    
  } catch (error) {
    console.error('获取权重调整历史失败:', error);
    res.status(500).json({
      success: false,
      message: '获取权重调整历史失败',
      error: error.message
    });
  }
};

// 手动触发权重优化
exports.triggerWeightOptimization = async (req, res) => {
  try {
    await exports.autoOptimizeWeights();
    
    res.json({
      success: true,
      message: '权重优化已触发',
      currentWeights: dynamicWeights
    });
    
  } catch (error) {
    console.error('触发权重优化失败:', error);
    res.status(500).json({
      success: false,
      message: '触发权重优化失败',
      error: error.message
    });
  }
};

// 启动定时优化任务
const startAutoOptimization = () => {
  if (AUTO_OPTIMIZATION_CONFIG.enabled) {
    setInterval(() => {
      exports.autoOptimizeWeights();
    }, AUTO_OPTIMIZATION_CONFIG.optimizationInterval);
    
    console.log('⏰ 自动权重优化已启动，间隔:', 
      AUTO_OPTIMIZATION_CONFIG.optimizationInterval / (60 * 60 * 1000), '小时');
  }
};

// 立即启动优化任务
startAutoOptimization();

// 批量记录用户行为
exports.trackBatchUserActivities = async (req, res) => {
  try {
    const { activities } = req.body;
    
    if (!Array.isArray(activities) || activities.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'activities必须是包含至少一个行为的数组'
      });
    }
    
    const validatedActivities = [];
    
    for (const activity of activities) {
      const {
        actionType,
        targetId,
        targetModel,
        actionData,
        sessionId,
        weight,
        decayFactor
      } = activity;
      
      if (!actionType || !sessionId) {
        continue; // 跳过无效记录
      }
      
      if (!DEFAULT_WEIGHTS.hasOwnProperty(actionType)) {
        continue; // 跳过无效行为类型
      }
      
      const userId = req.user?.id;
      const finalWeight = weight !== undefined ? weight : dynamicWeights[actionType];
      const finalDecayFactor = decayFactor !== undefined ? decayFactor : 0.95;
      
      validatedActivities.push({
        userId,
        sessionId,
        actionType,
        targetId,
        targetModel,
        actionData: actionData || {},
        weight: finalWeight,
        decayFactor: finalDecayFactor,
        timestamp: new Date()
      });
    }
    
    if (validatedActivities.length === 0) {
      return res.status(400).json({
        success: false,
        message: '没有有效的用户行为记录'
      });
    }
    
    const result = await UserActivity.insertMany(validatedActivities);
    
    res.status(201).json({
      success: true,
      message: `成功记录${result.length}条用户行为`,
      data: result
    });
    
  } catch (error) {
    console.error('批量记录用户行为失败:', error);
    res.status(500).json({
      success: false,
      message: '批量记录用户行为失败',
      error: error.message
    });
  }
};

// 获取用户行为统计
exports.getUserActivityStats = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { timeRange = '7d', groupBy = 'actionType' } = req.query;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: '用户ID是必填字段'
      });
    }
    
    let stats;
    
    if (groupBy === 'actionType') {
      stats = await UserActivity.getUserActivityStats(userId, timeRange);
    } else if (groupBy === 'category') {
      stats = await UserActivity.getUserInterests(userId, 20);
    } else {
      return res.status(400).json({
        success: false,
        message: '无效的分组方式'
      });
    }
    
    res.json({
      success: true,
      data: stats
    });
    
  } catch (error) {
    console.error('获取用户行为统计失败:', error);
    res.status(500).json({
      success: false,
      message: '获取用户行为统计失败',
      error: error.message
    });
  }
};

// 获取实时用户行为流
exports.getRealTimeActivities = async (req, res) => {
  try {
    const { limit = 50, actionTypes } = req.query;
    
    const query = { isValid: true };
    
    if (actionTypes) {
      const types = actionTypes.split(',');
      query.actionType = { $in: types };
    }
    
    const activities = await UserActivity
      .find(query)
      .populate('userId', 'username firstName lastName')
      .populate('targetId', 'name title')
      .sort({ timestamp: -1 })
      .limit(parseInt(limit));
    
    res.json({
      success: true,
      data: activities
    });
    
  } catch (error) {
    console.error('获取实时用户行为失败:', error);
    res.status(500).json({
      success: false,
      message: '获取实时用户行为失败',
      error: error.message
    });
  }
};

// 动态调整行为权重
exports.adjustWeights = async (req, res) => {
  try {
    const { weights, decayFactors } = req.body;
    
    if (weights) {
      Object.keys(weights).forEach(actionType => {
        if (DEFAULT_WEIGHTS.hasOwnProperty(actionType)) {
          dynamicWeights[actionType] = weights[actionType];
        }
      });
    }
    
    // 更新所有相关行为的衰减因子
    if (decayFactors) {
      await UserActivity.updateMany(
        { actionType: { $in: Object.keys(decayFactors) } },
        { $set: { decayFactor: decayFactors[actionType] } }
      );
    }
    
    res.json({
      success: true,
      message: '权重调整成功',
      data: {
        currentWeights: dynamicWeights,
        defaultWeights: DEFAULT_WEIGHTS
      }
    });
    
  } catch (error) {
    console.error('调整权重失败:', error);
    res.status(500).json({
      success: false,
      message: '调整权重失败',
      error: error.message
    });
  }
};

// 重置权重到默认值
exports.resetWeights = async (req, res) => {
  try {
    dynamicWeights = { ...DEFAULT_WEIGHTS };
    
    res.json({
      success: true,
      message: '权重已重置为默认值',
      data: dynamicWeights
    });
    
  } catch (error) {
    console.error('重置权重失败:', error);
    res.status(500).json({
      success: false,
      message: '重置权重失败',
      error: error.message
    });
  }
};

// 获取当前权重配置
exports.getCurrentWeights = async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        currentWeights: dynamicWeights,
        defaultWeights: DEFAULT_WEIGHTS
      }
    });
    
  } catch (error) {
    console.error('获取权重配置失败:', error);
    res.status(500).json({
      success: false,
      message: '获取权重配置失败',
      error: error.message
    });
  }
};

// 分析用户行为模式
exports.analyzeUserPatterns = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { days = 30 } = req.query;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: '用户ID是必填字段'
      });
    }
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));
    
    // 分析行为时间分布
    const timeDistribution = await UserActivity.aggregate([
      {
        $match: {
          userId: mongoose.Types.ObjectId(userId),
          timestamp: { $gte: startDate },
          isValid: true
        }
      },
      {
        $group: {
          _id: {
            hour: { $hour: '$timestamp' }
          },
          count: { $sum: 1 },
          totalWeight: { $sum: '$weight' }
        }
      },
      {
        $sort: { '_id.hour': 1 }
      }
    ]);
    
    // 分析热门商品
    const popularProducts = await UserActivity.aggregate([
      {
        $match: {
          userId: mongoose.Types.ObjectId(userId),
          timestamp: { $gte: startDate },
          isValid: true,
          actionType: { $in: ['product_view', 'add_to_cart', 'add_to_wishlist'] }
        }
      },
      {
        $group: {
          _id: '$actionData.productId',
          views: {
            $sum: { $cond: [{ $eq: ['$actionType', 'product_view'] }, 1, 0] }
          },
          carts: {
            $sum: { $cond: [{ $eq: ['$actionType', 'add_to_cart'] }, 1, 0] }
          },
          wishlists: {
            $sum: { $cond: [{ $eq: ['$actionType', 'add_to_wishlist'] }, 1, 0] }
          },
          totalScore: {
            $sum: {
              $switch: {
                branches: [
                  { case: { $eq: ['$actionType', 'product_view'] }, then: 1 },
                  { case: { $eq: ['$actionType', 'add_to_cart'] }, then: 2 },
                  { case: { $eq: ['$actionType', 'add_to_wishlist'] }, then: 3 }
                ],
                default: 0
              }
            }
          }
        }
      },
      {
        $sort: { totalScore: -1 }
      },
      {
        $limit: 10
      }
    ]);
    
    // 填充商品信息
    const productIds = popularProducts.map(p => p._id).filter(id => id);
    const products = await Product.find({ _id: { $in: productIds } }, 'name price images category');
    
    const productsWithInfo = popularProducts.map(p => {
      const productInfo = products.find(prod => prod._id.toString() === p._id?.toString());
      return {
        ...p,
        product: productInfo || null
      };
    });
    
    res.json({
      success: true,
      data: {
        timeDistribution,
        popularProducts: productsWithInfo
      }
    });
    
  } catch (error) {
    console.error('分析用户行为模式失败:', error);
    res.status(500).json({
      success: false,
      message: '分析用户行为模式失败',
      error: error.message
    });
  }
};

// 清理过期数据
exports.cleanupOldData = async (req, res) => {
  try {
    const { days = 90 } = req.query;
    
    const result = await UserActivity.cleanupOldData(parseInt(days));
    
    res.json({
      success: true,
      message: `成功清理${result.deletedCount}条过期数据`,
      data: result
    });
    
  } catch (error) {
    console.error('清理过期数据失败:', error);
    res.status(500).json({
      success: false,
      message: '清理过期数据失败',
      error: error.message
    });
  }
};
