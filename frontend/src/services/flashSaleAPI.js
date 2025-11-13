import { api } from './api';

const flashSaleAPI = {
  // 获取活跃的秒杀活动
  getActiveSales: async () => {
    try {
      const response = await api.get('/flash-sales/active');
      return response.data;
    } catch (error) {
      console.error('获取活跃秒杀活动失败:', error);
      throw error;
    }
  },

  // 获取即将开始的秒杀活动
  getUpcomingSales: async () => {
    try {
      const response = await api.get('/flash-sales/upcoming');
      return response.data;
    } catch (error) {
      console.error('获取即将开始的秒杀活动失败:', error);
      throw error;
    }
  },

  // 获取秒杀活动详情
  getSaleDetails: async (saleId) => {
    try {
      const response = await api.get(`/flash-sales/${saleId}`);
      return response.data;
    } catch (error) {
      console.error('获取秒杀活动详情失败:', error);
      throw error;
    }
  },

  // 参与秒杀活动
  participate: async (participationData) => {
    try {
      const response = await api.post('/flash-sales/participate', participationData);
      return response.data;
    } catch (error) {
      console.error('参与秒杀活动失败:', error);
      throw error;
    }
  },

  // 创建秒杀活动（管理员）
  createSale: async (saleData) => {
    try {
      const response = await api.post('/flash-sales', saleData);
      return response.data;
    } catch (error) {
      console.error('创建秒杀活动失败:', error);
      throw error;
    }
  },

  // 更新秒杀活动（管理员）
  updateSale: async (saleId, saleData) => {
    try {
      const response = await api.put(`/flash-sales/${saleId}`, saleData);
      return response.data;
    } catch (error) {
      console.error('更新秒杀活动失败:', error);
      throw error;
    }
  },

  // 删除秒杀活动（管理员）
  deleteSale: async (saleId) => {
    try {
      const response = await api.delete(`/flash-sales/${saleId}`);
      return response.data;
    } catch (error) {
      console.error('删除秒杀活动失败:', error);
      throw error;
    }
  },

  // 获取秒杀活动统计（管理员）
  getStatistics: async (saleId) => {
    try {
      const response = await api.get(`/flash-sales/${saleId}/statistics`);
      return response.data;
    } catch (error) {
      console.error('获取秒杀活动统计失败:', error);
      throw error;
    }
  },

  // 设置预热通知
  setReminder: async (saleId, reminderData) => {
    try {
      const response = await api.post(`/flash-sales/${saleId}/reminder`, reminderData);
      return response.data;
    } catch (error) {
      console.error('设置预热通知失败:', error);
      throw error;
    }
  },

  // 获取所有秒杀活动（管理员）
  getAllSales: async (params = {}) => {
    try {
      const response = await api.get('/flash-sales', { params });
      return response.data;
    } catch (error) {
      console.error('获取秒杀活动列表失败:', error);
      throw error;
    }
  }
};

export { flashSaleAPI };