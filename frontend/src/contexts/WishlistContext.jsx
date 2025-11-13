import React, { createContext, useContext, useState, useEffect } from 'react';
import { userAPI } from '../services/api';
import { useAuth } from './AuthContext';

const WishlistContext = createContext();

export const useWishlist = () => {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
};

export const WishlistProvider = ({ children }) => {
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { isAuthenticated } = useAuth();

  // 获取用户心愿单
  const fetchWishlist = async () => {
    if (!isAuthenticated) {
      setWishlist([]);
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      const response = await userAPI.getWishlist();
      
      if (response.success) {
        setWishlist(response.data.wishlist || []);
      } else {
        setError(response.error || '获取心愿单失败');
      }
    } catch (err) {
      console.error('获取心愿单失败:', err);
      setError('获取心愿单失败，请检查网络连接');
    } finally {
      setLoading(false);
    }
  };

  // 添加商品到心愿单
  const addToWishlist = async (productId) => {
    if (!isAuthenticated) {
      setError('请先登录以使用心愿单功能');
      return { success: false, error: '请先登录' };
    }

    try {
      setLoading(true);
      setError('');
      
      const response = await userAPI.addToWishlist(productId);
      
      if (response.success) {
        setWishlist(response.data.wishlist);
        return { success: true, message: response.data.message };
      } else {
        setError(response.error || '添加到心愿单失败');
        return { success: false, error: response.error };
      }
    } catch (err) {
      console.error('添加到心愿单失败:', err);
      const errorMessage = err.response?.data?.error || '添加到心愿单失败，请检查网络连接';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // 从心愿单移除商品
  const removeFromWishlist = async (productId) => {
    if (!isAuthenticated) {
      return { success: false, error: '请先登录' };
    }

    try {
      setLoading(true);
      setError('');
      
      const response = await userAPI.removeFromWishlist(productId);
      
      if (response.success) {
        setWishlist(response.data.wishlist);
        return { success: true, message: response.data.message };
      } else {
        setError(response.error || '从心愿单移除失败');
        return { success: false, error: response.error };
      }
    } catch (err) {
      console.error('从心愿单移除失败:', err);
      const errorMessage = err.response?.data?.error || '从心愿单移除失败，请检查网络连接';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // 检查商品是否在心愿单中
  const isInWishlist = (productId) => {
    return wishlist.some(item => item.product._id === productId);
  };

  // 切换商品的心愿单状态
  const toggleWishlist = async (productId) => {
    if (isInWishlist(productId)) {
      return await removeFromWishlist(productId);
    } else {
      return await addToWishlist(productId);
    }
  };

  // 清空心愿单
  const clearWishlist = async () => {
    if (!isAuthenticated) {
      return { success: false, error: '请先登录' };
    }

    try {
      setLoading(true);
      setError('');
      
      const response = await userAPI.clearWishlist();
      
      if (response.success) {
        setWishlist([]);
        return { success: true, message: response.data.message };
      } else {
        setError(response.error || '清空心愿单失败');
        return { success: false, error: response.error };
      }
    } catch (err) {
      console.error('清空心愿单失败:', err);
      const errorMessage = err.response?.data?.error || '清空心愿单失败，请检查网络连接';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // 获取心愿单商品数量
  const getWishlistCount = () => {
    return wishlist.length;
  };

  // 当认证状态变化时重新获取心愿单
  useEffect(() => {
    fetchWishlist();
  }, [isAuthenticated]);

  const value = {
    wishlist,
    loading,
    error,
    fetchWishlist,
    addToWishlist,
    removeFromWishlist,
    toggleWishlist,
    isInWishlist,
    clearWishlist,
    getWishlistCount,
    clearError: () => setError('')
  };

  return (
    <WishlistContext.Provider value={value}>
      {children}
    </WishlistContext.Provider>
  );
};