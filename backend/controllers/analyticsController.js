const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Review = require('../models/Review');
const ChatSession = require('../models/ChatSession');
const ChatMessage = require('../models/ChatMessage');
const analyticsService = require('../services/analyticsService');

// 获取用户行为分析数据
const getUserAnalytics = async (req, res) => {
  try {
    const { timeRange = '7d' } = req.query;
    
    // 计算时间范围
    const now = new Date();
    let startDate;
    
    switch (timeRange) {
      case '24h':
        startDate = new Date(now - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(now - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now - 7 * 24 * 60 * 60 * 1000);
    }

    // 获取用户统计数据
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    const newUsers = await User.countDocuments({ 
      createdAt: { $gte: startDate } 
    });
    const userGrowthRate = totalUsers > 0 ? 
      ((newUsers / totalUsers) * 100).toFixed(2) : 0;

    // 获取订单统计数据
    const totalOrders = await Order.countDocuments();
    const completedOrders = await Order.countDocuments({ 
      status: 'completed' 
    });
    const pendingOrders = await Order.countDocuments({ 
      status: 'pending' 
    });
    const newOrders = await Order.countDocuments({ 
      createdAt: { $gte: startDate } 
    });
    const orderConversionRate = totalOrders > 0 ? 
      ((completedOrders / totalOrders) * 100).toFixed(2) : 0;

    // 获取商品统计数据
    const totalProducts = await Product.countDocuments({ isActive: true });
    const outOfStockProducts = await Product.countDocuments({ 
      isActive: true, 
      stock: 0 
    });
    const lowStockProducts = await Product.countDocuments({ 
      isActive: true, 
      stock: { $gt: 0, $lte: 10 } 
    });

    // 获取评论统计数据
    const totalReviews = await Review.countDocuments();
    const positiveReviews = await Review.countDocuments({ 
      rating: { $gte: 4 } 
    });
    const reviewRate = totalReviews > 0 ? 
      ((positiveReviews / totalReviews) * 100).toFixed(2) : 0;

    // 获取用户行为趋势数据
    const userActivityTrend = await getActivityTrend(startDate);
    const popularProducts = await getPopularProducts(10);
    const userDemographics = await getUserDemographics();

    res.status(200).json({
      success: true,
      data: {
        timeRange,
        userStats: {
          total: totalUsers,
          active: activeUsers,
          new: newUsers,
          growthRate: userGrowthRate
        },
        orderStats: {
          total: totalOrders,
          completed: completedOrders,
          pending: pendingOrders,
          new: newOrders,
          conversionRate: orderConversionRate
        },
        productStats: {
          total: totalProducts,
          outOfStock: outOfStockProducts,
          lowStock: lowStockProducts
        },
        reviewStats: {
          total: totalReviews,
          positive: positiveReviews,
          positiveRate: reviewRate
        },
        activityTrend: userActivityTrend,
        popularProducts,
        demographics: userDemographics
      }
    });

  } catch (error) {
    console.error('获取用户分析数据失败:', error);
    res.status(500).json({
      success: false,
      error: '获取用户分析数据失败',
      message: error.message
    });
  }
};

// 获取用户活动趋势
const getActivityTrend = async (startDate) => {
  try {
    const trendData = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          orderCount: { $sum: 1 },
          totalRevenue: { $sum: '$totalAmount' }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
      }
    ]);

    return trendData.map(item => ({
      date: `${item._id.year}-${item._id.month.toString().padStart(2, '0')}-${item._id.day.toString().padStart(2, '0')}`,
      orderCount: item.orderCount,
      revenue: item.totalRevenue
    }));
  } catch (error) {
    console.error('获取活动趋势失败:', error);
    return [];
  }
};

// 获取热门商品
const getPopularProducts = async (limit = 10) => {
  try {
    const products = await Product.find({ isActive: true })
      .sort({ sales: -1, rating: -1 })
      .limit(limit)
      .select('name price image sales rating favoriteCount');

    return products;
  } catch (error) {
    console.error('获取热门商品失败:', error);
    return [];
  }
};

// 获取用户人口统计数据
const getUserDemographics = async () => {
  try {
    const roleDistribution = await User.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 }
        }
      }
    ]);

    const statusDistribution = await User.aggregate([
      {
        $group: {
          _id: '$isActive',
          count: { $sum: 1 }
        }
      }
    ]);

    const registrationTrend = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
      }
    ]);

    return {
      roles: roleDistribution.map(item => ({
        role: item._id,
        count: item.count
      })),
      status: statusDistribution.map(item => ({
        isActive: item._id,
        count: item.count
      })),
      registrationTrend: registrationTrend.map(item => ({
        date: `${item._id.year}-${item._id.month.toString().padStart(2, '0')}-${item._id.day.toString().padStart(2, '0')}`,
        count: item.count
      }))
    };
  } catch (error) {
    console.error('获取人口统计数据失败:', error);
    return {
      roles: [],
      status: [],
      registrationTrend: []
    };
  }
};

