import React, { createContext, useContext, useState, useEffect } from 'react';
import { cartAPI } from '../services/api';
import { useAuth } from './AuthContext';

const CartContext = createContext();

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState({
    items: [],
    totalItems: 0,
    totalPrice: 0
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { isAuthenticated } = useAuth();

  // 获取购物车数据
  const fetchCart = async () => {
    try {
      setLoading(true);
      
      // 只有已认证用户才能获取购物车
      if (!isAuthenticated) {
        setCart({ items: [], totalItems: 0, totalPrice: 0 });
        setError('');
        return;
      }
      
      const response = await cartAPI.getCart();
      setCart(response.data);
      setError('');
    } catch (err) {
      const errorMessage = err.response?.data?.error || '获取购物车失败';
      setError(errorMessage);
      console.error('获取购物车失败:', err);
      
      // 如果是因为未认证，清空购物车
      if (err.response?.status === 401) {
        setCart({ items: [], totalItems: 0, totalPrice: 0 });
      }
    } finally {
      setLoading(false);
    }
  };

  // 添加商品到购物车
  const addToCart = async (productId, quantity = 1, flashSaleData = null) => {
    try {
      // 检查用户是否已登录
      if (!isAuthenticated) {
        return { success: false, error: '请先登录再添加商品到购物车' };
      }
      
      const requestData = { productId, quantity };
      
      // 如果有秒杀数据，添加到请求中
      if (flashSaleData) {
        requestData.flashSaleData = flashSaleData;
      }
      
      const response = await cartAPI.addToCart(requestData);
      setCart(response.data);
      return { success: true };
    } catch (err) {
      console.error('添加到购物车失败:', err);
      return { success: false, error: err.response?.data?.error || '添加到购物车失败' };
    }
  };

  // 更新商品数量
  const updateQuantity = async (itemId, quantity) => {
    if (quantity < 1) return { success: false, error: '数量必须大于0' };

    try {
      const response = await cartAPI.updateCartItem(itemId, { quantity });
      setCart(response.data);
      return { success: true };
    } catch (err) {
      console.error('更新数量失败:', err);
      return { success: false, error: err.response?.data?.error || '更新数量失败' };
    }
  };

  // 移除商品
  const removeItem = async (itemId) => {
    try {
      const response = await cartAPI.removeFromCart(itemId);
      setCart(response.data);
      return { success: true };
    } catch (err) {
      console.error('移除商品失败:', err);
      return { success: false, error: err.response?.data?.error || '移除商品失败' };
    }
  };

  // 清空购物车
  const clearCart = async () => {
    try {
      const response = await cartAPI.clearCart();
      setCart(response.data);
      return { success: true };
    } catch (err) {
      console.error('清空购物车失败:', err);
      return { success: false, error: err.response?.data?.error || '清空购物车失败' };
    }
  };

  // 初始化时获取购物车数据，并在认证状态变化时重新获取
  useEffect(() => {
    fetchCart();
  }, [isAuthenticated]);

  const value = {
    cart,
    loading,
    error,
    fetchCart,
    addToCart,
    updateQuantity,
    removeItem,
    clearCart
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};
