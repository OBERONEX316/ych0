const API_BASE_URL = '/api';

export const membershipAPI = {
  // 获取所有会员等级
  getAllLevels: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/membership/levels`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || '获取会员等级失败');
      }
      
      return data;
    } catch (error) {
      console.error('获取会员等级失败:', error);
      throw error;
    }
  },

  // 获取用户会员信息
  getUserMembership: async (token) => {
    try {
      const response = await fetch(`${API_BASE_URL}/membership/user`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || '获取用户会员信息失败');
      }
      
      return data;
    } catch (error) {
      console.error('获取用户会员信息失败:', error);
      throw error;
    }
  },

  // 获取所有会员任务
  getAllTasks: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/membership/tasks`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || '获取会员任务失败');
      }
      
      return data;
    } catch (error) {
      console.error('获取会员任务失败:', error);
      throw error;
    }
  },

  // 获取用户可参与的任务
  getUserAvailableTasks: async (token) => {
    try {
      const response = await fetch(`${API_BASE_URL}/membership/user/tasks`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || '获取用户可参与任务失败');
      }
      
      return data;
    } catch (error) {
      console.error('获取用户可参与任务失败:', error);
      throw error;
    }
  },

  // 更新任务进度
  updateTaskProgress: async (token, taskId, progress) => {
    try {
      const response = await fetch(`${API_BASE_URL}/membership/user/task-progress`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ taskId, progress })
      });
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || '更新任务进度失败');
      }
      
      return data;
    } catch (error) {
      console.error('更新任务进度失败:', error);
      throw error;
    }
  },

  // 积分兑换
  redeemPoints: async (token, points, reason, orderId = null) => {
    try {
      const response = await fetch(`${API_BASE_URL}/membership/user/redeem-points`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ points, reason, orderId })
      });
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || '积分兑换失败');
      }
      
      return data;
    } catch (error) {
      console.error('积分兑换失败:', error);
      throw error;
    }
  },

  // 获取用户积分历史
  getUserPointsHistory: async (token, page = 1, limit = 20, type = null) => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(type && { type })
      });
      
      const response = await fetch(`${API_BASE_URL}/membership/user/points-history?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || '获取积分历史失败');
      }
      
      return data;
    } catch (error) {
      console.error('获取积分历史失败:', error);
      throw error;
    }
  },

  // 管理员：创建会员等级
  createMembershipLevel: async (token, levelData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/membership/levels`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(levelData)
      });
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || '创建会员等级失败');
      }
      
      return data;
    } catch (error) {
      console.error('创建会员等级失败:', error);
      throw error;
    }
  },

  // 管理员：更新会员等级
  updateMembershipLevel: async (token, levelId, levelData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/membership/levels/${levelId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(levelData)
      });
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || '更新会员等级失败');
      }
      
      return data;
    } catch (error) {
      console.error('更新会员等级失败:', error);
      throw error;
    }
  },

  // 管理员：删除会员等级
  deleteMembershipLevel: async (token, levelId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/membership/levels/${levelId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || '删除会员等级失败');
      }
      
      return data;
    } catch (error) {
      console.error('删除会员等级失败:', error);
      throw error;
    }
  }
};
