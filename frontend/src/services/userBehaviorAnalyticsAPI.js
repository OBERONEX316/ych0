import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const userBehaviorAnalyticsAPI = {
  // 获取用户行为概览
  getOverview: async (params = {}) => {
    try {
      const token = localStorage.getItem('token');
      const queryParams = new URLSearchParams();
      if (params.timeRange) queryParams.append('timeRange', params.timeRange);
      if (params.userId) queryParams.append('userId', params.userId);

      const response = await axios.get(`${API_BASE_URL}/user-behavior-analytics/overview?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch behavior overview:', error);
      throw error.response?.data || { message: '获取用户行为概览失败' };
    }
  },

  // 获取用户行为趋势
  getBehaviorTrends: async (params = {}) => {
    try {
      const token = localStorage.getItem('token');
      const queryParams = new URLSearchParams();
      if (params.timeRange) queryParams.append('timeRange', params.timeRange);
      if (params.groupBy) queryParams.append('groupBy', params.groupBy);
      if (params.userId) queryParams.append('userId', params.userId);

      const response = await axios.get(`${API_BASE_URL}/user-behavior-analytics/trends?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch behavior trends:', error);
      throw error.response?.data || { message: '获取用户行为趋势失败' };
    }
  },

  // 获取热门行为
  getPopularBehaviors: async (params = {}) => {
    try {
      const token = localStorage.getItem('token');
      const queryParams = new URLSearchParams();
      if (params.timeRange) queryParams.append('timeRange', params.timeRange);
      if (params.limit) queryParams.append('limit', params.limit);

      const response = await axios.get(`${API_BASE_URL}/user-behavior-analytics/popular?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch popular behaviors:', error);
      throw error.response?.data || { message: '获取热门行为失败' };
    }
  },

  // 获取用户行为分布
  getBehaviorDistribution: async (params = {}) => {
    try {
      const token = localStorage.getItem('token');
      const queryParams = new URLSearchParams();
      if (params.timeRange) queryParams.append('timeRange', params.timeRange);

      const response = await axios.get(`${API_BASE_URL}/user-behavior-analytics/distribution?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch behavior distribution:', error);
      throw error.response?.data || { message: '获取用户行为分布失败' };
    }
  },

  // 获取用户旅程
  getUserJourney: async (params = {}) => {
    try {
      const token = localStorage.getItem('token');
      const queryParams = new URLSearchParams();
      if (params.userId) queryParams.append('userId', params.userId);
      if (params.sessionId) queryParams.append('sessionId', params.sessionId);

      const response = await axios.get(`${API_BASE_URL}/user-behavior-analytics/journey?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch user journey:', error);
      throw error.response?.data || { message: '获取用户旅程失败' };
    }
  },

  // 获取转化漏斗
  getConversionFunnel: async (params = {}) => {
    try {
      const token = localStorage.getItem('token');
      const queryParams = new URLSearchParams();
      if (params.timeRange) queryParams.append('timeRange', params.timeRange);

      const response = await axios.get(`${API_BASE_URL}/user-behavior-analytics/conversion-funnel?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch conversion funnel:', error);
      throw error.response?.data || { message: '获取转化漏斗失败' };
    }
  },

  // 获取热力图数据
  getHeatmapData: async (params = {}) => {
    try {
      const token = localStorage.getItem('token');
      const queryParams = new URLSearchParams();
      if (params.timeRange) queryParams.append('timeRange', params.timeRange);
      if (params.pageUrl) queryParams.append('pageUrl', params.pageUrl);

      const response = await axios.get(`${API_BASE_URL}/user-behavior-analytics/heatmap?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch heatmap data:', error);
      throw error.response?.data || { message: '获取热力图数据失败' };
    }
  },

  // 获取用户细分
  getUserSegmentation: async (params = {}) => {
    try {
      const token = localStorage.getItem('token');
      const queryParams = new URLSearchParams();
      if (params.timeRange) queryParams.append('timeRange', params.timeRange);

      const response = await axios.get(`${API_BASE_URL}/user-behavior-analytics/segmentation?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch user segmentation:', error);
      throw error.response?.data || { message: '获取用户细分失败' };
    }
  },

  // 导出用户行为数据
  exportData: async (params = {}) => {
    try {
      const token = localStorage.getItem('token');
      const queryParams = new URLSearchParams();
      if (params.timeRange) queryParams.append('timeRange', params.timeRange);
      if (params.userId) queryParams.append('userId', params.userId);
      if (params.format) queryParams.append('format', params.format);

      const response = await axios.get(`${API_BASE_URL}/user-behavior-analytics/export?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        responseType: params.format === 'csv' ? 'blob' : 'json'
      });
      return response;
    } catch (error) {
      console.error('Failed to export behavior data:', error);
      throw error.response?.data || { message: '导出用户行为数据失败' };
    }
  },

  // 前端行为追踪工具
  trackFrontendBehavior: async (behaviorData) => {
    try {
      const token = localStorage.getItem('token');
      
      // 创建行为记录请求
      const behaviorRecord = {
        action: behaviorData.action,
        targetType: behaviorData.targetType,
        targetId: behaviorData.targetId,
        targetData: behaviorData.targetData,
        timestamp: new Date().toISOString(),
        sessionId: localStorage.getItem('behavior_session_id') || this.generateSessionId(),
        metadata: {
          source: 'web',
          version: '1.0.0',
          ...behaviorData.metadata
        }
      };

      // 发送到后端（如果用户已登录）
      if (token) {
        await axios.post(`${API_BASE_URL}/user-behaviors`, behaviorRecord, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
      }

      // 同时存储在本地（用于离线分析）
      this.storeLocalBehavior(behaviorRecord);
      
      return behaviorRecord;
    } catch (error) {
      console.error('前端行为追踪失败:', error);
      // 即使后端失败，也要存储在本地
      this.storeLocalBehavior(behaviorData);
    }
  },

  // 生成本地会话ID
  generateSessionId: () => {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  },

  // 存储本地行为数据
  storeLocalBehavior: (behaviorData) => {
    try {
      const behaviors = JSON.parse(localStorage.getItem('local_behaviors') || '[]');
      behaviors.push(behaviorData);
      
      // 限制本地存储数量
      if (behaviors.length > 1000) {
        behaviors.splice(0, behaviors.length - 1000);
      }
      
      localStorage.setItem('local_behaviors', JSON.stringify(behaviors));
    } catch (error) {
      console.error('存储本地行为数据失败:', error);
    }
  },

  // 获取本地行为数据
  getLocalBehaviors: () => {
    try {
      return JSON.parse(localStorage.getItem('local_behaviors') || '[]');
    } catch (error) {
      console.error('获取本地行为数据失败:', error);
      return [];
    }
  },

  // 清除本地行为数据
  clearLocalBehaviors: () => {
    try {
      localStorage.removeItem('local_behaviors');
    } catch (error) {
      console.error('清除本地行为数据失败:', error);
    }
  },

  // 同步本地行为数据到服务器
  syncLocalBehaviors: async () => {
    try {
      const localBehaviors = this.getLocalBehaviors();
      if (localBehaviors.length === 0) return;

      const token = localStorage.getItem('token');
      if (!token) return;

      await axios.post(`${API_BASE_URL}/user-behaviors/batch`, {
        behaviors: localBehaviors
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      // 同步成功后清除本地数据
      this.clearLocalBehaviors();
      console.log(`同步了 ${localBehaviors.length} 条本地行为数据`);
    } catch (error) {
      console.error('同步本地行为数据失败:', error);
    }
  }
};

export default userBehaviorAnalyticsAPI;