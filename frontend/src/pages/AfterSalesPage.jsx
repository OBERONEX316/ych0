import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Package,
  MessageSquare,
  Eye,
  Download,
  ArrowLeft,
  Calendar,
  DollarSign,
  User,
  Truck,
  Plus
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import { getUserRefunds, addCommunication } from '../services/refundAPI';
import { useLocation } from 'react-router-dom';
import RefundRequestPage from './RefundRequestPage';

const AfterSalesPage = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [refunds, setRefunds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRefund, setSelectedRefund] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showRefundForm, setShowRefundForm] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  // 退款状态配置
  const statusConfig = {
    pending: { label: '待处理', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
    processing: { label: '处理中', color: 'bg-blue-100 text-blue-800', icon: AlertCircle },
    approved: { label: '已批准', color: 'bg-green-100 text-green-800', icon: CheckCircle },
    rejected: { label: '已拒绝', color: 'bg-red-100 text-red-800', icon: XCircle },
    completed: { label: '已完成', color: 'bg-gray-100 text-gray-800', icon: CheckCircle },
    cancelled: { label: '已取消', color: 'bg-gray-100 text-gray-800', icon: XCircle }
  };

  // 获取退款数据
  const fetchRefunds = async () => {
    try {
      setLoading(true);
      const response = await getUserRefunds();
      setRefunds(response.data.refunds || []);
    } catch (error) {
      console.error('获取退款数据失败:', error);
      toast.error('获取退款数据失败，请重试');
      setRefunds([]);
    } finally {
      setLoading(false);
    }
  };

  // 处理退款申请成功
  const handleRefundSuccess = (refund) => {
    setShowRefundForm(false);
    setSelectedOrder(null);
    toast.success('退款申请提交成功！');
    fetchRefunds();
  };

  // 关闭退款表单
  const handleCloseRefundForm = () => {
    setShowRefundForm(false);
    setSelectedOrder(null);
  };

  useEffect(() => {
    fetchRefunds();
    
    // 检查是否有从订单页面传递过来的选中的订单
    if (location.state?.selectedOrder) {
      setSelectedOrder(location.state.selectedOrder);
      setShowRefundForm(true);
    }
  }, []);

  // 过滤退款
  const filteredRefunds = refunds.filter(refund => {
    const matchesStatus = statusFilter === 'all' || refund.status === statusFilter;
    const matchesSearch = searchTerm === '' || 
      refund.refundNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      refund.order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      refund.reason.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesStatus && matchesSearch;
  });

  // 获取统计信息
  const stats = {
    total: refunds.length,
    pending: refunds.filter(r => r.status === 'pending').length,
    processing: refunds.filter(r => r.status === 'processing').length,
    completed: refunds.filter(r => ['approved', 'completed'].includes(r.status)).length
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">加载退款数据中...</p>
        </div>
      </div>
    );
  }

  if (selectedRefund) {
    return (
      <RefundDetail 
        refund={selectedRefund} 
        onBack={() => setSelectedRefund(null)}
        onStatusUpdate={fetchRefunds}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {showRefundForm && selectedOrder ? (
        <RefundRequestPage 
          order={selectedOrder}
          onClose={handleCloseRefundForm}
          onSuccess={handleRefundSuccess}
        />
      ) : (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 页面标题 */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">售后管理</h1>
            <p className="text-gray-600">管理您的退款和售后申请</p>
          </div>
          <button
            onClick={() => setShowRefundForm(true)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-5 w-5 mr-2" />
            申请退款
          </button>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Package className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">总退款数</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">待处理</p>
                <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <AlertCircle className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">处理中</p>
                <p className="text-2xl font-bold text-gray-900">{stats.processing}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">已完成</p>
                <p className="text-2xl font-bold text-gray-900">{stats.completed}</p>
              </div>
            </div>
          </div>
        </div>

        {/* 搜索和过滤 */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="p-6">
            <div className="flex flex-col sm:flex-row gap-4 mb-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="搜索退款单号、订单号或原因..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <Filter className="h-5 w-5 mr-2" />
                筛选
              </button>
            </div>

            {showFilters && (
              <div className="border-t pt-4">
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setStatusFilter('all')}
                    className={`px-3 py-1 rounded-full text-sm ${
                      statusFilter === 'all' 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    全部
                  </button>
                  {Object.entries(statusConfig).map(([key, config]) => (
                    <button
                      key={key}
                      onClick={() => setStatusFilter(key)}
                      className={`px-3 py-1 rounded-full text-sm ${
                        statusFilter === key 
                          ? 'bg-blue-500 text-white' 
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {config.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 退款列表 */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">退款申请</h2>
          </div>
          
          {filteredRefunds.length === 0 ? (
            <div className="p-12 text-center">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">暂无退款申请</h3>
              <p className="text-gray-600">您还没有任何退款申请</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredRefunds.map((refund) => {
                const status = statusConfig[refund.status];
                const StatusIcon = status.icon;
                
                return (
                  <div key={refund._id} className="p-6 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center mb-2">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {status.label}
                          </span>
                          <span className="ml-3 text-sm text-gray-500">#{refund.refundNumber}</span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-gray-500">订单号</p>
                            <p className="font-medium">{refund.order.orderNumber}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">申请时间</p>
                            <p className="font-medium">
                              {new Date(refund.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-500">退款金额</p>
                            <p className="font-medium text-red-600">¥{refund.amount.toFixed(2)}</p>
                          </div>
                        </div>
                        
                        <div className="mt-2">
                          <p className="text-gray-500 text-sm">退款原因</p>
                          <p className="text-gray-900">{refund.reason}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setSelectedRefund(refund)}
                          className="flex items-center px-3 py-1 text-sm text-blue-600 hover:text-blue-800"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          详情
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    )}
    </div>
  );
};

// 退款详情组件
const RefundDetail = ({ refund, onBack, onStatusUpdate }) => {
  const [newMessage, setNewMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const addCommunication = async (type, message) => {
    try {
      const response = await fetch(`/api/refunds/${refund._id}/communicate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ type, message })
      });
      
      if (response.ok) {
        toast.success('消息发送成功');
        onStatusUpdate();
      } else {
        throw new Error('发送消息失败');
      }
    } catch (error) {
      console.error('发送消息失败:', error);
      toast.error('发送消息失败，请重试');
    }
  };

  const handleSubmitMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    
    setSubmitting(true);
    await addCommunication('user', newMessage);
    setNewMessage('');
    setSubmitting(false);
  };

  const statusConfig = {
    pending: { label: '待处理', color: 'bg-yellow-100 text-yellow-800' },
    processing: { label: '处理中', color: 'bg-blue-100 text-blue-800' },
    approved: { label: '已批准', color: 'bg-green-100 text-green-800' },
    rejected: { label: '已拒绝', color: 'bg-red-100 text-red-800' },
    completed: { label: '已完成', color: 'bg-gray-100 text-gray-800' },
    cancelled: { label: '已取消', color: 'bg-gray-100 text-gray-800' }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 返回按钮 */}
        <button
          onClick={onBack}
          className="flex items-center text-blue-600 hover:text-blue-800 mb-6"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          返回列表
        </button>

        {/* 退款详情 */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">退款详情</h2>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusConfig[refund.status].color}`}>
                {statusConfig[refund.status].label}
              </span>
            </div>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">基本信息</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">退款单号:</span>
                    <span className="font-medium">#{refund.refundNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">订单号:</span>
                    <span className="font-medium">{refund.order.orderNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">申请时间:</span>
                    <span className="font-medium">
                      {new Date(refund.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">退款金额:</span>
                    <span className="font-medium text-red-600">¥{refund.amount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">退款类型:</span>
                    <span className="font-medium">
                      {refund.type === 'full' ? '全额退款' : '部分退款'}
                    </span>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">退款原因</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-gray-900">{refund.reason}</p>
                  {refund.description && (
                    <p className="text-gray-600 mt-2">{refund.description}</p>
                  )}
                </div>
              </div>
            </div>

            {/* 退款商品 */}
            {refund.items && refund.items.length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">退款商品</h3>
                <div className="space-y-3">
                  {refund.items.map((item, index) => (
                    <div key={index} className="flex items-center justify-between bg-gray-50 rounded-lg p-4">
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-gray-600">数量: {item.quantity}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">¥{item.price.toFixed(2)}</p>
                        <p className="text-sm text-gray-600">小计: ¥{item.total.toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 退货物流信息 */}
            {refund.returnShipping?.trackingNumber && (
              <div className="mt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">退货物流</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{refund.returnShipping.carrier}</p>
                      <p className="text-sm text-gray-600">运单号: {refund.returnShipping.trackingNumber}</p>
                    </div>
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                      {refund.returnShipping.status === 'pending' && '待发货'}
                      {refund.returnShipping.status === 'shipped' && '已发货'}
                      {refund.returnShipping.status === 'received' && '已收货'}
                      {refund.returnShipping.status === 'inspected' && '已检验'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 沟通记录 */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">沟通记录</h3>
          </div>
          
          <div className="p-6">
            <div className="space-y-4 mb-6 max-h-96 overflow-y-auto">
              {refund.communications && refund.communications.length > 0 ? (
                refund.communications.map((comm, index) => (
                  <div key={index} className={`flex ${comm.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      comm.type === 'user' 
                        ? 'bg-blue-500 text-white' 
                        : comm.type === 'admin'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      <p className="text-sm">{comm.message}</p>
                      <p className="text-xs opacity-70 mt-1">
                        {new Date(comm.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-gray-500 py-8">暂无沟通记录</p>
              )}
            </div>
            
            {/* 发送消息表单 */}
            <form onSubmit={handleSubmitMessage} className="border-t pt-4">
              <div className="flex space-x-3">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="输入您的消息..."
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  type="submit"
                  disabled={submitting || !newMessage.trim()}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? '发送中...' : '发送'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AfterSalesPage;