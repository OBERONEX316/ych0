import React, { useState, useEffect } from 'react';
//
import { TrendingUp, TrendingDown, Target, BarChart3, Calendar, AlertCircle, CheckCircle } from 'lucide-react';
import salesPredictionAPI from '../services/salesPredictionAPI';
import { toast } from 'sonner';

const SalesPredictionDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('monthly');
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchDashboardData();
  }, [selectedPeriod]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await salesPredictionAPI.getDashboardAnalytics(selectedPeriod);
      setDashboardData(response.data);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      toast.error('获取预测数据失败');
    } finally {
      setLoading(false);
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

  const getConfidenceColor = (confidence) => {
    if (confidence >= 0.9) return 'text-green-600';
    if (confidence >= 0.8) return 'text-blue-600';
    if (confidence >= 0.7) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getConfidenceIcon = (confidence) => {
    if (confidence >= 0.9) return <CheckCircle className="w-4 h-4 text-green-600" />;
    if (confidence >= 0.8) return <CheckCircle className="w-4 h-4 text-blue-600" />;
    if (confidence >= 0.7) return <AlertCircle className="w-4 h-4 text-yellow-600" />;
    return <AlertCircle className="w-4 h-4 text-red-600" />;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">暂无预测数据</p>
      </div>
    );
  }

  const { summary, accuracyStats, topRevenuePredictions, algorithmDistribution } = dashboardData;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">销售预测分析</h1>
        <select
          value={selectedPeriod}
          onChange={(e) => setSelectedPeriod(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="daily">日报</option>
          <option value="weekly">周报</option>
          <option value="monthly">月报</option>
          <option value="quarterly">季报</option>
          <option value="yearly">年报</option>
        </select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">总预测数</p>
              <p className="text-2xl font-bold text-gray-900">{formatNumber(summary.totalPredictions)}</p>
            </div>
            <BarChart3 className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">预测总收入</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(summary.totalPredictedRevenue)}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">平均置信度</p>
              <p className="text-2xl font-bold text-gray-900">
                {Math.round(summary.averageConfidence * 100)}%
              </p>
            </div>
            <Target className="w-8 h-8 text-purple-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">活跃预测</p>
              <p className="text-2xl font-bold text-gray-900">{formatNumber(summary.activePredictions)}</p>
            </div>
            <Calendar className="w-8 h-8 text-orange-600" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'overview', label: '概览' },
              { id: 'accuracy', label: '准确率分析' },
              { id: 'algorithms', label: '算法分析' },
              { id: 'top-products', label: '热门产品' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Recent Predictions */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">最近预测</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          产品
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
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {dashboardData.recentPredictions.map((prediction) => (
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
                            {formatNumber(prediction.predictedQuantity)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatCurrency(prediction.predictedRevenue)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center space-x-2">
                              {getConfidenceIcon(prediction.confidenceLevel)}
                              <span className={`text-sm font-medium ${getConfidenceColor(prediction.confidenceLevel)}`}>
                                {Math.round(prediction.confidenceLevel * 100)}%
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                              {prediction.algorithmUsed}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                              prediction.status === 'active' ? 'bg-green-100 text-green-800' :
                              prediction.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {prediction.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Accuracy Tab */}
          {activeTab === 'accuracy' && accuracyStats && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-600">平均绝对百分比误差</h4>
                  <p className="text-2xl font-bold text-gray-900">
                    {accuracyStats.averageMAPE ? `${accuracyStats.averageMAPE.toFixed(2)}%` : 'N/A'}
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-600">R² 决定系数</h4>
                  <p className="text-2xl font-bold text-gray-900">
                    {accuracyStats.averageR2 ? accuracyStats.averageR2.toFixed(4) : 'N/A'}
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-600">高准确率预测</h4>
                  <p className="text-2xl font-bold text-gray-900">
                    {accuracyStats.highAccuracyCount} / {accuracyStats.totalCompleted}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Algorithms Tab */}
          {activeTab === 'algorithms' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {Object.entries(algorithmDistribution).map(([algorithm, count]) => (
                  <div key={algorithm} className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-600 capitalize">
                      {algorithm.replace('_', ' ')}
                    </h4>
                    <p className="text-2xl font-bold text-gray-900">{count}</p>
                    <p className="text-xs text-gray-500">
                      {((count / summary.totalPredictions) * 100).toFixed(1)}% 使用
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top Products Tab */}
          {activeTab === 'top-products' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {topRevenuePredictions.map((prediction) => (
                  <div key={prediction._id} className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">
                      {prediction.productId?.name || '未知产品'}
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">预测收入:</span>
                        <span className="font-medium">{formatCurrency(prediction.predictedRevenue)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">预测数量:</span>
                        <span className="font-medium">{formatNumber(prediction.predictedQuantity)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">置信度:</span>
                        <span className={`font-medium ${getConfidenceColor(prediction.confidenceLevel)}`}>
                          {Math.round(prediction.confidenceLevel * 100)}%
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SalesPredictionDashboard;
