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
  TrendingUp,
  BarChart3,
  PieChart
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import { getAllRefunds, processRefund, completeRefund, getRefundStats, addCommunication } from '../services/refundAPI';

const AdminAfterSalesPage = () => {
  const { user } = useAuth();
  const [refunds, setRefunds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRefund, setSelectedRefund] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [stats, setStats] = useState(null);
  const [activeTab, setActiveTab] = useState('list');
  const [newMessage, setNewMessage] = useState('');

  // 退款状态配置
  const statusConfig = {
    pending: { label: '待处理', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
    processing: { label: '处理中', color: 'bg-blue-100 text-blue-800', icon: AlertCircle },
    approved: { label: '已批准', color: 'bg-green-100 text-green-800', icon: CheckCircle },
    rejected: { label: '已拒绝', color: 'bg-red-100 text-red-800', icon: XCircle },
    completed: { label: '已完成', color: 'bg-gray-100 text-gray-800', icon: CheckCircle },
    cancelled: { label: '已取消', color: 'bg-gray-100 text-gray-800', icon: XCircle }
  };

  // 获取退款数据和统计
  const fetchRefunds = async () => {
    try {
      setLoading(true);
      const [refundsResponse, statsResponse] = await Promise.all([
        getAllRefunds(),
        getRefundStats()
      ]);
      setRefunds(refundsResponse.data.refunds || []);
      setStats(statsResponse.data);
    } catch (error) {
      console.error('获取退款数据失败:', error);
      toast.error('获取退款数据失败，请重试');
      setRefunds([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRefunds();
  }, []);

  // 过滤退款
  const filteredRefunds = refunds.filter(refund => {
    const matchesStatus = statusFilter === 'all' || refund.status === statusFilter;
    const matchesSearch = searchTerm === '' || 
      refund.refundNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      refund.order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      refund.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      refund.reason.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesStatus && matchesSearch;
  });

  // 处理退款申请
  const handleProcessRefund = async (refundId, action, rejectionReason = null) => {
    try {
      const result = await processRefund(refundId, action, rejectionReason);
      toast.success(result.message);
      fetchRefunds();
      if (selectedRefund && selectedRefund._id === refundId) {
        setSelectedRefund(result.data);
      }
    } catch (error) {
      console.error('处理退款申请失败:', error);
      toast.error(error.message || '处理退款申请失败');
    }
  };

  // 完成退款处理
  const handleCompleteRefund = async (refundId) => {
    try {
      const result = await completeRefund(refundId);
      toast.success(result.message);
      fetchRefunds();
      if (selectedRefund && selectedRefund._id === refundId) {
        setSelectedRefund(result.data);
      }
    } catch (error) {
      console.error('完成退款处理失败:', error);
      toast.error(error.message || '完成退款处理失败');
    }
  };

  // 添加沟通记录
  const handleAddCommunication = async (refundId) => {
    if (!newMessage.trim()) return;
    
    try {
      const result = await addCommunication(refundId, newMessage);
      toast.success('沟通记录添加成功');
      setNewMessage('');
      if (selectedRefund && selectedRefund._id === refundId) {
        setSelectedRefund(result.data);
      }
    } catch (error) {
      console.error('添加沟通记录失败:', error);
      toast.error(error.message || '添加沟通记录失败');
    }
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
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          {/* 返回按钮 */}
          <div className="mb-6">
            <button
              onClick={() => setSelectedRefund(null)}
              className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              返回列表
            </button>
          </div>

          {/* 退款详情 */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-6 border-b">
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">退款详情</h1>
                  <p className="text-gray-600">退款单号: {selectedRefund.refundNumber}</p>
                </div>
                <div className="flex items-center space-x-2">
                  {React.createElement(statusConfig[selectedRefund.status].icon, { className: "h-5 w-5" })}
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusConfig[selectedRefund.status].color}`}>
                    {statusConfig[selectedRefund.status].label}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-6">
              {/* 基本信息 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">用户信息</h3>
                  <div className="space-y-2">
                    <p><span className="font-medium">用户姓名:</span> {selectedRefund.user.name}</p>
                    <p><span className="font-medium">联系电话:</span> {selectedRefund.user.phone}</p>
                    <p><span className="font-medium">邮箱:</span> {selectedRefund.user.email}</p>
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">订单信息</h3>
                  <div className="space-y-2">
                    <p><span className="font-medium">订单号:</span> {selectedRefund.order.orderNumber}</p>
                    <p><span className="font-medium">订单金额:</span> ¥{selectedRefund.order.finalPrice}</p>
                    <p><span className="font-medium">支付方式:</span> {selectedRefund.paymentMethod}</p>
                  </div>
                </div>
              </div>

              {/* 退款信息 */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">退款信息</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <p><span className="font-medium">退款类型:</span> {selectedRefund.type === 'full' ? '全额退款' : '部分退款'}</p>
                    <p><span className="font-medium">退款金额:</span> ¥{selectedRefund.amount}</p>
                    <p><span className="font-medium">退款原因:</span> {selectedRefund.reason}</p>
                  </div>
                  <div>
                    <p><span className="font-medium">申请时间:</span> {new Date(selectedRefund.createdAt).toLocaleString()}</p>
                    {selectedRefund.processedAt && (
                      <p><span className="font-medium">处理时间:</span> {new Date(selectedRefund.processedAt).toLocaleString()}</p>
                    )}
                    {selectedRefund.processedBy && (
                      <p><span className="font-medium">处理人:</span> {selectedRefund.processedBy.name}</p>
                    )}
                  </div>
                </div>
                {selectedRefund.description && (
                  <div className="mt-3">
                    <p><span className="font-medium">详细描述:</span></p>
                    <p className="text-gray-700 mt-1">{selectedRefund.description}</p>
                  </div>
                )}
                {selectedRefund.rejectionReason && (
                  <div className="mt-3">
                    <p><span className="font-medium">拒绝原因:</span></p>
                    <p className="text-red-600 mt-1">{selectedRefund.rejectionReason}</p>
                  </div>
                )}
              </div>

              {/* 退款商品 */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">退款商品</h3>
                <div className="space-y-3">
                  {selectedRefund.items.map((item, index) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-gray-600">数量: {item.quantity}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">¥{item.price}</p>
                        <p className="text-sm text-gray-600">小计: ¥{item.total}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 沟通记录 */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">沟通记录</h3>
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {selectedRefund.communications.map((comm, index) => (
                    <div key={index} className={`p-3 rounded-lg ${
                      comm.type === 'user' ? 'bg-blue-50 border-l-4 border-blue-400' :
                      comm.type === 'admin' ? 'bg-green-50 border-l-4 border-green-400' :
                      'bg-gray-50 border-l-4 border-gray-400'
                    }`}>
                      <div className="flex justify-between items-start mb-2">
                        <span className={`font-medium ${
                          comm.type === 'user' ? 'text-blue-800' :
                          comm.type === 'admin' ? 'text-green-800' :
                          'text-gray-800'
                        }`}>
                          {comm.type === 'user' ? '用户' : comm.type === 'admin' ? '管理员' : '系统'}
                        </span>
                        <span className="text-sm text-gray-500">
                          {new Date(comm.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-gray-700">{comm.message}</p>
                    </div>
                  ))}
                </div>
                
                {/* 添加沟通记录 */}
                <div className="mt-4">
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="输入沟通内容..."
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <button
                      onClick={() => handleAddCommunication(selectedRefund._id)}
                      disabled={!newMessage.trim()}
                      className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      发送
                    </button>
                  </div>
                </div>
              </div>

              {/* 操作按钮 */}
              {selectedRefund.status === 'pending' && (
                <div className="flex space-x-4">
                  <button
                    onClick={() => handleProcessRefund(selectedRefund._id, 'approve')}
                    className="flex-1 px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                  >
                    批准退款
                  </button>
                  <button
                    onClick={() => {
                      const reason = prompt('请输入拒绝原因:');
                      if (reason) {
                        handleProcessRefund(selectedRefund._id, 'reject', reason);
                      }
                    }}
                    className="flex-1 px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                  >
                    拒绝退款
                  </button>
                </div>
              )}
              
              {selectedRefund.status === 'approved' && (
                <button
                  onClick={() => {
                    if (confirm('确认完成退款处理吗？')) {
                      handleCompleteRefund(selectedRefund._id);
                    }
                  }}
                  className="w-full px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  完成退款处理
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">售后管理</h1>
          <p className="text-gray-600">管理和处理用户的退款申请</p>
        </div>

        {/* 统计卡片 */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">总退款申请</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalRefunds}</p>
                </div>
                <BarChart3 className="h-8 w-8 text-blue-500" />
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">待处理</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {stats.stats.find(s => s._id === 'pending')?.count || 0}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-yellow-500" />
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">已批准</p>
                  <p className="text-2xl font-bold text-green-600">
                    {stats.stats.find(s => s._id === 'approved')?.count || 0}
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">退款总额</p>
                  <p className="text-2xl font-bold text-red-600">¥{stats.totalAmount.toLocaleString()}</p>
                </div>
                <DollarSign className="h-8 w-8 text-red-500" />
              </div>
            </div>
          </div>
        )}

        {/* 搜索和过滤 */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="搜索退款单号、订单号、用户姓名或原因..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Filter className="h-5 w-5 mr-2" />
              筛选
            </button>
          </div>

          {showFilters && (
            <div className="mt-4 pt-4 border-t">
              <div className="flex flex-wrap gap-2">
                {['all', 'pending', 'processing', 'approved', 'rejected', 'completed'].map(status => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                      statusFilter === status
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {status === 'all' ? '全部' : statusConfig[status].label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 退款列表 */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold text-gray-900">退款申请列表</h2>
            <p className="text-gray-600 mt-1">共 {filteredRefunds.length} 条记录</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">退款单号</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">用户信息</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">订单信息</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">退款金额</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">申请时间</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredRefunds.map(refund => (
                  <tr key={refund._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{refund.refundNumber}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{refund.user.name}</div>
                      <div className="text-sm text-gray-500">{refund.user.phone}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{refund.order.orderNumber}</div>
                      <div className="text-sm text-gray-500">¥{refund.order.finalPrice}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">¥{refund.amount}</div>
                      <div className="text-sm text-gray-500">{refund.type === 'full' ? '全额' : '部分'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConfig[refund.status].color}`}>
                        {React.createElement(statusConfig[refund.status].icon, { className: "h-3 w-3 mr-1" })}
                        {statusConfig[refund.status].label}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(refund.createdAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => setSelectedRefund(refund)}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                      >
                        查看详情
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredRefunds.length === 0 && (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">暂无退款申请记录</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminAfterSalesPage;