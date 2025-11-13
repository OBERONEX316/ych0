import React, { useState } from 'react';
import { useCart } from '../contexts/CartContext';
import { orderAPI } from '../services/api';
import { 
  CreditCard, 
  MapPin, 
  Truck, 
  Shield, 
  ArrowLeft,
  Loader,
  CheckCircle
} from 'lucide-react';

const CheckoutPage = ({ onClose, onOrderCreated }) => {
  const { cart, loading: cartLoading, clearCart } = useCart();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1: 地址, 2: 支付, 3: 确认
  const [error, setError] = useState('');
  
  // 表单数据
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    address: '',
    city: '',
    province: '',
    postalCode: '',
    paymentMethod: 'alipay'
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleNextStep = () => {
    if (step === 1) {
      // 验证地址信息
      const { fullName, phone, address, city, province, postalCode } = formData;
      if (!fullName || !phone || !address || !city || !province || !postalCode) {
        setError('请填写完整的收货地址信息');
        return;
      }
      setError('');
      setStep(2);
    } else if (step === 2) {
      setStep(3);
    }
  };

  const handlePrevStep = () => {
    setStep(step - 1);
    setError('');
  };

  const handleSubmitOrder = async () => {
    try {
      setLoading(true);
      setError('');

      const orderData = {
        shippingAddress: {
          fullName: formData.fullName,
          phone: formData.phone,
          address: formData.address,
          city: formData.city,
          province: formData.province,
          postalCode: formData.postalCode
        },
        paymentMethod: formData.paymentMethod,
        items: cart.items.map(item => ({
          product: item.product._id,
          quantity: item.quantity
        }))
      };

      const result = await orderAPI.createOrder(orderData);
      
      if (result.success) {
        // 清空购物车
        await clearCart();
        
        // 通知父组件订单创建成功
        if (onOrderCreated) {
          onOrderCreated(result.data);
        }
        
        // 关闭结账页面并跳转到支付页面
        if (onClose) {
          onClose(result.data._id); // 传递订单ID用于支付
        }
      } else {
        setError(result.error || '创建订单失败');
      }
    } catch (err) {
      console.error('提交订单失败:', err);
      setError(err.response?.data?.error || '提交订单失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  if (cartLoading || !cart) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <Loader className="h-12 w-12 text-primary-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  if (cart.items.length === 0) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-md w-full">
          <div className="text-center">
            <CreditCard className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">购物车为空</h3>
            <p className="text-gray-500 mb-6">请先添加商品到购物车</p>
            <button
              onClick={onClose}
              className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 transition-colors"
            >
              返回购物
            </button>
          </div>
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
            <CreditCard className="h-6 w-6 text-primary-600" />
            <h2 className="text-xl font-semibold">结算订单</h2>
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <span className={`px-2 py-1 rounded-full ${step >= 1 ? 'bg-primary-100 text-primary-800' : 'bg-gray-100'}`}>
                1. 地址
              </span>
              <span className={`px-2 py-1 rounded-full ${step >= 2 ? 'bg-primary-100 text-primary-800' : 'bg-gray-100'}`}>
                2. 支付
              </span>
              <span className={`px-2 py-1 rounded-full ${step >= 3 ? 'bg-primary-100 text-primary-800' : 'bg-gray-100'}`}>
                3. 确认
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[60vh] p-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
              {error}
            </div>
          )}

          {/* Step 1: 收货地址 */}
          {step === 1 && (
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <MapPin className="h-5 w-5 mr-2 text-primary-600" />
                收货地址
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    收货人姓名 *
                  </label>
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    手机号码 *
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    详细地址 *
                  </label>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    城市 *
                  </label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    省份 *
                  </label>
                  <input
                    type="text"
                    name="province"
                    value={formData.province}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    邮政编码 *
                  </label>
                  <input
                    type="text"
                    name="postalCode"
                    value={formData.postalCode}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: 支付方式 */}
          {step === 2 && (
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <CreditCard className="h-5 w-5 mr-2 text-primary-600" />
                选择支付方式
              </h3>
              <div className="space-y-3 mb-6">
                <label className="flex items-center p-4 border rounded-lg cursor-pointer hover:border-primary-500">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="alipay"
                    checked={formData.paymentMethod === 'alipay'}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500"
                  />
                  <div className="ml-3">
                    <span className="block text-sm font-medium text-gray-900">支付宝</span>
                    <span className="block text-sm text-gray-500">推荐使用，安全快捷</span>
                  </div>
                </label>
                <label className="flex items-center p-4 border rounded-lg cursor-pointer hover:border-primary-500">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="wechat"
                    checked={formData.paymentMethod === 'wechat'}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500"
                  />
                  <div className="ml-3">
                    <span className="block text-sm font-medium text-gray-900">微信支付</span>
                    <span className="block text-sm text-gray-500">便捷支付，即时到账</span>
                  </div>
                </label>
                <label className="flex items-center p-4 border rounded-lg cursor-pointer hover:border-primary-500">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="bank"
                    checked={formData.paymentMethod === 'bank'}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500"
                  />
                  <div className="ml-3">
                    <span className="block text-sm font-medium text-gray-900">银行转账</span>
                    <span className="block text-sm text-gray-500">对公账户，安全可靠</span>
                  </div>
                </label>
              </div>

              {/* 订单摘要 */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold mb-3">订单摘要</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>商品金额:</span>
                    <span>¥{cart.totalPrice.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>运费:</span>
                    <span>{cart.totalPrice >= 99 ? '免费' : '¥15.00'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>税费:</span>
                    <span>¥{(cart.totalPrice * 0.1).toFixed(2)}</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between font-semibold">
                    <span>总计:</span>
                    <span className="text-primary-600">
                      ¥{(cart.totalPrice + (cart.totalPrice >= 99 ? 0 : 15) + (cart.totalPrice * 0.1)).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: 确认订单 */}
          {step === 3 && (
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <CheckCircle className="h-5 w-5 mr-2 text-primary-600" />
                确认订单信息
              </h3>
              
              {/* 收货地址 */}
              <div className="mb-6">
                <h4 className="font-semibold mb-2">收货信息</h4>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p>{formData.fullName} {formData.phone}</p>
                  <p>{formData.province} {formData.city}</p>
                  <p>{formData.address}</p>
                  <p>邮政编码: {formData.postalCode}</p>
                </div>
              </div>

              {/* 支付方式 */}
              <div className="mb-6">
                <h4 className="font-semibold mb-2">支付方式</h4>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p>
                    {formData.paymentMethod === 'alipay' && '支付宝'}
                    {formData.paymentMethod === 'wechat' && '微信支付'}
                    {formData.paymentMethod === 'bank' && '银行转账'}
                  </p>
                </div>
              </div>

              {/* 商品清单 */}
              <div className="mb-6">
                <h4 className="font-semibold mb-2">商品清单</h4>
                <div className="space-y-3">
                  {cart.items.map(item => (
                    <div key={item._id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <img
                          src={item.product.image || '/images/default-product.jpg'}
                          alt={item.product.name}
                          className="w-12 h-12 object-cover rounded"
                        />
                        <div>
                          <p className="font-medium">{item.product.name}</p>
                          <p className="text-sm text-gray-500">数量: {item.quantity}</p>
                        </div>
                      </div>
                      <p className="font-semibold">¥{(item.product.price * item.quantity).toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* 费用明细 */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <h4 className="font-semibold mb-3">费用明细</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>商品金额:</span>
                    <span>¥{cart.totalPrice.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>运费:</span>
                    <span>{cart.totalPrice >= 99 ? '免费' : '¥15.00'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>税费:</span>
                    <span>¥{(cart.totalPrice * 0.1).toFixed(2)}</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between font-semibold text-lg">
                    <span>应付总额:</span>
                    <span className="text-primary-600">
                      ¥{(cart.totalPrice + (cart.totalPrice >= 99 ? 0 : 15) + (cart.totalPrice * 0.1)).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t p-6">
          <div className="flex justify-between items-center">
            {step > 1 ? (
              <button
                onClick={handlePrevStep}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                disabled={loading}
              >
                上一步
              </button>
            ) : (
              <div />
            )}
            
            {step < 3 ? (
              <button
                onClick={handleNextStep}
                className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                disabled={loading}
              >
                下一步
              </button>
            ) : (
              <button
                onClick={handleSubmitOrder}
                disabled={loading}
                className="px-8 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center"
              >
                {loading ? (
                  <>
                    <Loader className="h-4 w-4 animate-spin mr-2" />
                    提交中...
                  </>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4 mr-2" />
                    确认支付
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;