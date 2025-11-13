import React, { useState } from 'react';
import { 
  ShoppingCart, 
  ArrowLeft, 
  Minus, 
  Plus, 
  Trash2,
  CreditCard
} from 'lucide-react';
import { useCart } from '../contexts/CartContext';

const CartPage = ({ onClose, onCheckout }) => {
  const { cart, loading, error, updateQuantity, removeItem, clearCart, fetchCart } = useCart();
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleUpdateQuantity = async (itemId, newQuantity) => {
    if (newQuantity < 1) return;

    try {
      const result = await updateQuantity(itemId, newQuantity);
      if (result.success) {
        showSnackbar('数量已更新');
      } else {
        showSnackbar(result.error, 'error');
      }
    } catch (err) {
      console.error('更新数量失败:', err);
      showSnackbar('更新数量失败', 'error');
    }
  };

  const handleRemoveItem = async (itemId) => {
    try {
      const result = await removeItem(itemId);
      if (result.success) {
        showSnackbar('商品已移除');
      } else {
        showSnackbar(result.error, 'error');
      }
    } catch (err) {
      console.error('移除商品失败:', err);
      showSnackbar('移除商品失败', 'error');
    }
  };

  const handleClearCart = async () => {
    try {
      const result = await clearCart();
      if (result.success) {
        showSnackbar('购物车已清空');
      } else {
        showSnackbar(result.error, 'error');
      }
    } catch (err) {
      console.error('清空购物车失败:', err);
      showSnackbar('清空购物车失败', 'error');
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <ShoppingCart className="h-6 w-6 text-primary-600" />
            <h2 className="text-xl font-semibold">购物车</h2>
            {cart && cart.totalItems > 0 && (
              <span className="bg-primary-100 text-primary-800 px-2 py-1 rounded-full text-sm">
                {cart.totalItems} 件商品
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[60vh]">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mx-6 mt-4">
              {error}
            </div>
          )}

          {!cart || !cart.items || cart.items.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingCart className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">购物车为空</p>
              <p className="text-gray-400 mt-2">快去添加一些商品吧！</p>
            </div>
          ) : (
            <div className="p-6">
              {/* Cart Items */}
              <div className="space-y-4">
                {cart.items.map((item) => (
                  <div key={item._id} className="flex items-center space-x-4 p-4 border rounded-lg">
                    <img
                      src={item.product.image || '/images/default-product.jpg'}
                      alt={item.product.name}
                      className="w-16 h-16 object-cover rounded"
                    />
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{item.product.name}</h3>
                      <p className="text-primary-600 font-semibold">¥{item.product.price}</p>
                      <p className="text-sm text-gray-500">库存: {item.product.stock}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleUpdateQuantity(item._id, item.quantity - 1)}
                        disabled={item.quantity <= 1}
                        className="p-1 rounded border disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="w-8 text-center font-medium">{item.quantity}</span>
                      <button
                        onClick={() => handleUpdateQuantity(item._id, item.quantity + 1)}
                        disabled={item.quantity >= item.product.stock}
                        className="p-1 rounded border disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">¥{(item.product.price * item.quantity).toFixed(2)}</p>
                      <button
                        onClick={() => handleRemoveItem(item._id)}
                        className="text-red-500 hover:text-red-700 mt-2"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Summary */}
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-gray-600">商品总数:</span>
                  <span className="font-semibold">{cart.totalItems} 件</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">总计:</span>
                  <span className="text-2xl font-bold text-primary-600">¥{cart.totalPrice.toFixed(2)}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-6 flex space-x-4">
                <button
                  onClick={handleClearCart}
                  className="flex-1 px-6 py-3 border border-red-500 text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                >
                  清空购物车
                </button>
                <button
                  onClick={onCheckout}
                  className="flex-1 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center justify-center"
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  立即结算
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CartPage;