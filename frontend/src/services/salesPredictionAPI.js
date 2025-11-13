import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: `${API_URL}/sales-predictions`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Sales Prediction API Service
const salesPredictionAPI = {
  // Generate new prediction
  generatePrediction: async (productId, period = 'monthly', customFactors = {}) => {
    const response = await api.post('/generate', {
      productId,
      period,
      customFactors
    });
    return response.data;
  },

  // Get predictions for a specific product
  getProductPredictions: async (productId, period = 'monthly', limit = 12) => {
    const response = await api.get(`/product/${productId}`, {
      params: { period, limit }
    });
    return response.data;
  },

  // Get predictions by time period
  getPredictionsByPeriod: async (startDate, endDate, period = 'monthly') => {
    const response = await api.get('/period', {
      params: { startDate, endDate, period }
    });
    return response.data;
  },

  // Get accuracy report
  getAccuracyReport: async (productId, period = 'monthly') => {
    const response = await api.get(`/accuracy/${productId}`, { params: { period } });
    return response.data;
  },

  // Get dashboard analytics
  getDashboardAnalytics: async (period = 'monthly') => {
    const response = await api.get('/dashboard', {
      params: { period }
    });
    return response.data;
  },

  // Update prediction with actual results (admin)
  updatePredictionResults: async (predictionId, actualQuantity, actualRevenue) => {
    const response = await api.put(`/results/${predictionId}`, {
      actualQuantity,
      actualRevenue
    });
    return response.data;
  },

  // Bulk generate predictions (admin)
  bulkGeneratePredictions: async (productIds, period = 'monthly', customFactors = {}) => {
    const response = await api.post('/bulk-generate', {
      productIds,
      period,
      customFactors
    });
    return response.data;
  },

  // Get prediction trends
  getPredictionTrends: async (productId, period = 'monthly', months = 6) => {
    const response = await api.get(`/trends/${productId}`, {
      params: { period, months }
    });
    return response.data;
  },

  // Get prediction by ID
  getPredictionById: async (predictionId) => {
    const response = await api.get(`/${predictionId}`);
    return response.data;
  },

  // Get all active predictions
  getActivePredictions: async (period = 'monthly') => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 3); // Last 3 months

    const response = await api.get('/period', {
      params: {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        period
      }
    });
    return response.data;
  },

  // Get predictions by confidence level
  getPredictionsByConfidence: async (minConfidence = 0.7, maxConfidence = 1.0) => {
    const response = await api.get('/dashboard');
    const allPredictions = response.data.data.recentPredictions;
    
    return {
      success: true,
      data: allPredictions.filter(p => 
        p.confidenceLevel >= minConfidence && p.confidenceLevel <= maxConfidence
      )
    };
  },

  // Get algorithm comparison
  getAlgorithmComparison: async (productId, period = 'monthly') => {
    const response = await api.get(`/product/${productId}`, {
      params: { period, limit: 50 }
    });
    
    const predictions = response.data.data;
    const algorithmStats = {};
    
    predictions.forEach(prediction => {
      const algo = prediction.algorithmUsed;
      if (!algorithmStats[algo]) {
        algorithmStats[algo] = {
          count: 0,
          totalConfidence: 0,
          totalMAPE: 0,
          completedCount: 0
        };
      }
      
      algorithmStats[algo].count++;
      algorithmStats[algo].totalConfidence += prediction.confidenceLevel;
      
      if (prediction.accuracyMetrics && prediction.accuracyMetrics.mape) {
        algorithmStats[algo].totalMAPE += prediction.accuracyMetrics.mape;
        algorithmStats[algo].completedCount++;
      }
    });

    // Calculate averages
    Object.keys(algorithmStats).forEach(algo => {
      const stats = algorithmStats[algo];
      algorithmStats[algo] = {
        count: stats.count,
        averageConfidence: stats.totalConfidence / stats.count,
        averageMAPE: stats.completedCount > 0 ? stats.totalMAPE / stats.completedCount : null,
        completedCount: stats.completedCount
      };
    });

    return {
      success: true,
      data: algorithmStats
    };
  }
};

export default salesPredictionAPI;
