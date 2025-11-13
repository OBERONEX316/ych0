import api from './api';

// 获取库存预警列表
export const getAlerts = async (params = '') => {
  const response = await api.get(`/stock-alerts/alerts?${params}`);
  return response.data;
};

// 获取库存统计信息
export const getStatistics = async () => {
  const response = await api.get('/stock-alerts/statistics');
  return response.data;
};

// 批量更新库存预警设置
export const updateSettings = async (data) => {
  const response = await api.patch('/stock-alerts/settings', data);
  return response.data;
};

// 获取单个商品的库存预警信息
export const getProductAlert = async (productId) => {
  const response = await api.get(`/stock-alerts/product/${productId}`);
  return response.data;
};

// 导出库存预警报告
export const exportReport = async (alertType = 'all') => {
  const response = await api.get(`/stock-alerts/export?alertType=${alertType}`, {
    responseType: 'blob'
  });
  return response;
};

const stockAlertAPI = {
  getAlerts,
  getStatistics,
  updateSettings,
  getProductAlert,
  exportReport
};

export default stockAlertAPI;