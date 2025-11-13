const UserBehavior = require('../models/UserBehavior');
const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');

/**
 * 用户行为分析控制器
 * 提供用户行为数据的统计分析和洞察
 */
class UserBehaviorAnalyticsController {
  /**
   * 获取用户行为概览
   */
  async getOverview(req, res) {
    try {
      const { timeRange = '30d', userId } = req.query;
      const dateLimit = new Date();
      const days = parseInt(timeRange.replace('d', ''));
      dateLimit.setDate(dateLimit.getDate() - days);

      const matchStage = {
        timestamp: { $gte: dateLimit }
      };

      if (userId) {
        matchStage.userId = UserBehavior.schema.Types.ObjectId(userId);
      }

      const overview = await UserBehavior.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: null,
            totalBehaviors: { $sum: 1 },
            uniqueUsers: { $addToSet: '$userId' },
            uniqueSessions: { $addToSet: '$sessionId' },
            totalScore: { $sum: '$behaviorScore' },
            conversionCount: {
              $sum: { $cond: [{ $in: ['$action', ['checkout_complete', 'order_view', 'review_submit']] }, 1, 0] }
            },
            avgSessionDuration: { $avg: '$targetData.duration' }
          }
        },
        {
          $project: {
            _id: 0,
            totalBehaviors: 1,
            uniqueUsersCount: { $size: '$uniqueUsers' },
            uniqueSessionsCount: { $size: '$uniqueSessions' },
            totalScore: 1,
            conversionCount: 1,
            avgSessionDuration: { $round: ['$avgSessionDuration', 2] },
            conversionRate: {
              $cond: [
                { $gt: ['$totalBehaviors', 0] },
                { $multiply: [{ $divide: ['$conversionCount', '$totalBehaviors'] }, 100] },
                0
              ]
            }
          }
        }
      ]);

      res.json({
        success: true,
        data: overview[0] || {
          totalBehaviors: 0,
          uniqueUsersCount: 0,
          uniqueSessionsCount: 0,
          totalScore: 0,
          conversionCount: 0,
          avgSessionDuration: 0,
          conversionRate: 0
        }
      });
    } catch (error) {
      console.error('获取用户行为概览失败:', error);
      res.status(500).json({
        success: false,
        message: '获取用户行为概览失败',
        error: error.message
      });
    }
  }

  /**
   * 获取用户行为趋势
   */
  async getBehaviorTrends(req, res) {
    try {
      const { timeRange = '30d', groupBy = 'day', userId } = req.query;
      const trends = await UserBehavior.getBehaviorTrends(timeRange, groupBy);

      res.json({
        success: true,
        data: trends
      });
    } catch (error) {
      console.error('获取用户行为趋势失败:', error);
      res.status(500).json({
        success: false,
        message: '获取用户行为趋势失败',
        error: error.message
      });
    }
  }

  /**
   * 获取热门行为
   */
  async getPopularBehaviors(req, res) {
    try {
      const { timeRange = '30d', limit = 10 } = req.query;
      const behaviors = await UserBehavior.getPopularBehaviors(timeRange, parseInt(limit));

      res.json({
        success: true,
        data: behaviors
      });
    } catch (error) {
      console.error('获取热门行为失败:', error);
      res.status(500).json({
        success: false,
        message: '获取热门行为失败',
        error: error.message
      });
    }
  }

  /**
   * 获取用户行为分布
   */
  async getBehaviorDistribution(req, res) {
    try {
      const { timeRange = '30d' } = req.query;
      const dateLimit = new Date();
      const days = parseInt(timeRange.replace('d', ''));
      dateLimit.setDate(dateLimit.getDate() - days);

      const distribution = await UserBehavior.aggregate([
        { $match: { timestamp: { $gte: dateLimit } } },
        {
          $group: {
            _id: '$behaviorCategory',
            count: { $sum: 1 },
            uniqueUsers: { $addToSet: '$userId' },
            avgScore: { $avg: '$behaviorScore' }
          }
        },
        {
          $project: {
            category: '$_id',
            _id: 0,
            count: 1,
            uniqueUsersCount: { $size: '$uniqueUsers' },
            avgScore: { $round: ['$avgScore', 2] },
            percentage: 0 // 将在前端计算
          }
        },
        { $sort: { count: -1 } }
      ]);

      // 计算百分比
      const total = distribution.reduce((sum, item) => sum + item.count, 0);
      distribution.forEach(item => {
        item.percentage = total > 0 ? Math.round((item.count / total) * 100) : 0;
      });

      res.json({
        success: true,
        data: distribution
      });
    } catch (error) {
      console.error('获取用户行为分布失败:', error);
      res.status(500).json({
        success: false,
        message: '获取用户行为分布失败',
        error: error.message
      });
    }
  }

  /**
   * 获取用户旅程分析
   */
  async getUserJourney(req, res) {
    try {
      const { userId, sessionId } = req.query;
      
      if (!userId) {
        return res.status(400).json({
          success: false,
          message: '用户ID不能为空'
        });
      }

      const journey = await UserBehavior.getUserJourney(userId, sessionId);

      // 分析用户旅程模式
      const analysis = this.analyzeJourney(journey);

      res.json({
        success: true,
        data: {
          journey,
          analysis
        }
      });
    } catch (error) {
      console.error('获取用户旅程分析失败:', error);
      res.status(500).json({
        success: false,
        message: '获取用户旅程分析失败',
        error: error.message
      });
    }
  }

  /**
   * 获取转化漏斗分析
   */
  async getConversionFunnel(req, res) {
    try {
      const { timeRange = '30d' } = req.query;
      const dateLimit = new Date();
      const days = parseInt(timeRange.replace('d', ''));
      dateLimit.setDate(dateLimit.getDate() - days);

      // 定义转化漏斗步骤
      const funnelSteps = [
        { action: 'page_view', name: '页面访问' },
        { action: 'product_view', name: '商品浏览' },
        { action: 'add_to_cart', name: '加入购物车' },
        { action: 'checkout_start', name: '开始结账' },
        { action: 'checkout_complete', name: '完成购买' }
      ];

      const funnel = [];
      let previousCount = null;

      for (const step of funnelSteps) {
        const stepData = await UserBehavior.aggregate([
          {
            $match: {
              action: step.action,
              timestamp: { $gte: dateLimit }
            }
          },
          {
            $group: {
              _id: null,
              count: { $sum: 1 },
              uniqueUsers: { $addToSet: '$userId' }
            }
          },
          {
            $project: {
              _id: 0,
              count: 1,
              uniqueUsersCount: { $size: '$uniqueUsers' }
            }
          }
        ]);

        const count = stepData[0]?.count || 0;
        const uniqueUsers = stepData[0]?.uniqueUsersCount || 0;
        
        let conversionRate = 0;
        let dropOffRate = 0;
        
        if (previousCount !== null) {
          conversionRate = previousCount > 0 ? Math.round((count / previousCount) * 100) : 0;
          dropOffRate = previousCount > 0 ? Math.round(((previousCount - count) / previousCount) * 100) : 0;
        }

        funnel.push({
          step: step.name,
          action: step.action,
          count,
          uniqueUsers,
          conversionRate,
          dropOffRate
        });

        previousCount = count;
      }

      res.json({
        success: true,
        data: funnel
      });
    } catch (error) {
      console.error('获取转化漏斗分析失败:', error);
      res.status(500).json({
        success: false,
        message: '获取转化漏斗分析失败',
        error: error.message
      });
    }
  }

  /**
   * 获取用户行为热力图数据
   */
  async getHeatmapData(req, res) {
    try {
      const { pageUrl, timeRange = '30d' } = req.query;
      const dateLimit = new Date();
      const days = parseInt(timeRange.replace('d', ''));
      dateLimit.setDate(dateLimit.getDate() - days);

      const matchStage = {
        action: 'product_click',
        timestamp: { $gte: dateLimit }
      };

      if (pageUrl) {
        matchStage['targetData.pageUrl'] = new RegExp(pageUrl, 'i');
      }

      const heatmapData = await UserBehavior.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: {
              x: '$targetData.clickPosition.x',
              y: '$targetData.clickPosition.y'
            },
            count: { $sum: 1 },
            avgTimeToClick: { $avg: '$targetData.duration' }
          }
        },
        {
          $project: {
            x: '$_id.x',
            y: '$_id.y',
            _id: 0,
            count: 1,
            avgTimeToClick: { $round: ['$avgTimeToClick', 2] }
          }
        },
        { $sort: { count: -1 } }
      ]);

      res.json({
        success: true,
        data: heatmapData
      });
    } catch (error) {
      console.error('获取热力图数据失败:', error);
      res.status(500).json({
        success: false,
        message: '获取热力图数据失败',
        error: error.message
      });
    }
  }

  /**
   * 获取用户细分分析
   */
  async getUserSegmentation(req, res) {
    try {
      const { timeRange = '30d' } = req.query;
      const dateLimit = new Date();
      const days = parseInt(timeRange.replace('d', ''));
      dateLimit.setDate(dateLimit.getDate() - days);

      // 获取用户行为统计
      const userStats = await UserBehavior.aggregate([
        {
          $match: {
            userId: { $ne: null },
            timestamp: { $gte: dateLimit }
          }
        },
        {
          $group: {
            _id: '$userId',
            totalBehaviors: { $sum: 1 },
            totalScore: { $sum: '$behaviorScore' },
            conversionCount: {
              $sum: { $cond: [{ $in: ['$action', ['checkout_complete', 'order_view', 'review_submit']] }, 1, 0] }
            },
            avgSessionDuration: { $avg: '$targetData.duration' },
            lastActivity: { $max: '$timestamp' },
            firstActivity: { $min: '$timestamp' },
            behaviorCategories: { $addToSet: '$behaviorCategory' }
          }
        },
        {
          $project: {
            userId: '$_id',
            _id: 0,
            totalBehaviors: 1,
            totalScore: 1,
            conversionCount: 1,
            avgSessionDuration: { $round: ['$avgSessionDuration', 2] },
            lastActivity: 1,
            firstActivity: 1,
            behaviorCategories: 1,
            activityDays: {
              $divide: [
                { $subtract: ['$lastActivity', '$firstActivity'] },
                1000 * 60 * 60 * 24
              ]
            }
          }
        }
      ]);

      // 用户细分逻辑
      const segments = {
        '高价值用户': [],
        '活跃用户': [],
        '潜在用户': [],
        '流失用户': [],
        '新用户': []
      };

      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      userStats.forEach(user => {
        const isRecentUser = user.firstActivity >= thirtyDaysAgo;
        const isActive = user.lastActivity >= sevenDaysAgo;
        const hasConversion = user.conversionCount > 0;
        const isHighValue = user.totalScore > 100;
        const isEngaged = user.totalBehaviors > 20;

        if (hasConversion && isHighValue) {
          segments['高价值用户'].push(user);
        } else if (isActive && isEngaged) {
          segments['活跃用户'].push(user);
        } else if (isActive && !hasConversion) {
          segments['潜在用户'].push(user);
        } else if (!isActive && !isRecentUser) {
          segments['流失用户'].push(user);
        } else if (isRecentUser) {
          segments['新用户'].push(user);
        }
      });

      // 计算每个细分群体的统计信息
      const segmentStats = Object.keys(segments).map(segmentName => {
        const users = segments[segmentName];
        return {
          name: segmentName,
          userCount: users.length,
          avgScore: users.length > 0 ? Math.round(users.reduce((sum, u) => sum + u.totalScore, 0) / users.length) : 0,
          avgBehaviors: users.length > 0 ? Math.round(users.reduce((sum, u) => sum + u.totalBehaviors, 0) / users.length) : 0,
          conversionRate: users.length > 0 ? Math.round((users.filter(u => u.conversionCount > 0).length / users.length) * 100) : 0
        };
      });

      res.json({
        success: true,
        data: segmentStats
      });
    } catch (error) {
      console.error('获取用户细分分析失败:', error);
      res.status(500).json({
        success: false,
        message: '获取用户细分分析失败',
        error: error.message
      });
    }
  }

  /**
   * 分析用户旅程
   */
  analyzeJourney(journey) {
    if (!journey || journey.length === 0) {
      return {
        totalSteps: 0,
        uniqueActions: 0,
        avgTimeBetweenActions: 0,
        conversionPath: false,
        topActions: []
      };
    }

    // 计算行为之间的时间间隔
    const timeIntervals = [];
    for (let i = 1; i < journey.length; i++) {
      const interval = (journey[i].timestamp - journey[i-1].timestamp) / 1000; // 转换为秒
      timeIntervals.push(interval);
    }

    const avgTimeBetweenActions = timeIntervals.length > 0 
      ? Math.round(timeIntervals.reduce((sum, interval) => sum + interval, 0) / timeIntervals.length)
      : 0;

    // 统计行为频率
    const actionCounts = {};
    journey.forEach(behavior => {
      actionCounts[behavior.action] = (actionCounts[behavior.action] || 0) + 1;
    });

    const topActions = Object.entries(actionCounts)
      .map(([action, count]) => ({ action, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // 检查是否包含转化路径
    const conversionActions = ['checkout_complete', 'order_view', 'review_submit'];
    const conversionPath = journey.some(behavior => conversionActions.includes(behavior.action));

    return {
      totalSteps: journey.length,
      uniqueActions: Object.keys(actionCounts).length,
      avgTimeBetweenActions,
      conversionPath,
      topActions
    };
  }
}

module.exports = new UserBehaviorAnalyticsController();