// 获取实时用户活动数据
const getRealTimeAnalytics = async (req, res) => {
  try {
    const now = new Date();
    const oneHourAgo = new Date(now - 60 * 60 * 1000);
    
    // 获取最近一小时的用户活动
    const recentOrders = await Order.countDocuments({
      createdAt: { $gte: oneHourAgo }
    });
    
    const recentUsers = await User.countDocuments({
      createdAt: { $gte: oneHourAgo }
    });
    
    const recentReviews = await Review.countDocuments({
      createdAt: { $gte: oneHourAgo }
    });

    res.status(200).json({
      success: true,
      data: {
        timestamp: now.toISOString(),
        recentOrders,
        recentUsers,
        recentReviews,
        activeSessions: Math.floor(Math.random() * 100) + 50 // 模拟活跃会话数
      }
    });

  } catch (error) {
    console.error('获取实时分析数据失败:', error);
    res.status(500).json({
      success: false,
      error: '获取实时分析数据失败',
      message: error.message
    });
  }
};

// 获取聊天会话统计
const getChatSessionStats = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: '仅管理员可以查看聊天会话统计'
      });
    }

    const { startDate, endDate } = req.query;
    
    const stats = await analyticsService.getSessionStats(startDate, endDate);

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('获取聊天会话统计错误:', error);
    res.status(500).json({
      success: false,
      error: '获取聊天统计失败'
    });
  }
};

// 获取客服绩效统计
const getAgentPerformanceStats = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: '仅管理员可以查看客服绩效统计'
      });
    }

    const { startDate, endDate } = req.query;
    
    const stats = await analyticsService.getAgentPerformanceStats(startDate, endDate);

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('获取客服绩效统计错误:', error);
    res.status(500).json({
      success: false,
      error: '获取绩效统计失败'
    });
  }
};

// 获取标签统计
const getChatTagStatistics = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: '仅管理员可以查看标签统计'
      });
    }

    const { startDate, endDate } = req.query;
    
    const stats = await analyticsService.getTagStatistics(startDate, endDate);

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('获取标签统计错误:', error);
    res.status(500).json({
      success: false,
      error: '获取标签统计失败'
    });
  }
};

// 获取时间趋势数据
const getChatTimeSeriesData = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: '仅管理员可以查看时间趋势数据'
      });
    }

    const { timeUnit, startDate, endDate } = req.query;
    
    const data = await analyticsService.getTimeSeriesData(timeUnit, startDate, endDate);

    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('获取时间趋势数据错误:', error);
    res.status(500).json({
      success: false,
      error: '获取时间趋势数据失败'
    });
  }
};

// 获取热门问题
const getTopChatQuestions = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: '仅管理员可以查看热门问题'
      });
    }

    const { limit, startDate, endDate } = req.query;
    
    const questions = await analyticsService.getTopQuestions(parseInt(limit) || 10, startDate, endDate);

    res.json({
      success: true,
      questions
    });
  } catch (error) {
    console.error('获取热门问题错误:', error);
    res.status(500).json({
      success: false,
      error: '获取热门问题失败'
    });
  }
};

// 获取AI回复统计
const getAIResponseStats = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: '仅管理员可以查看AI回复统计'
      });
    }

    const { startDate, endDate } = req.query;
    
    const stats = await analyticsService.getAIResponseStats(startDate, endDate);

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('获取AI回复统计错误:', error);
    res.status(500).json({
      success: false,
      error: '获取AI回复统计失败'
    });
  }
};

// 获取智能路由效果统计
const getRoutingEffectiveness = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: '仅管理员可以查看路由效果统计'
      });
    }

    const { startDate, endDate } = req.query;
    
    const stats = await analyticsService.getRoutingEffectiveness(startDate, endDate);

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('获取路由效果统计错误:', error);
    res.status(500).json({
      success: false,
      error: '获取路由效果统计失败'
    });
  }
};

// 获取聊天仪表板数据
const getChatDashboardData = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: '仅管理员可以查看聊天仪表板数据'
      });
    }

    const { startDate, endDate } = req.query;
    
    // 并行获取所有统计数据
    const [
      sessionStats,
      agentStats,
      tagStats,
      aiStats,
      routingStats
    ] = await Promise.all([
      analyticsService.getSessionStats(startDate, endDate),
      analyticsService.getAgentPerformanceStats(startDate, endDate),
      analyticsService.getTagStatistics(startDate, endDate),
      analyticsService.getAIResponseStats(startDate, endDate),
      analyticsService.getRoutingEffectiveness(startDate, endDate)
    ]);

    res.json({
      success: true,
      dashboard: {
        sessionStats,
        agentStats,
        tagStats,
        aiStats,
        routingStats
      }
    });
  } catch (error) {
    console.error('获取聊天仪表板数据错误:', error);
    res.status(500).json({
      success: false,
      error: '获取聊天仪表板数据失败'
    });
  }
};

module.exports = {
  getUserAnalytics,
  getRealTimeAnalytics,
  getChatSessionStats,
  getAgentPerformanceStats,
  getChatTagStatistics,
  getChatTimeSeriesData,
  getTopChatQuestions,
  getAIResponseStats,
  getRoutingEffectiveness,
  getChatDashboardData
};