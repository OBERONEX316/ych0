import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // 登录
  const login = async (identifier, password) => {
    try {
      setLoading(true);
      setError('');
      
      const response = await authAPI.login({ identifier, password });
      
      if (response.success) {
        const { token: newToken, data } = response;
        setToken(newToken);
        setUser(data.user);
        localStorage.setItem('token', newToken);
        return { success: true };
      } else {
        setError(response.error || '登录失败');
        return { success: false, error: response.error };
      }
    } catch (err) {
      const errorMessage = err.response?.data?.error || '登录失败，请检查网络连接';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // 注册
  const register = async (userData) => {
    try {
      setLoading(true);
      setError('');
      
      const response = await authAPI.register(userData);
      
      if (response.success) {
        const { token: newToken, data } = response;
        setToken(newToken);
        setUser(data.user);
        localStorage.setItem('token', newToken);
        return { success: true };
      } else {
        setError(response.error || '注册失败');
        return { success: false, error: response.error };
      }
    } catch (err) {
      const errorMessage = err.response?.data?.error || '注册失败，请检查网络连接';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // 登出
  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    setError('');
  };

  // 获取当前用户信息
  const getCurrentUser = async () => {
    try {
      if (!token) {
        setLoading(false);
        return;
      }
      
      const response = await authAPI.getMe();
      
      if (response.success) {
        setUser(response.data.user);
      } else {
        // Token可能已过期，清除本地存储
        logout();
      }
    } catch (err) {
      console.error('获取用户信息失败:', err);
      logout();
    } finally {
      setLoading(false);
    }
  };

  // 更新用户信息
  const updateProfile = async (userData) => {
    try {
      setLoading(true);
      setError('');
      
      const response = await authAPI.updateMe(userData);
      
      if (response.success) {
        setUser(response.data.user);
        return { success: true };
      } else {
        setError(response.error || '更新失败');
        return { success: false, error: response.error };
      }
    } catch (err) {
      const errorMessage = err.response?.data?.error || '更新失败，请检查网络连接';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // 修改密码
  const updatePassword = async (passwordData) => {
    try {
      setLoading(true);
      setError('');
      
      const response = await authAPI.updatePassword(passwordData);
      
      if (response.success) {
        return { success: true };
      } else {
        setError(response.error || '密码修改失败');
        return { success: false, error: response.error };
      }
    } catch (err) {
      const errorMessage = err.response?.data?.error || '密码修改失败，请检查网络连接';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // 初始化时获取用户信息
  useEffect(() => {
    if (token) {
      getCurrentUser();
    } else {
      setLoading(false);
    }
  }, [token]);

  const value = {
    user,
    token,
    loading,
    error,
    login,
    register,
    logout,
    updateProfile,
    updatePassword,
    isAuthenticated: !!user && !!token,
    clearError: () => setError('')
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};