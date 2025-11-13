import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CreditCard, CheckCircle, XCircle, Loader, ArrowLeft } from 'lucide-react';
import { orderAPI } from '../services/api';

const PaymentPage = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [paymentInfo, setPaymentInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');

  useEffect(() => {
    fetchOrderDetails();
  }, [orderId]);

  const fetchOrderDetails = async () => {
    try {
      setLoading(true);
      const response = await orderAPI.getOrder(orderId);
      setOrder(response.data);
      
      // 检查支付状态
      const statusResponse = await orderAPI.checkPaymentStatus(orderId);
      setPaymentStatus(statusResponse.data.isPaid ? 'paid' : 'pending');
      
    } catch (err) {
      setError('获取订单信息失败');
      console.error('获取订单失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    try {
      setProcessing(true);
      setError('');
      
      const response = await orderAPI.initiatePayment(orderId);
      setPaymentInfo(response.data.paymentInfo);
      
      // 根据支付方式显示不同的支付界面
      if (order.paymentMethod === 'bank') {
        // 银行转账显示银行信息
        setPaymentStatus('pending');
      } else {
        // 支付宝/微信支付模拟成功
        setTimeout(() => {
          setPaymentStatus('paid');
          setProcessing(false);
        }, 2000);
      }
      
    } catch (err) {
      setError('支付发起失败');
      console.error('支付失败:', err);
      setProcessing(false);
    }
  };

  const handleBackToOrders = () => {
    navigate('/orders');
  };

  const handleViewOrder = () => {
    navigate(`/orders/${orderId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader className="animate-spin h-8 w-8 text-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">支付失败</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => navigate('/orders')}
            className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600"
          >
            返回订单列表
          </button>
        </div>
      </div>
    );
  }

  if (paymentStatus === 'paid') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">支付成功！</h2>
          <p className="text-gray-600 mb-4">订单号: {order.orderNumber}</p>
          <p className="text-gray-600 mb-6">支付金额: ¥{order.totalPrice}</p>
          <div className="space-x-4">
            <button
              onClick={handleViewOrder}
              className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600"
            >
              查看订单详情
            </button>
            <button
              onClick={handleBackToOrders}
              className="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600"
            >
              返回订单列表
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-md p-6">
          {/* 头部 */}
          <div className="flex items-center mb-6">
            <button
              onClick={handleBackToOrders}
              className="flex items-center text-gray-600 hover:text-gray-800"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              返回
            </button>
            <h1 className="text-2xl font-bold text-gray-900 ml-4">订单支付</h1>
          </div>

          {/* 订单信息 */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold text-gray-900 mb-2">订单信息</h3>
            <p className="text-gray-600">订单号: {order.orderNumber}</p>
            <p className="text-gray-600">订单金额: ¥{order.totalPrice}</p>
            <p className="text-gray-600">支付方式: 
              {order.paymentMethod === 'alipay' && '支付宝'}
              {order.paymentMethod === 'wechat' && '微信支付'}
              {order.paymentMethod === 'bank' && '银行转账'}
            </p>
          </div>

          {/* 支付内容 */}
          {!paymentInfo ? (
            <div className="text-center py-8">
              <CreditCard className="h-16 w-16 text-blue-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                准备支付
              </h3>
              <p className="text-gray-600 mb-6">
                请点击下方按钮开始支付流程
              </p>
              <button
                onClick={handlePayment}
                disabled={processing}
                className="bg-blue-500 text-white px-8 py-3 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processing ? '处理中...' : '立即支付'}
              </button>
            </div>
          ) : (
            <div className="text-center py-6">
              {order.paymentMethod === 'bank' ? (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    银行转账信息
                  </h3>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                    <p className="text-sm text-yellow-800">
                      请转账至以下银行账户，转账时请备注订单号
                    </p>
                  </div>
                  <div className="text-left bg-gray-50 p-4 rounded-lg mb-4">
                    <p><strong>账户名称:</strong> {paymentInfo.bankInfo.accountName}</p>
                    <p><strong>银行账号:</strong> {paymentInfo.bankInfo.accountNumber}</p>
                    <p><strong>开户银行:</strong> {paymentInfo.bankInfo.bankName}</p>
                    <p><strong>支行名称:</strong> {paymentInfo.bankInfo.branch}</p>
                    <p><strong>转账金额:</strong> ¥{order.totalPrice}</p>
                  </div>
                  <p className="text-sm text-gray-600 mb-4">
                    转账完成后，请联系客服确认收款
                  </p>
                </div>
              ) : (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    请扫描二维码完成支付
                  </h3>
                  <img 
                    src={paymentInfo.qrCode} 
                    alt="支付二维码" 
                    className="w-48 h-48 mx-auto mb-4 border"
                  />
                  <p className="text-sm text-gray-600">
                    请使用{order.paymentMethod === 'alipay' ? '支付宝' : '微信'}扫描二维码完成支付
                  </p>
                </div>
              )}
              
              {processing && (
                <div className="mt-4 flex items-center justify-center">
                  <Loader className="animate-spin h-5 w-5 text-blue-500 mr-2" />
                  <span className="text-gray-600">支付处理中...</span>
                </div>
              )}
            </div>
          )}

          {/* 错误提示 */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-4">
              <p className="text-red-800">{error}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentPage;