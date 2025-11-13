import React, { useState, useEffect } from 'react';
import { 
  ArrowUp, 
  ArrowDown, 
  Clock, 
  ShoppingCart, 
  Star,
  MessageSquare,
  UserPlus,
  Gift,
  Calendar,
  Loader,
  AlertCircle,
  Search
} from 'lucide-react';
import { pointsAPI } from '../services/api';

const PointsHistoryPage = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    page: 1,
    limit: 20,
    type: '',
    startDate: '',
    endDate: ''
  });
  const [pagination, setPagination] = useState({});

  useEffect(() => {
    fetchPointsHistory();
  }, [filters]);

  const fetchPointsHistory = async () => {
    try {
      setLoading(true);
      const params = {
        page: filters.page,
        limit: filters.limit,
        ...(filters.type && { type: filters.type }),
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate })
      };

      const response = await pointsAPI.getPointsHistory(params);
      setTransactions(response.transactions || []);
      setPagination(response.pagination || {});
    } catch (err) {
      console.error('获取积分历史失败:', err);
      setError(err.response?.data?.error || '获取积分历史失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const getTransactionIcon = (type) => {
    switch (type) {
      case 'earn': return <ArrowUp className="h-5 w-5 text-green-500" />;
      case 'spend': return <ArrowDown className="h-5 w-5 text-red-500" />;
      case 'expire': return <Clock className="h-5 w-5 text-gray-500" />;
      case 'adjust': return <Gift className="h-5 w-5 text-blue-500" />;
      default: return <Star className="h-5 w-5 text-gray-500" />;
    }
  };

  const getTransactionColor = (type) => {
    switch (type) {
      case 'earn': return 'text-green-600 bg-green-100';
      case 'spend': return 'text-red-600 bg-red-100';
      case 'expire': return 'text-gray-600 bg-gray-100';
      case 'adjust': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getTransactionReasonIcon = (reason) => {
    switch (reason) {
      case 'purchase': return <ShoppingCart className="h-4 w-4" />;
      case 'review': return <MessageSquare className="h-4 w-4" />;
      case 'registration': return <UserPlus className="h-4 w-4" />;
      case 'birthday': return <Gift className="h-4 w-4" />;
      case 'referral': return <UserPlus className="h-4 w-4" />;
      case 'daily_login': return <Calendar className="h-4 w-4" />;
      default: return <Star className="h-4 w-4" />;
    }
  };

  const getTransactionReasonText = (reason) => {
    const reasonMap = {
      purchase: '购物消费',
      review: '商品评价',
      registration: '注册奖励',
      birthday: '生日奖励',
      referral: '推荐好友',
      daily_login: '每日登录',
      admin_adjust: '管理员调整',
      points_expired: '积分过期',
      points_used: '积分使用'
    };
    return reasonMap[reason] || reason;
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: 1 // 重置页码
    }));
  };

  const handlePageChange = (page) => {
    setFilters(prev => ({ ...prev, page }));
  };

  if (loading && transactions.length === 0) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (error && transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <AlertCircle className="h-12 w-12 text-red-400 mb-4" />
        <p className="text-gray-600 mb-4">{error}</p>
        <button
          onClick={fetchPointsHistory}
          className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
        >
          重新加载
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">积分历史</h1>
        <p className="text-gray-600">查看您的积分获取、消费和过期记录</p>
      </div>

      {/* 筛选器 */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              交易类型
            </label>
            <select
              value={filters.type}
              onChange={(e) => handleFilterChange('type', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">全部类型</option>
              <option value="earn">获得积分</option>
              <option value="spend">消费积分</option>
              <option value="expire">积分过期</option>
              <option value="adjust">积分调整</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              开始日期
            </label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              结束日期
            </label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={fetchPointsHistory}
              className="w-full px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 flex items-center justify-center"
            >
              <Search className="h-4 w-4 mr-2" />
              搜索
            </button>
          </div>
        </div>
      </div>

      {/* 交易列表 */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {transactions.length === 0 ? (
          <div className="text-center py-12">
            <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">暂无积分交易记录</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      交易详情
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      积分变化
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      余额
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      时间
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {transactions.map((transaction) => (
                    <tr key={transaction._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            {getTransactionIcon(transaction.type)}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {getTransactionReasonText(transaction.reason)}
                            </div>
                            <div className="text-sm text-gray-500">
                              {transaction.description}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTransactionColor(transaction.type)}`}>
                          {transaction.type === 'earn' ? '+' : ''}
                          {transaction.amount?.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {transaction.balanceAfter?.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {new Date(transaction.createdAt).toLocaleString('zh-CN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 分页 */}
            {pagination.totalPages > 1 && (
              <div className="bg-white px-6 py-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    显示第 {pagination.currentPage} 页，共 {pagination.totalPages} 页
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handlePageChange(pagination.currentPage - 1)}
                      disabled={pagination.currentPage === 1}
                      className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                      上一页
                    </button>
                    <button
                      onClick={() => handlePageChange(pagination.currentPage + 1)}
                      disabled={pagination.currentPage === pagination.totalPages}
                      className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                      下一页
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default PointsHistoryPage;