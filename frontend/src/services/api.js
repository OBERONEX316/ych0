import axios from 'axios';

// 创建axios实例
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器 - 添加认证token
api.interceptors.request.use(
  (config) => {
    console.log(`🚀 发起请求: ${config.method?.toUpperCase()} ${config.url}`);
    
    // 添加认证token
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    
    return config;
  },
  (error) => {
    console.error('❌ 请求错误:', error);
    return Promise.reject(error);
  }
);

// 响应拦截器
api.interceptors.response.use(
  (response) => {
    console.log(`✅ 请求成功: ${response.config.url}`, response.data);
    return response.data;
  },
  (error) => {
    console.error('❌ 响应错误:', error.response?.data || error.message);
    
    if (error.response?.status === 404) {
      console.error('📛 接口不存在');
    } else if (error.response?.status === 500) {
      console.error('🔥 服务器内部错误');
    } else if (error.code === 'ECONNABORTED') {
      console.error('⏰ 请求超时');
    } else if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
      console.error('🌐 网络连接错误');
    }
    
    return Promise.reject(error);
  }
);

// API服务方法
export const productAPI = {
  // 获取商品列表
  getProducts: (params = {}) => 
    api.get('/products', { params }),
  
  // 获取单个商品
  getProduct: (id) => 
    api.get(`/products/${id}`),
  
  // 获取商品分类
  getCategories: () => 
    api.get('/products/categories/list'),
  
  // 搜索商品
  searchProducts: (params) => 
    api.get(`/products/search?${params}`),
  
  // 获取热门搜索
  getPopularSearches: () => 
    api.get('/products/search/popular'),

  // 获取推荐商品
  getRecommendedProducts: (params = {}) => 
    api.get('/products/recommendations', { params }),

  // 获取相关商品
  getRelatedProducts: (productId, params = {}) => 
    api.get(`/products/${productId}/related`, { params }),

  // 获取个性化推荐（需要认证）
  getPersonalizedRecommendations: (params = {}) => 
    api.get('/products/recommendations/personalized', { params }),

  // 获取热门收藏商品
  getPopularProducts: (params = {}) => 
    api.get('/products/featured/popular', { params }),
};

export const healthAPI = {
  // 健康检查
  checkHealth: () => 
    api.get('/health'),
};

export const cartAPI = {
  // 获取购物车
  getCart: () => 
    api.get('/cart'),
  
  // 添加商品到购物车
  addToCart: (data) => 
    api.post('/cart', data),
  
  // 更新购物车商品数量
  updateCartItem: (itemId, data) => 
    api.put(`/cart/items/${itemId}`, data),
  
  // 从购物车移除商品
  removeFromCart: (itemId) => 
    api.delete(`/cart/items/${itemId}`),
  
  // 清空购物车
  clearCart: () => 
    api.delete('/cart'),
};

export const orderAPI = {
  // 创建订单
  createOrder: (data) => 
    api.post('/orders', data),
  
  // 获取用户订单列表
  getUserOrders: (params = {}) => 
    api.get('/orders', { params }),
  
  // 获取单个订单详情
  getOrder: (id) => 
    api.get(`/orders/${id}`),
  
  // 取消订单
  cancelOrder: (id) => 
    api.put(`/orders/${id}/cancel`),
  
  // 发起支付
  initiatePayment: (orderId) => 
    api.post(`/orders/${orderId}/payment`),
  
  // 处理支付回调
  handlePaymentCallback: (orderId, data) => 
    api.post(`/orders/${orderId}/payment/callback`, data),
  
  // 检查支付状态
  checkPaymentStatus: (orderId) => 
    api.get(`/orders/${orderId}/payment/status`),

  // 获取物流跟踪信息
  getTrackingInfo: (orderId) => 
    api.get(`/orders/${orderId}/tracking`),
  
  // 管理员API
  // 获取所有订单（管理员）
  getAllOrders: (params = {}) => 
    api.get('/orders/admin/all', { params }),
  
  // 更新订单状态（管理员）
  updateOrderStatus: (id, data) => 
    api.put(`/orders/${id}/status`, data),

  // 导出订单数据（管理员）
  exportOrders: (params = {}) => 
    api.get('/orders/admin/export', { 
      params,
      responseType: 'blob' // 重要：指定响应类型为blob
    }),

  // 获取订单统计数据（管理员）
  getAnalytics: (params = {}) => 
    api.get('/orders/admin/analytics', { params }),

  // 导出统计数据（管理员）
  exportAnalytics: (params = {}) => 
    api.get('/orders/admin/analytics/export', { 
      params,
      responseType: 'blob'
    }),
};

