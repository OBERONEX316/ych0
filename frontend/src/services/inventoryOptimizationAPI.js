import api from './api';

const inventoryOptimizationAPI = {
  getSuggestions: (params = {}) => api.get('/inventory-optimization/suggestions', { params }),
  generateForProduct: (data) => api.post('/inventory-optimization/generate', data),
  generateForAll: (data) => api.post('/inventory-optimization/generate-all', data),
};

export default inventoryOptimizationAPI;
