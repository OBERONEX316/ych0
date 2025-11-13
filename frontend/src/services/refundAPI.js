import api from './api';

// 创建退款申请
export const createRefund = async (refundData) => {
  try {
    const response = await api.post('/refunds', refundData);
    return response.data;
  } catch (error) {
    console.error('创建退款申请失败:', error);
    throw error.response?.data || error.message;
  }
};

// 获取退款详情
export const getRefundDetail = async (refundId) => {
  try {
    const response = await api.get(`/refunds/${refundId}`);
    return response.data;
  } catch (error) {
    console.error('获取退款详情失败:', error);
    throw error.response?.data || error.message;
  }
};

// 获取用户的退款历史
export const getUserRefunds = async (params = {}) => {
  try {
    const response = await api.get('/refunds/user/history', { params });
    return response.data;
  } catch (error) {
    console.error('获取用户退款历史失败:', error);
    throw error.response?.data || error.message;
  }
};

// 添加沟通记录
export const addCommunication = async (refundId, message) => {
  try {
    const response = await api.post(`/refunds/${refundId}/communication`, { message });
    return response.data;
  } catch (error) {
    console.error('添加沟通记录失败:', error);
    throw error.response?.data || error.message;
  }
};

// 管理员获取所有退款申请
export const getAllRefunds = async (params = {}) => {
  try {
    const response = await api.get('/refunds', { params });
    return response.data;
  } catch (error) {
    console.error('获取所有退款申请失败:', error);
    throw error.response?.data || error.message;
  }
};

// 管理员处理退款申请
export const processRefund = async (refundId, action, rejectionReason = null) => {
  try {
    const data = { action };
    if (rejectionReason) {
      data.rejectionReason = rejectionReason;
    }
    const response = await api.patch(`/refunds/${refundId}/process`, data);
    return response.data;
  } catch (error) {
    console.error('处理退款申请失败:', error);
    throw error.response?.data || error.message;
  }
};

// 管理员完成退款处理
export const completeRefund = async (refundId) => {
  try {
    const response = await api.patch(`/refunds/${refundId}/complete`);
    return response.data;
  } catch (error) {
    console.error('完成退款处理失败:', error);
    throw error.response?.data || error.message;
  }
};

// 获取退款统计
export const getRefundStats = async () => {
  try {
    const response = await api.get('/refunds/stats/summary');
    return response.data;
  } catch (error) {
    console.error('获取退款统计失败:', error);
    throw error.response?.data || error.message;
  }
};

export default {
  createRefund,
  getRefundDetail,
  getUserRefunds,
  addCommunication,
  getAllRefunds,
  processRefund,
  completeRefund,
  getRefundStats
};