// 用户管理API（管理员）
export const userAdminAPI = {
  // 获取所有用户（管理员）
  getAllUsers: (params = {}) => 
    api.get('/users/admin/all', { params }),
  
  // 获取单个用户详情（管理员）
  getUser: (id) => 
    api.get(`/users/${id}`),
  
  // 更新用户状态（管理员）
  updateUserStatus: (id, statusData) => 
    api.patch(`/users/${id}/status`, statusData),
  
  // 更新用户角色（管理员）
  updateUserRole: (id, roleData) => 
    api.patch(`/users/${id}/role`, roleData),
  
  // 删除用户（管理员）
  deleteUser: (id) => 
    api.delete(`/users/${id}`),
};

// 认证API
export const authAPI = {
  // 用户注册
  register: (userData) => 
    api.post('/auth/register', userData),
  
  // 用户登录
  login: (credentials) => 
    api.post('/auth/login', credentials),
  
  // 用户登出
  logout: () => 
    api.get('/auth/logout'),
  
  // 获取当前用户信息
  getMe: () => 
    api.get('/auth/me'),
  
  // 更新用户信息
  updateMe: (userData) => 
    api.put('/auth/me', userData),
  
  // 修改密码
  updatePassword: (passwordData) => 
    api.put('/auth/password', passwordData),
};

// 用户API（心愿单等）
export const userAPI = {
  // 获取用户心愿单
  getWishlist: () => 
    api.get('/users/wishlist'),
  
  // 添加商品到心愿单
  addToWishlist: (productId) => 
    api.post('/users/wishlist', { productId }),
  
  // 从心愿单移除商品
  removeFromWishlist: (productId) => 
    api.delete(`/users/wishlist/${productId}`),
  
  // 检查商品是否在心愿单中
  checkWishlistItem: (productId) => 
    api.get(`/users/wishlist/check/${productId}`),
  
  // 清空心愿单
  clearWishlist: () => 
    api.delete('/users/wishlist'),
  
  // 获取热门收藏商品
  getPopularFavorites: (params = {}) => 
    api.get('/users/favorites/popular', { params }),
  
  // 获取用户收藏统计
  getFavoriteStats: () => 
    api.get('/users/favorites/stats'),
};

export default api;

// 评价API服务
export const reviewAPI = {
  // 获取商品评价
  getProductReviews: (productId, params = {}) => 
    api.get(`/reviews/product/${productId}`, { params }),

  // 创建评价
  createReview: (reviewData) => 
    api.post('/reviews', reviewData),

  // 更新评价
  updateReview: (reviewId, reviewData) => 
    api.put(`/reviews/${reviewId}`, reviewData),

  // 删除评价
  deleteReview: (reviewId) => 
    api.delete(`/reviews/${reviewId}`),

  // 标记评价为有帮助
  markHelpful: (reviewId) => 
    api.post(`/reviews/${reviewId}/helpful`),

  // 取消标记评价为有帮助
  unmarkHelpful: (reviewId) => 
    api.delete(`/reviews/${reviewId}/helpful`),

  // 获取用户的所有评价
  getUserReviews: (params = {}) => 
    api.get('/reviews/my-reviews', { params })
};

