import React, { useState, useEffect } from 'react';
import { orderAPI } from '../services/api';
import { useNavigate } from 'react-router-dom';
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
  Search,
  Filter,
  Download,
  BarChart3,
  Eye,
  Edit3,
  TrendingUp
} from 'lucide-react';

const AdminOrdersPage = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [filters, setFilters] = useState({
    status: '',
    userId: '',
    page: 1,
    limit: 10,
    search: ''
  });
  const [pagination, setPagination] = useState({});
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, [filters]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const result = await orderAPI.getAllOrders(filters);
      if (result.success) {
        setOrders(result.data);
        setPagination(result.pagination);
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

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: key === 'page' ? value : 1 // 切换筛选条件时重置页码
    }));
  };

  const handleStatusUpdate = async (orderId, newStatus) => {
    try {
      const result = await orderAPI.updateOrderStatus(orderId, { status: newStatus });
      if (result.success) {
        // 更新本地订单状态
        setOrders(prev => prev.map(order => 
          order._id === orderId ? { ...order, status: newStatus } : order
        ));
        alert('订单状态更新成功');
      } else {
        alert(result.error || '更新订单状态失败');
      }
    } catch (err) {
      console.error('更新订单状态失败:', err);
      alert('更新订单状态失败，请稍后重试');
    }
  };

  // 导出订单数据
  const handleExportOrders = async () => {
    try {
      // 构建导出参数（使用当前筛选条件）
      const exportParams = {
        status: filters.status,
        userId: filters.userId,
        search: filters.search,
        format: 'csv'
      };

      const response = await orderAPI.exportOrders(exportParams);
      
      // 创建下载链接
      const blob = new Blob([response], { type: 'text/csv;charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `orders-export-${new Date().getTime()}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      alert('订单导出成功！');
    } catch (err) {
      console.error('导出订单失败:', err);
      alert('导出订单失败，请稍后重试');
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-600" />;
      case 'confirmed':
        return <CheckCircle className="h-5 w-5 text-blue-600" />;
      case 'shipped':
        return <Truck className="h-5 w-5 text-orange-600" />;
      case 'delivered':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'cancelled':
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return <Package className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusText = (status) => {
    const statusMap = {
      'pending': '待处理',
      'confirmed': '已确认',
      'shipped': '已发货',
      'delivered': '已送达',
      'cancelled': '已取消'
    };
    return statusMap[status] || status;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('zh-CN');
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY'
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <Loader className="h-8 w-8 text-primary-600 animate-spin mr-3" />
          <span className="text-gray-600">加载订单中...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-3">
          <Package className="h-8 w-8 text-primary-600" />
          <h1 className="text-2xl font-bold text-gray-900">订单管理</h1>
          <span className="text-sm text-gray-500">
            ({pagination.totalItems || 0} 个订单)
          </span>
        </div>
        
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <Filter className="h-4 w-4 mr-2" />
            筛选
          </button>
          
          <button 
            onClick={handleExportOrders}
            className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700"
          >
            <Download className="h-4 w-4 mr-2" />
            导出数据
          </button>
          
          <button 
            onClick={() => navigate('/admin/analytics')}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            统计报表
          </button>
          
          <button 
            onClick={() => navigate('/admin/user-behavior-analytics')}
            className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700"
          >
            <TrendingUp className="h-4 w-4 mr-2" />
            用户行为分析
          </button>
        </div>
      </div>

      {/* 筛选面板 */}
      {showFilters && (
        <div className="bg-white border rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">订单筛选</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                订单状态
              </label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">全部状态</option>
                <option value="pending">待处理</option>
                <option value="confirmed">已确认</option>
                <option value="shipped">已发货</option>
                <option value="delivered">已送达</option>
                <option value="cancelled">已取消</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                用户ID
              </label>
              <input
                type="text"
                value={filters.userId}
                onChange={(e) => handleFilterChange('userId', e.target.value)}
                placeholder="输入用户ID"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                搜索订单
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  placeholder="订单号、用户名..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 订单列表 */}
      <div className="bg-white border rounded-lg overflow-hidden">
        {/* 表格头部 */}
        <div className="bg-gray-50 px-6 py-3 grid grid-cols-12 gap-4 text-sm font-medium text-gray-700">
          <div className="col-span-2">订单信息</div>
          <div className="col-span-2">用户信息</div>
          <div className="col-span-2">金额</div>
          <div className="col-span-2">状态</div>
          <div className="col-span-2">时间</div>
          <div className="col-span-2">操作</div>
        </div>

        {/* 订单行 */}
        {orders.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">暂无订单</h3>
            <p className="text-gray-500">没有找到符合条件的订单</p>
          </div>
        ) : (
          orders.map((order) => (
            <div key={order._id} className="border-t px-6 py-4 grid grid-cols-12 gap-4 items-center text-sm">
              {/* 订单信息 */}
              <div className="col-span-2">
                <div className="font-medium">{order.orderNumber}</div>
                <div className="text-gray-500 text-xs">
                  {order.items.length} 件商品
                </div>
              </div>

              {/* 用户信息 */}
              <div className="col-span-2">
                {order.user ? (
                  <>
                    <div className="font-medium">{order.user.name}</div>
                    <div className="text-gray-500 text-xs">{order.user.email}</div>
                  </>
                ) : (
                  <div className="text-gray-500">用户已删除</div>
                )}
              </div>

              {/* 金额 */}
              <div className="col-span-2">
                <div className="font-medium text-green-600">
                  {formatCurrency(order.totalPrice)}
                </div>
              </div>

              {/* 状态 */}
              <div className="col-span-2">
                <div className="flex items-center space-x-2">
                  {getStatusIcon(order.status)}
                  <span className="font-medium">
                    {getStatusText(order.status)}
                  </span>
                </div>
              </div>

              {/* 时间 */}
              <div className="col-span-2">
                <div className="text-gray-600 text-xs">
                  {formatDate(order.createdAt)}
                </div>
              </div>

              {/* 操作 */}
              <div className="col-span-2">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setSelectedOrder(order)}
                    className="p-1 text-blue-600 hover:text-blue-800"
                    title="查看详情"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  
                  <select
                    value={order.status}
                    onChange={(e) => handleStatusUpdate(order._id, e.target.value)}
                    className="px-2 py-1 border border-gray-300 rounded text-xs focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="pending">待处理</option>
                    <option value="confirmed">已确认</option>
                    <option value="shipped">已发货</option>
                    <option value="delivered">已送达</option>
                    <option value="cancelled">已取消</option>
                  </select>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 分页控件 */}
      {pagination.totalPages > 1 && (
        <div className="flex justify-center items-center mt-6 space-x-2">
          <button
            onClick={() => handleFilterChange('page', filters.page - 1)}
            disabled={filters.page === 1}
            className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            上一页
          </button>
          
          <span className="text-sm text-gray-600">
            第 {filters.page} 页，共 {pagination.totalPages} 页
          </span>
          
          <button
            onClick={() => handleFilterChange('page', filters.page + 1)}
            disabled={filters.page === pagination.totalPages}
            className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            下一页
          </button>
        </div>
      )}

      {/* 订单详情模态框 */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold">订单详情</h3>
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              {/* 订单基本信息 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-medium">订单号:</label>
                  <p>{selectedOrder.orderNumber}</p>
                </div>
                <div>
                  <label className="font-medium">订单状态:</label>
                  <p>{getStatusText(selectedOrder.status)}</p>
                </div>
                <div>
                  <label className="font-medium">创建时间:</label>
                  <p>{formatDate(selectedOrder.createdAt)}</p>
                </div>
                <div>
                  <label className="font-medium">总金额:</label>
                  <p className="text-green-600 font-medium">
                    {formatCurrency(selectedOrder.totalPrice)}
                  </p>
                </div>
              </div>

              {/* 用户信息 */}
              {selectedOrder.user && (
                <div>
                  <label className="font-medium">用户信息:</label>
                  <p>{selectedOrder.user.name} ({selectedOrder.user.email})</p>
                </div>
              )}

              {/* 商品列表 */}
              <div>
                <label className="font-medium">商品清单:</label>
                <div className="mt-2 space-y-2">
                  {selectedOrder.items.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div className="flex items-center space-x-3">
                        {item.image && (
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-12 h-12 object-cover rounded"
                          />
                        )}
                        <div>
                          <p className="font-medium">{item.name}</p>
                          <p className="text-sm text-gray-500">
                            {formatCurrency(item.price)} × {item.quantity}
                          </p>
                        </div>
                      </div>
                      <p className="font-medium">
                        {formatCurrency(item.total)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* 收货信息 */}
              {selectedOrder.shippingAddress && (
                <div>
                  <label className="font-medium">收货信息:</label>
                  <div className="mt-2 p-3 bg-gray-50 rounded">
                    <p>{selectedOrder.shippingAddress.fullName}</p>
                    <p>{selectedOrder.shippingAddress.phone}</p>
                    <p>{selectedOrder.shippingAddress.address}</p>
                  </div>
                </div>
              )}

              {/* 支付信息 */}
              <div>
                <label className="font-medium">支付信息:</label>
                <div className="mt-2 p-3 bg-gray-50 rounded">
                  <p>支付方式: {selectedOrder.paymentMethod}</p>
                  {selectedOrder.isPaid && (
                    <p>支付时间: {formatDate(selectedOrder.paidAt)}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminOrdersPage;