import React, { useState, useEffect } from 'react';
import { orderAPI } from '../services/api';
import { 
  BarChart3, 
  DollarSign, 
  Package, 
  Users, 
  TrendingUp, 
  Calendar,
  Loader,
  Download,
  Filter
} from 'lucide-react';

const AnalyticsPage = () => {
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    period: 'month' // day, week, month, year
  });

  useEffect(() => {
    fetchAnalyticsData();
  }, [filters]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      const result = await orderAPI.getAnalytics(filters);
      if (result.success) {
        setAnalyticsData(result.data);
      } else {
        setError(result.error || '获取统计数据失败');
      }
    } catch (err) {
      console.error('获取统计数据失败:', err);
      setError(err.response?.data?.error || '获取统计数据失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleExportAnalytics = async () => {
    try {
      const response = await orderAPI.exportAnalytics(filters);
      
      // 创建下载链接
      const blob = new Blob([response], { type: 'text/csv;charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `analytics-export-${new Date().getTime()}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      alert('统计数据导出成功！');
    } catch (err) {
      console.error('导出统计数据失败:', err);
      alert('导出统计数据失败，请稍后重试');
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY'
    }).format(amount);
  };

  const formatNumber = (number) => {
    return new Intl.NumberFormat('zh-CN').format(number);
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <Loader className="h-8 w-8 text-primary-600 animate-spin mr-3" />
          <span className="text-gray-600">加载统计数据中...</span>
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
          <BarChart3 className="h-8 w-8 text-primary-600" />
          <h1 className="text-2xl font-bold text-gray-900">订单统计分析</h1>
        </div>
        
        <div className="flex items-center space-x-4">
          <button
            onClick={handleExportAnalytics}
            className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700"
          >
            <Download className="h-4 w-4 mr-2" />
            导出报表
          </button>
        </div>
      </div>

      {/* 筛选面板 */}
      <div className="bg-white border rounded-lg p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Filter className="h-5 w-5 mr-2" />
          筛选条件
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              时间范围
            </label>
            <select
              value={filters.period}
              onChange={(e) => handleFilterChange('period', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="day">日</option>
              <option value="week">周</option>
              <option value="month">月</option>
              <option value="year">年</option>
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-primary-500 focus:border-primary-500"
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          
          <div className="flex items-end">
            <button
              onClick={fetchAnalyticsData}
              className="px-4 py-2 bg-primary-600 text-white rounded-md text-sm font-medium hover:bg-primary-700"
            >
              应用筛选
            </button>
          </div>
        </div>
      </div>

      {analyticsData && (
        <>
          {/* 关键指标卡片 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white border rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">总销售额</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(analyticsData.totalRevenue || 0)}
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-green-600" />
              </div>
              <div className="mt-2">
                <span className="text-sm text-green-600">
                  +{analyticsData.revenueGrowth || 0}% 增长
                </span>
              </div>
            </div>

            <div className="bg-white border rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">总订单数</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatNumber(analyticsData.totalOrders || 0)}
                  </p>
                </div>
                <Package className="h-8 w-8 text-blue-600" />
              </div>
              <div className="mt-2">
                <span className="text-sm text-blue-600">
                  +{analyticsData.orderGrowth || 0}% 增长
                </span>
              </div>
            </div>

            <div className="bg-white border rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">平均订单价值</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(analyticsData.averageOrderValue || 0)}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-purple-600" />
              </div>
              <div className="mt-2">
                <span className="text-sm text-purple-600">
                  +{analyticsData.aovGrowth || 0}% 增长
                </span>
              </div>
            </div>

            <div className="bg-white border rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">客户数</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatNumber(analyticsData.totalCustomers || 0)}
                  </p>
                </div>
                <Users className="h-8 w-8 text-orange-600" />
              </div>
              <div className="mt-2">
                <span className="text-sm text-orange-600">
                  +{analyticsData.customerGrowth || 0}% 增长
                </span>
              </div>
            </div>
          </div>

          {/* 订单状态分布 */}
          <div className="bg-white border rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4">订单状态分布</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {analyticsData.statusDistribution && Object.entries(analyticsData.statusDistribution).map(([status, count]) => (
                <div key={status} className="text-center">
                  <p className="text-2xl font-bold text-primary-600">{count}</p>
                  <p className="text-sm text-gray-600 capitalize">{status}</p>
                </div>
              ))}
            </div>
          </div>

          {/* 销售趋势 */}
          <div className="bg-white border rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4">销售趋势</h3>
            {analyticsData.revenueTrend && analyticsData.revenueTrend.length > 0 ? (
              <div className="space-y-4">
                {analyticsData.revenueTrend.map((item, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">{item.period}</span>
                    <span className="text-sm font-medium text-gray-900">
                      {formatCurrency(item.revenue)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">暂无销售数据</p>
            )}
          </div>

          {/* 热门商品 */}
          <div className="bg-white border rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">热门商品</h3>
            {analyticsData.topProducts && analyticsData.topProducts.length > 0 ? (
              <div className="space-y-3">
                {analyticsData.topProducts.map((product, index) => (
                  <div key={product._id} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span className="text-sm font-medium text-gray-600">{index + 1}.</span>
                      <span className="text-sm text-gray-900">{product.name}</span>
                    </div>
                    <span className="text-sm font-medium text-primary-600">
                      {formatNumber(product.quantity)} 件
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">暂无商品销售数据</p>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default AnalyticsPage;