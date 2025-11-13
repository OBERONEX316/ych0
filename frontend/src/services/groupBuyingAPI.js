import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const groupBuyingAPI = {
  // Get all group buying activities
  getAllGroupBuying: async (filters = {}) => {
    try {
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.search) params.append('search', filters.search);
      if (filters.page) params.append('page', filters.page);
      if (filters.limit) params.append('limit', filters.limit);
      if (filters.sortBy) params.append('sortBy', filters.sortBy);
      if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);

      const response = await axios.get(`${API_BASE_URL}/group-buying?${params}`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch group buying:', error);
      throw error.response?.data || { message: '获取团购活动失败' };
    }
  },

  // Get active group buying activities
  getActiveGroupBuying: async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/group-buying/active`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch active group buying:', error);
      throw error.response?.data || { message: '获取活跃团购活动失败' };
    }
  },

  // Get group buying activity by ID
  getGroupBuyingById: async (id) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/group-buying/${id}`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch group buying by ID:', error);
      throw error.response?.data || { message: '获取团购活动详情失败' };
    }
  },

  // Create new group buying activity (admin only)
  createGroupBuying: async (groupBuyingData) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API_BASE_URL}/group-buying`, groupBuyingData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      return response.data;
    } catch (error) {
      console.error('Failed to create group buying:', error);
      throw error.response?.data || { message: '创建团购活动失败' };
    }
  },

  // Update group buying activity (admin only)
  updateGroupBuying: async (id, groupBuyingData) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(`${API_BASE_URL}/group-buying/${id}`, groupBuyingData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      return response.data;
    } catch (error) {
      console.error('Failed to update group buying:', error);
      throw error.response?.data || { message: '更新团购活动失败' };
    }
  },

  // Delete group buying activity (admin only)
  deleteGroupBuying: async (id) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.delete(`${API_BASE_URL}/group-buying/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      return response.data;
    } catch (error) {
      console.error('Failed to delete group buying:', error);
      throw error.response?.data || { message: '删除团购活动失败' };
    }
  },

  // Cancel group buying activity (admin only)
  cancelGroupBuying: async (id, reason) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.patch(`${API_BASE_URL}/group-buying/${id}/cancel`, { reason }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      return response.data;
    } catch (error) {
      console.error('Failed to cancel group buying:', error);
      throw error.response?.data || { message: '取消团购活动失败' };
    }
  },

  // End group buying activity (admin only)
  endGroupBuying: async (id) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.patch(`${API_BASE_URL}/group-buying/${id}/end`, {}, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      return response.data;
    } catch (error) {
      console.error('Failed to end group buying:', error);
      throw error.response?.data || { message: '结束团购活动失败' };
    }
  },

  // Participate in group buying
  participate: async (groupBuyingId, quantity = 1) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API_BASE_URL}/group-buying/participate`, {
        groupBuyingId,
        quantity
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      return response.data;
    } catch (error) {
      console.error('Failed to participate in group buying:', error);
      throw error.response?.data || { message: '参与团购失败' };
    }
  },

  // Get my participations
  getMyParticipations: async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/group-buying/my/participations`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch my participations:', error);
      throw error.response?.data || { message: '获取我的参与记录失败' };
    }
  },

  // Get my groups
  getMyGroups: async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/group-buying/my/groups`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch my groups:', error);
      throw error.response?.data || { message: '获取我的团购小组失败' };
    }
  },

  // Get statistics (admin only)
  getStatistics: async (params = {}) => {
    try {
      const token = localStorage.getItem('token');
      const queryParams = new URLSearchParams();
      if (params.timeRange) queryParams.append('timeRange', params.timeRange);
      if (params.startDate) queryParams.append('startDate', params.startDate);
      if (params.endDate) queryParams.append('endDate', params.endDate);

      const response = await axios.get(`${API_BASE_URL}/group-buying/statistics/summary?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch statistics:', error);
      throw error.response?.data || { message: '获取统计数据失败' };
    }
  },

  // Get participation trends (admin only)
  getParticipationTrends: async (params = {}) => {
    try {
      const token = localStorage.getItem('token');
      const queryParams = new URLSearchParams();
      if (params.timeRange) queryParams.append('timeRange', params.timeRange);
      if (params.startDate) queryParams.append('startDate', params.startDate);
      if (params.endDate) queryParams.append('endDate', params.endDate);

      const response = await axios.get(`${API_BASE_URL}/group-buying/statistics/participation-trends?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch participation trends:', error);
      throw error.response?.data || { message: '获取参与趋势数据失败' };
    }
  },

  // Get revenue statistics (admin only)
  getRevenueStatistics: async (params = {}) => {
    try {
      const token = localStorage.getItem('token');
      const queryParams = new URLSearchParams();
      if (params.timeRange) queryParams.append('timeRange', params.timeRange);
      if (params.startDate) queryParams.append('startDate', params.startDate);
      if (params.endDate) queryParams.append('endDate', params.endDate);

      const response = await axios.get(`${API_BASE_URL}/group-buying/statistics/revenue?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch revenue statistics:', error);
      throw error.response?.data || { message: '获取收入统计数据失败' };
    }
  }
};

export default groupBuyingAPI;