// 积分API服务
export const pointsAPI = {
  // 获取用户积分余额
  getPointsBalance: () => 
    api.get('/points/balance'),
  
  // 获取用户积分交易历史
  getPointsHistory: (params = {}) => 
    api.get('/points/history', { params }),
  
  // 获取积分排行榜
  getPointsLeaderboard: (params = {}) => 
    api.get('/points/leaderboard', { params }),
  
  // 获取用户积分统计
  getPointsStats: () => 
    api.get('/points/stats'),
  
  // 获取积分规则
  getPointsRules: () => 
    api.get('/points/rules'),
  
  // 管理员API
  // 调整用户积分（管理员）
  adjustUserPoints: (userId, data) => 
    api.post(`/points/admin/adjust/${userId}`, data),
  
  // 处理过期积分（管理员）
  processExpiredPoints: () => 
    api.post('/points/admin/process-expired')
};

// 优惠券API服务
export const couponAPI = {
  // 获取公开优惠券列表
  getPublicCoupons: (params = {}) => 
    api.get('/coupons/public/list', { params }),
  
  // 根据代码获取优惠券
  getCouponByCode: (code) => 
    api.get(`/coupons/code/${code}`),
  
  // 获取用户可用优惠券
  getUserAvailableCoupons: () => 
    api.get('/coupons/user/available'),
  
  // 获取用户已使用优惠券
  getUserUsedCoupons: (params = {}) => 
    api.get('/coupons/user/used', { params }),
  
  // 领取优惠券（通过ID）
  claimCoupon: (couponId, data = {}) => 
    api.post(`/coupons/${couponId}/claim`, data),
  
  // 领取优惠券（通过代码）
  claimCouponByCode: (code, data = {}) => 
    api.post(`/coupons/code/${code}/claim`, data),
  
  // 验证优惠券
  validateCoupon: (data) => 
    api.post('/coupons/validate', data),
  
  // 管理员API
  // 获取所有优惠券（管理员）
  getAllCoupons: (params = {}) => 
    api.get('/coupons', { params }),
  
  // 获取单个优惠券详情（管理员）
  getCoupon: (id) => 
    api.get(`/coupons/${id}`),
  
  // 创建优惠券（管理员）
  createCoupon: (data) => 
    api.post('/coupons', data),
  
  // 更新优惠券（管理员）
  updateCoupon: (id, data) => 
    api.put(`/coupons/${id}`, data),
  
  // 删除优惠券（管理员）
  deleteCoupon: (id) => 
    api.delete(`/coupons/${id}`)
};

// 库存预警API服务
export const stockAlertAPI = {
  // 获取库存预警列表
  getAlerts: (params = {}) => 
    api.get('/stock/alerts', { params }),
  
  // 获取库存统计信息
  getStatistics: () => 
    api.get('/stock/alerts/statistics'),
  
  // 导出库存预警报告
  exportReport: (alertType = 'all') => 
    api.get(`/stock/alerts/export?alertType=${alertType}`, { 
      responseType: 'blob'
    }),
  
  // 更新库存预警设置
  updateAlertSettings: (settings) => 
    api.put('/stock/alerts/settings', settings),
  
  // 获取库存预警设置
  getAlertSettings: () => 
    api.get('/stock/alerts/settings'),
  
  // 标记预警为已处理
  markAsHandled: (alertId) => 
    api.put(`/stock/alerts/${alertId}/handled`),
  
  // 批量处理预警
  bulkHandleAlerts: (alertIds) => 
    api.put('/stock/alerts/bulk-handle', { alertIds })
};

// 分析API服务
export const analyticsAPI = {
  // 获取用户行为分析数据
  getUserAnalytics: (params = {}) => 
    api.get('/analytics/user', { params }),
  
  // 获取实时分析数据
  getRealTimeAnalytics: () => 
    api.get('/analytics/realtime')
};

// 用户行为上报API
export const activityAPI = {
  // 记录用户行为（需要认证）
  track: (data) => api.post('/user-activities/track', data),
  // 批量记录用户行为（需要认证）
  trackBatch: (activities) => api.post('/user-activities/track/batch', { activities }),
};

// 导出api实例
export { api };

// 导出各个API服务
export * from './flashSaleAPI';
