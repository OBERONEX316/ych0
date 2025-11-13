import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Settings, RefreshCw, Download, Filter, Search } from 'lucide-react';
import salesPredictionAPI from '../services/salesPredictionAPI';
import { toast } from 'sonner';

const AdminSalesPredictionPage = () => {
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generatingBulk, setGeneratingBulk] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('monthly');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [algorithmFilter, setAlgorithmFilter] = useState('all');

  useEffect(() => {
    fetchAllPredictions();
  }, [selectedPeriod]);

  const fetchAllPredictions = async () => {
    try {
      setLoading(true);
      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 6); // Last 6 months

      const response = await salesPredictionAPI.getPredictionsByPeriod(
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0],
        selectedPeriod
      );
      setPredictions(response.data);
    } catch (error) {
      console.error('Failed to fetch predictions:', error);
      toast.error('获取预测数据失败');
    } finally {
      setLoading(false);
    }
  };

  const generateBulkPredictions = async () => {
    try {
      setGeneratingBulk(true);
      // This would need to be implemented with actual product IDs
      const productIds = ['product1', 'product2', 'product3']; // Example IDs
      const response = await salesPredictionAPI.bulkGeneratePredictions(productIds, selectedPeriod);
      toast.success(`批量生成完成，成功 ${response.data.successful.length} 个`);
      fetchAllPredictions();
    } catch (error) {
      toast.error('批量生成失败');
    } finally {
      setGeneratingBulk(false);
    }
  };

  const updatePredictionResults = async (predictionId, actualQuantity, actualRevenue) => {
    try {
      await salesPredictionAPI.updatePredictionResults(predictionId, actualQuantity, actualRevenue);
      toast.success('更新预测结果成功');
      fetchAllPredictions();
    } catch (error) {
      toast.error('更新失败');
    }
  };

  const filteredPredictions = predictions.filter(prediction => {
    const matchesSearch = prediction.productId?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         prediction.productId?.category?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || prediction.status === statusFilter;
    const matchesAlgorithm = algorithmFilter === 'all' || prediction.algorithmUsed === algorithmFilter;
    
    return matchesSearch && matchesStatus && matchesAlgorithm;
  });

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY'
    }).format(amount);
  };

  const formatNumber = (number) => {
    return new Intl.NumberFormat('zh-CN').format(number);
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 0.9) return 'text-green-600 bg-green-100';
    if (confidence >= 0.8) return 'text-blue-600 bg-blue-100';
    if (confidence >= 0.7) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">销售预测管理</h1>
          <p className="text-gray-600">管理和分析所有销售预测数据</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={fetchAllPredictions}
            className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            刷新
          </button>
          <button
            onClick={generateBulkPredictions}
            disabled={generatingBulk}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            <BarChart3 className={`w-4 h-4 mr-2 ${generatingBulk ? 'animate-spin' : ''}`} />
            批量生成
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">预测周期</label>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="daily">日报</option>
              <option value="weekly">周报</option>
              <option value="monthly">月报</option>
              <option value="quarterly">季报</option>
              <option value="yearly">年报</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">搜索产品</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="搜索产品名称或分类..."
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">状态</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">全部</option>
              <option value="active">活跃</option>
              <option value="completed">已完成</option>
              <option value="failed">失败</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">算法</label>
            <select
              value={algorithmFilter}
              onChange={(e) => setAlgorithmFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">全部</option>
              <option value="linear_regression">线性回归</option>
              <option value="time_series">时间序列</option>
              <option value="seasonal_decomposition">季节分解</option>
              <option value="machine_learning">机器学习</option>
              <option value="ensemble">集成学习</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
                setAlgorithmFilter('all');
              }}
              className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
            >
              清除筛选
            </button>
          </div>
        </div>
      </div>

      {/* Predictions Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            预测列表 ({filteredPredictions.length})
          </h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  产品
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  预测日期
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  预测数量
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  预测收入
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  置信度
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  算法
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  状态
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredPredictions.map((prediction) => (
                <tr key={prediction._id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {prediction.productId?.name || '未知产品'}
                    </div>
                    <div className="text-sm text-gray-500">
                      {prediction.productId?.category || '未分类'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(prediction.predictionDate).toLocaleDateString('zh-CN')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatNumber(prediction.predictedQuantity)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(prediction.predictedRevenue)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getConfidenceColor(prediction.confidenceLevel)}`}>
                      {Math.round(prediction.confidenceLevel * 100)}%
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                      {prediction.algorithmUsed}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(prediction.status)}`}>
                      {prediction.status === 'active' ? '活跃' :
                       prediction.status === 'completed' ? '已完成' :
                       prediction.status === 'failed' ? '失败' : '未知'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      {prediction.status === 'active' && (
                        <button
                          onClick={() => {
                            const actualQuantity = prompt('请输入实际销售数量:');
                            const actualRevenue = prompt('请输入实际销售收入:');
                            if (actualQuantity && actualRevenue) {
                              updatePredictionResults(prediction._id, parseInt(actualQuantity), parseFloat(actualRevenue));
                            }
                          }}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          更新结果
                        </button>
                      )}
                      <button className="text-gray-600 hover:text-gray-900">
                        查看详情
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {filteredPredictions.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500">没有找到符合条件的预测数据</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminSalesPredictionPage;