import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const referralAPI = {
  // Get active referral programs
  getActivePrograms: async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/referral/programs/active`);
      return response.data;
    } catch (error) {
      console.error('Get active programs error:', error);
      throw error.response?.data || error.message;
    }
  },

  // Get user's referral stats
  getUserReferralStats: async (token) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/referral/user/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      console.error('Get user referral stats error:', error);
      throw error.response?.data || error.message;
    }
  },

  // Create referral (user refers someone)
  createReferral: async (token, referralData) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/referral/create`, referralData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      console.error('Create referral error:', error);
      throw error.response?.data || error.message;
    }
  },

  // Process referral completion
  processReferralCompletion: async (completionData) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/referral/complete`, completionData);
      return response.data;
    } catch (error) {
      console.error('Process referral completion error:', error);
      throw error.response?.data || error.message;
    }
  },

  // Admin: Create referral program
  createReferralProgram: async (token, programData) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/referral/admin/programs`, programData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      console.error('Create referral program error:', error);
      throw error.response?.data || error.message;
    }
  },

  // Admin: Update referral program
  updateReferralProgram: async (token, programId, programData) => {
    try {
      const response = await axios.put(`${API_BASE_URL}/referral/admin/programs/${programId}`, programData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      console.error('Update referral program error:', error);
      throw error.response?.data || error.message;
    }
  },

  // Admin: Get all referral programs
  getAllReferralPrograms: async (token, page = 1, limit = 10) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/referral/admin/programs`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { page, limit }
      });
      return response.data;
    } catch (error) {
      console.error('Get all referral programs error:', error);
      throw error.response?.data || error.message;
    }
  },

  // Admin: Get referral program by ID
  getReferralProgramById: async (token, programId) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/referral/admin/programs/${programId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      console.error('Get referral program by ID error:', error);
      throw error.response?.data || error.message;
    }
  },

  // Admin: Delete referral program
  deleteReferralProgram: async (token, programId) => {
    try {
      const response = await axios.delete(`${API_BASE_URL}/referral/admin/programs/${programId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      console.error('Delete referral program error:', error);
      throw error.response?.data || error.message;
    }
  },

  // Admin: Get referral statistics
  getReferralStatistics: async (token, filters = {}) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/referral/admin/statistics`, {
        headers: { Authorization: `Bearer ${token}` },
        params: filters
      });
      return response.data;
    } catch (error) {
      console.error('Get referral statistics error:', error);
      throw error.response?.data || error.message;
    }
  }
};

export default referralAPI;