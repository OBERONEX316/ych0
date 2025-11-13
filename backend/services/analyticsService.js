const ChatSession = require('../models/ChatSession');
const ChatMessage = require('../models/ChatMessage');
const User = require('../models/User');

class AnalyticsService {
  constructor() {
    console.log('📊 分析服务已初始化');
  }

  // 获取会话统计
  async getSessionStats(startDate, endDate) {
    try {
      const matchStage = {
        createdAt: {
          $gte: startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 默认30天
          $lte: endDate ? new Date(endDate) : new Date()
        }
      };

      const stats = await ChatSession.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: null,
            totalSessions: { $sum: 1 },
            activeSessions: {
              $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
            },
            closedSessions: {
              $sum: { $cond: [{ $eq: ['$status', 'closed'] }, 1, 0] }
            },
            avgSessionDuration: { $avg: '$duration' },
            avgResponseTime: { $avg: '$avgResponseTime' },
            avgMessagesPerSession: { $avg: '$messageCount' }
          }
        }
      ]);

      return stats[0] || {
        totalSessions: 0,
        activeSessions: 0,
        closedSessions: 0,
        avgSessionDuration: 0,
        avgResponseTime: 0,
        avgMessagesPerSession: 0
      };
    } catch (error) {
      console.error('获取会话统计错误:', error);
      throw error;
    }
  }

  // 获取客服绩效统计
  async getAgentPerformanceStats(startDate, endDate) {
    try {
      const matchStage = {
        'assignedTo.userId': { $exists: true },
        createdAt: {
          $gte: startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          $lte: endDate ? new Date(endDate) : new Date()
        }
      };

      const agentStats = await ChatSession.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: '$assignedTo.userId',
            agentName: { $first: '$assignedTo.username' },
            totalSessions: { $sum: 1 },
            closedSessions: {
              $sum: { $cond: [{ $eq: ['$status', 'closed'] }, 1, 0] }
            },
            avgSessionDuration: { $avg: '$duration' },
            avgResponseTime: { $avg: '$avgResponseTime' },
            avgMessagesPerSession: { $avg: '$messageCount' },
            satisfactionScore: { $avg: '$rating.overallScore' }
          }
        },
        { $sort: { satisfactionScore: -1 } }
      ]);

      return agentStats;
    } catch (error) {
      console.error('获取客服绩效统计错误:', error);
      throw error;
    }
  }

  // 获取标签统计
  async getTagStatistics(startDate, endDate) {
    try {
      const matchStage = {
        createdAt: {
          $gte: startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          $lte: endDate ? new Date(endDate) : new Date()
        }
      };

      const tagStats = await ChatSession.aggregate([
        { $match: matchStage },
        { $unwind: '$tags' },
        {
          $group: {
            _id: '$tags',
            count: { $sum: 1 },
            avgDuration: { $avg: '$duration' },
            avgResponseTime: { $avg: '$avgResponseTime' },
            satisfactionScore: { $avg: '$rating.overallScore' }
          }
        },
        { $sort: { count: -1 } }
      ]);

      return tagStats;
    } catch (error) {
      console.error('获取标签统计错误:', error);
      throw error;
    }
  }

  // 获取时间趋势数据
  async getTimeSeriesData(timeUnit = 'day', startDate, endDate) {
    try {
      const matchStage = {
        createdAt: {
          $gte: startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          $lte: endDate ? new Date(endDate) : new Date()
        }
      };

      let dateFormat;
      switch (timeUnit) {
        case 'hour':
          dateFormat = { hour: { $hour: '$createdAt' }, day: { $dayOfMonth: '$createdAt' }, month: { $month: '$createdAt' }, year: { $year: '$createdAt' } };
          break;
        case 'week':
          dateFormat = { week: { $week: '$createdAt' }, year: { $year: '$createdAt' } };
          break;
        case 'month':
          dateFormat = { month: { $month: '$createdAt' }, year: { $year: '$createdAt' } };
          break;
        default: // day
          dateFormat = { day: { $dayOfMonth: '$createdAt' }, month: { $month: '$createdAt' }, year: { $year: '$createdAt' } };
      }

      const timeSeries = await ChatSession.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: dateFormat,
            totalSessions: { $sum: 1 },
            activeSessions: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
            closedSessions: { $sum: { $cond: [{ $eq: ['$status', 'closed'] }, 1, 0] } },
            avgDuration: { $avg: '$duration' },
            avgResponseTime: { $avg: '$avgResponseTime' }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.hour': 1 } }
      ]);

      return timeSeries;
    } catch (error) {
      console.error('获取时间序列数据错误:', error);
      throw error;
    }
  }

  // 获取热门问题
  async getTopQuestions(limit = 10, startDate, endDate) {
    try {
      const matchStage = {
        'sender.role': 'user',
        createdAt: {
          $gte: startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          $lte: endDate ? new Date(endDate) : new Date()
        }
      };

      const topQuestions = await ChatMessage.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: {
              $substr: ['$content', 0, 100] // 取前100个字符作为问题标识
            },
            content: { $first: '$content' },
            count: { $sum: 1 },
            sessionIds: { $addToSet: '$sessionId' }
          }
        },
        { $sort: { count: -1 } },
        { $limit: limit }
      ]);

      return topQuestions;
    } catch (error) {
      console.error('获取热门问题错误:', error);
      throw error;
    }
  }

  // 获取AI回复统计
  async getAIResponseStats(startDate, endDate) {
    try {
      const matchStage = {
        'sender.username': '系统助手',
        createdAt: {
          $gte: startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          $lte: endDate ? new Date(endDate) : new Date()
        }
      };

      const aiStats = await ChatMessage.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: null,
            totalAIResponses: { $sum: 1 },
            uniqueSessions: { $addToSet: '$sessionId' }
          }
        }
      ]);

      const result = aiStats[0] || {
        totalAIResponses: 0,
        uniqueSessions: []
      };

      return {
        totalAIResponses: result.totalAIResponses,
        sessionsWithAI: result.uniqueSessions.length
      };
    } catch (error) {
      console.error('获取AI回复统计错误:', error);
      throw error;
    }
  }

  // 获取智能路由效果统计
  async getRoutingEffectiveness(startDate, endDate) {
    try {
      const matchStage = {
        'assignedTo.userId': { $exists: true },
        createdAt: {
          $gte: startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          $lte: endDate ? new Date(endDate) : new Date()
        }
      };

      const routingStats = await ChatSession.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: {
              priority: '$priority',
              hasTags: { $gt: [{ $size: '$tags' }, 0] }
            },
            count: { $sum: 1 },
            avgAssignmentTime: { $avg: '$assignmentTime' },
            avgResponseTime: { $avg: '$avgResponseTime' },
            satisfactionScore: { $avg: '$rating.overallScore' }
          }
        }
      ]);

      return routingStats;
    } catch (error) {
      console.error('获取路由效果统计错误:', error);
      throw error;
    }
  }
}

module.exports = new AnalyticsService();