import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  Package, 
  Download, 
  Settings, 
  Filter,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Info
} from 'lucide-react';
import { stockAlertAPI } from '../services/api';

const AdminStockAlertsPage = () => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statistics, setStatistics] = useState(null);
  const [filters, setFilters] = useState({
    alertType: 'all',
    page: 1,
    limit: 20
  });
  const [pagination, setPagination] = useState({});
  const [showFilters, setShowFilters] = useState(false);

  // 获取库存预警数据
  const fetchStockAlerts = async () => {
    try {
      setLoading(true);
      setError('');
      
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
      
      const response = await stockAlertAPI.getAlerts(params.toString());
      setAlerts(response.data);
      setPagination(response.pagination);
    } catch (err) {
      setError(err.response?.data?.error || '获取库存预警失败');
      console.error('获取库存预警失败:', err);
    } finally {
      setLoading(false);
    }
  };

  // 获取库存统计信息
  const fetchStatistics = async () => {
    try {
      const response = await stockAlertAPI.getStatistics();
      setStatistics(response.data);
    } catch (err) {
      console.error('获取库存统计失败:', err);
    }
  };

  useEffect(() => {
    fetchStockAlerts();
    fetchStatistics();
  }, [filters]);

  // 导出报告
  const handleExport = async () => {
    try {
      const response = await stockAlertAPI.exportReport(filters.alertType);
      
      // 创建下载链接
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `库存预警报告-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('导出报告失败:', err);
      alert('导出报告失败');
    }
  };

  // 处理筛选变化
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: 1 // 重置页码
    }));
  };

  // 获取库存状态图标和颜色
  const getStockStatusInfo = (status) => {
    switch (status) {
      case 'critical':
        return { icon: AlertCircle, color: 'text-red-600', bgColor: 'bg-red-100', label: '紧急缺货' };
      case 'low':
        return { icon: AlertTriangle, color: 'text-orange-600', bgColor: 'bg-orange-100', label: '库存不足' };
      case 'out-of-stock':
        return { icon: Info, color: 'text-gray-600', bgColor: 'bg-gray-100', label: '已缺货' };
      default:
        return { icon: CheckCircle, color: 'text-green-600', bgColor: 'bg-green-100', label: '库存正常' };
    }
  };

  if (loading && !alerts.length) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-white rounded-lg p-6 shadow">
                  <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
                  <div className="h-8 bg-gray-200 rounded w-3/4"></div>
                </div>
              ))}
            </div>
            <div className="bg-white rounded-lg p-6 shadow">
              <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="h-12 bg-gray-200 rounded mb-2"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* 头部 */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Package className="h-6 w-6" />
              库存预警管理
            </h1>
            <p className="text-gray-600 mt-1">监控和管理商品库存状态</p>
          </div>
          
          <div className="flex gap-2 mt-4 sm:mt-0">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              <Filter className="h-4 w-4" />
              筛选
            </button>
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Download className="h-4 w-4" />
              导出报告
            </button>
            <button
              onClick={() => {
                fetchStockAlerts();
                fetchStatistics();
              }}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              <RefreshCw className="h-4 w-4" />
              刷新
            </button>
          </div>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* 统计卡片 */}
        {statistics && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <div className="bg-white rounded-lg p-6 shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">总商品数</p>
                  <p className="text-2xl font-bold text-gray-900">{statistics.totalProducts}</p>
                </div>
                <Package className="h-8 w-8 text-blue-600" />
              </div>
            </div>

            <div className="bg-white rounded-lg p-6 shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">紧急缺货</p>
                  <p className="text-2xl font-bold text-red-600">{statistics.criticalStock}</p>
                </div>
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
            </div>

            <div className="bg-white rounded-lg p-6 shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">库存不足</p>
                  <p className="text-2xl font-bold text-orange-600">{statistics.lowStock}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-orange-600" />
              </div>
            </div>

            <div className="bg-white rounded-lg p-6 shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">库存健康度</p>
                  <p className="text-2xl font-bold text-green-600">{statistics.healthPercentage}%</p>
                </div>
                <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                  statistics.stockHealth === 'healthy' ? 'bg-green-100 text-green-600' :
                  statistics.stockHealth === 'warning' ? 'bg-orange-100 text-orange-600' :
                  'bg-red-100 text-red-600'
                }`}>
                  {statistics.stockHealth === 'healthy' ? '✓' : 
                   statistics.stockHealth === 'warning' ? '!' : '✗'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 筛选面板 */}
        {showFilters && (
          <div className="bg-white rounded-lg p-6 shadow mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">筛选条件</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  预警类型
                </label>
                <select
                  value={filters.alertType}
                  onChange={(e) => handleFilterChange('alertType', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">全部预警</option>
                  <option value="critical">紧急缺货</option>
                  <option value="low">库存不足</option>
                  <option value="out-of-stock">已缺货</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  每页显示
                </label>
                <select
                  value={filters.limit}
                  onChange={(e) => handleFilterChange('limit', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={10}>10条</option>
                  <option value={20}>20条</option>
                  <option value={50}>50条</option>
                  <option value={100}>100条</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* 预警列表 */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              库存预警列表 ({pagination.totalItems || 0} 条记录)
            </h3>
          </div>

          {alerts.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">暂无库存预警信息</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        商品信息
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        库存状态
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        当前库存
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        预警阈值
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        分类
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {alerts.map((alert) => {
                      const statusInfo = getStockStatusInfo(alert.stockStatus);
                      const StatusIcon = statusInfo.icon;
                      
                      return (
                        <tr key={alert._id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div className="flex items-center">
                              <img
                                src={alert.image || '/images/default-product.jpg'}
                                alt={alert.name}
                                className="h-10 w-10 rounded object-cover mr-3"
                              />
                              <div>
                                <p className="font-medium text-gray-900">{alert.name}</p>
                                <p className="text-sm text-gray-500">¥{alert.price}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusInfo.bgColor} ${statusInfo.color}`}>
                              <StatusIcon className="h-4 w-4 mr-1" />
                              {statusInfo.label}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`font-medium ${
                              alert.stockStatus === 'critical' ? 'text-red-600' :
                              alert.stockStatus === 'low' ? 'text-orange-600' :
                              'text-gray-600'
                            }`}>
                              {alert.stock}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            <div>预警: {alert.lowStockThreshold}</div>
                            <div>紧急: {alert.criticalStockThreshold}</div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {alert.category}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* 分页 */}
              {pagination.totalPages > 1 && (
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-700">
                      显示第 {(pagination.current - 1) * pagination.itemsPerPage + 1} 至{' '}
                      {Math.min(pagination.current * pagination.itemsPerPage, pagination.totalItems)} 条，
                      共 {pagination.totalItems} 条
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleFilterChange('page', pagination.current - 1)}
                        disabled={pagination.current === 1}
                        className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        上一页
                      </button>
                      <span className="px-3 py-1 bg-blue-600 text-white rounded text-sm">
                        {pagination.current}
                      </span>
                      <button
                        onClick={() => handleFilterChange('page', pagination.current + 1)}
                        disabled={pagination.current === pagination.totalPages}
                        className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed"
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
    </div>
  );
};

export default AdminStockAlertsPage;