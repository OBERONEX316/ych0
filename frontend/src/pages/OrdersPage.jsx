import React, { useState, useEffect } from 'react';
import { orderAPI } from '../services/api';
import { 
  Package, 
  Clock, 
  CheckCircle, 
  Truck, 
  XCircle,
  Loader,
  Calendar,
  MapPin,
  CreditCard,
  RefreshCw
} from 'lucide-react';
import TrackingModal from '../components/TrackingModal';
import { useNavigate } from 'react-router-dom';

const OrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [trackingModalOpen, setTrackingModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const result = await orderAPI.getUserOrders();
      if (result.success) {
        setOrders(result.data);
      } else {
        setError(result.error || '获取订单失败');
      }
    } catch (err) {
      console.error('获取订单失败:', err);
      setError(err.response?.data?.error || '获取订单失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelOrder = async (orderId) => {
    if (!window.confirm('确定要取消此订单吗？')) return;

    try {
      await orderAPI.cancelOrder(orderId);
      setOrders(orders.map(order => 
        order._id === orderId ? { ...order, status: 'cancelled' } : order
      ));
    } catch (err) {
      setError(err.response?.data?.message || '取消订单失败');
    }
  };

  const handleViewTracking = (order) => {
    setSelectedOrder(order);
    setTrackingModalOpen(true);
  };

  const handleRefundRequest = (order) => {
    navigate('/after-sales', { state: { selectedOrder: order } });
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-600" />;
      case 'confirmed':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'shipped':
        return <Truck className="h-5 w-5 text-blue-600" />;
      case 'delivered':
        return <Package className="h-5 w-5 text-purple-600" />;
      case 'cancelled':
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return <Clock className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pending':
        return '待确认';
      case 'confirmed':
        return '已确认';
      case 'shipped':
        return '已发货';
      case 'delivered':
        return '已送达';
      case 'cancelled':
        return '已取消';
      default:
        return status;
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('zh-CN');
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <Loader className="h-8 w-8 text-primary-600 animate-spin mr-3" />
          <span className="text-gray-600">加载订单中...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center space-x-3 mb-8">
        <Package className="h-8 w-8 text-primary-600" />
        <h1 className="text-2xl font-bold text-gray-900">我的订单</h1>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-12">
          <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">暂无订单</h3>
          <p className="text-gray-500">您还没有任何订单记录</p>
        </div>
      ) : (
        <div className="space-y-6">
          {orders.map((order) => (
            <div key={order._id} className="bg-white border rounded-lg overflow-hidden">
              {/* 订单头部 */}
              <div className="bg-gray-50 px-6 py-4 border-b">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(order.status)}
                      <span className="font-medium">
                        {getStatusText(order.status)}
                      </span>
                    </div>
                    <span className="text-sm text-gray-500">
                      订单号: {order.orderNumber}
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-2 text-sm text-gray-500">
                    <Calendar className="h-4 w-4" />
                    <span>{formatDate(order.createdAt)}</span>
                  </div>
                </div>
              </div>

              {/* 订单内容 */}
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  {/* 收货信息 */}
                  <div>
                    <h4 className="font-semibold mb-3 flex items-center">
                      <MapPin className="h-4 w-4 mr-2" />
                      收货信息
                    </h4>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p>{order.shippingAddress.fullName}</p>
                      <p>{order.shippingAddress.phone}</p>
                      <p>{order.shippingAddress.address}</p>
                      <p>{order.shippingAddress.city}, {order.shippingAddress.province}</p>
                      <p>邮政编码: {order.shippingAddress.postalCode}</p>
                    </div>
                  </div>

                  {/* 支付信息 */}
                  <div>
                    <h4 className="font-semibold mb-3 flex items-center">
                      <CreditCard className="h-4 w-4 mr-2" />
                      支付信息
                    </h4>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p>支付方式: {order.paymentMethod}</p>
                      <p>支付状态: {order.paymentStatus === 'paid' ? '已支付' : '未支付'}</p>
                      <p>订单金额: ¥{order.totalAmount.toFixed(2)}</p>
                    </div>
                  </div>

                  {/* 订单状态 */}
                  <div>
                    <h4 className="font-semibold mb-3">订单状态</h4>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p>订单状态: {getStatusText(order.status)}</p>
                      {order.shippingInfo && (
                        <p>物流公司: {order.shippingInfo.carrier}</p>
                      )}
                      {order.shippingInfo && order.shippingInfo.trackingNumber && (
                        <p>运单号: {order.shippingInfo.trackingNumber}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* 商品列表 */}
                <div className="border-t pt-6">
                  <h4 className="font-semibold mb-4">商品清单</h4>
                  <div className="space-y-3">
                    {order.items.map((item) => (
                      <div key={item._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-4">
                          <img
                            src={item.product.image || '/images/default-product.jpg'}
                            alt={item.product.name}
                            className="w-16 h-16 object-cover rounded"
                          />
                          <div>
                            <p className="font-medium">{item.product.name}</p>
                            <p className="text-sm text-gray-500">
                              单价: ¥{item.product.price.toFixed(2)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">
                            ¥{(item.product.price * item.quantity).toFixed(2)}
                          </p>
                          <p className="text-sm text-gray-500">
                            数量: {item.quantity}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 费用明细 */}
                <div className="border-t pt-6">
                  <h4 className="font-semibold mb-3">费用明细</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>商品金额:</span>
                        <span>¥{order.subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>运费:</span>
                        <span>¥{order.shippingFee.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>税费:</span>
                        <span>¥{order.taxAmount.toFixed(2)}</span>
                      </div>
                    </div>
                    <div className="border-t md:border-t-0 md:border-l md:pl-4 pt-2 md:pt-0">
                      <div className="flex justify-between font-semibold text-lg">
                        <span>总计:</span>
                        <span className="text-primary-600">
                          ¥{order.totalAmount.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 操作按钮 */}
                <div className="border-t pt-6 mt-6 flex space-x-4">
                  {order.status === 'pending' && (
                    <button
                      onClick={() => handleCancelOrder(order._id)}
                      className="px-6 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition-colors"
                    >
                      取消订单
                    </button>
                  )}
                  {order.shippingInfo && order.shippingInfo.trackingNumber && (
                    <button
                      onClick={() => handleViewTracking(order)}
                      className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center space-x-2"
                    >
                      <Truck className="h-4 w-4" />
                      <span>查看物流</span>
                    </button>
                  )}
                  {['delivered', 'confirmed'].includes(order.status) && (
                    <button
                      onClick={() => handleRefundRequest(order)}
                      className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center space-x-2"
                    >
                      <RefreshCw className="h-4 w-4" />
                      <span>申请退款</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* 物流跟踪模态框 */}
      {trackingModalOpen && (
        <TrackingModal
          order={selectedOrder}
          onClose={() => setTrackingModalOpen(false)}
        />
      )}
    </div>
  );
};

export default OrdersPage;