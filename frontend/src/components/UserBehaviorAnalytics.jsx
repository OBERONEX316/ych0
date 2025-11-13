import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, Users, Eye, ShoppingCart, Clock, Target, 
  BarChart3, PieChart, Activity, Filter, Download,
  Calendar, User, MousePointer, Zap, ArrowRight,
  RefreshCw, Settings, Info, Heart, Share
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import userBehaviorAnalyticsAPI from '../services/userBehaviorAnalyticsAPI';
import { toast } from 'sonner';

const UserBehaviorAnalytics = () => {
  const { user } = useAuth();
  const [timeRange, setTimeRange] = useState('30d');
  const [overview, setOverview] = useState(null);
  const [trends, setTrends] = useState([]);
  const [popularBehaviors, setPopularBehaviors] = useState([]);
  const [behaviorDistribution, setBehaviorDistribution] = useState([]);
  const [conversionFunnel, setConversionFunnel] = useState([]);
  const [userSegmentation, setUserSegmentation] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedUserId, setSelectedUserId] = useState('');

  useEffect(() => {
    fetchAnalyticsData();
  }, [timeRange, selectedUserId]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      
      const params = { timeRange };
      if (selectedUserId) params.userId = selectedUserId;

      // 并行获取所有数据
      const [
        overviewRes,
        trendsRes,
        popularRes,
        distributionRes,
        funnelRes,
        segmentationRes
      ] = await Promise.all([
        userBehaviorAnalyticsAPI.getOverview(params),
        userBehaviorAnalyticsAPI.getBehaviorTrends({ ...params, groupBy: 'day' }),
        userBehaviorAnalyticsAPI.getPopularBehaviors(params),
        userBehaviorAnalyticsAPI.getBehaviorDistribution(params),
        userBehaviorAnalyticsAPI.getConversionFunnel(params),
        userBehaviorAnalyticsAPI.getUserSegmentation(params)
      ]);

      setOverview(overviewRes.data);
      setTrends(trendsRes.data);
      setPopularBehaviors(popularRes.data);
      setBehaviorDistribution(distributionRes.data);
      setConversionFunnel(funnelRes.data);
      setUserSegmentation(segmentationRes.data);
    } catch (error) {
      console.error('Failed to fetch analytics data:', error);
      toast.error('获取用户行为分析数据失败');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const response = await userBehaviorAnalyticsAPI.exportData({ 
        timeRange, 
        userId: selectedUserId,
        format: 'csv' 
      });
      
      // 创建下载链接
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `用户行为数据_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      
      toast.success('数据导出成功');
    } catch (error) {
      console.error('Failed to export data:', error);
      toast.error('数据导出失败');
    }
  };

  const getBehaviorIcon = (action) => {
    const iconMap = {
      'page_view': Eye,
      'product_view': Eye,
      'product_click': MousePointer,
      'add_to_cart': ShoppingCart,
      'checkout_start': ShoppingCart,
      'checkout_complete': Target,
      'search': Filter,
      'wishlist_add': Heart,
      'review_submit': User,
      'login': User,
      'social_share': Share,
      'recommendation_click': Zap
    };
    return iconMap[action] || Activity;
  };

  const getBehaviorColor = (action) => {
    const colorMap = {
      'page_view': 'bg-blue-100 text-blue-800',
      'product_view': 'bg-green-100 text-green-800',
      'product_click': 'bg-yellow-100 text-yellow-800',
      'add_to_cart': 'bg-purple-100 text-purple-800',
      'checkout_start': 'bg-orange-100 text-orange-800',
      'checkout_complete': 'bg-red-100 text-red-800',
      'search': 'bg-gray-100 text-gray-800',
      'wishlist_add': 'bg-pink-100 text-pink-800',
      'review_submit': 'bg-indigo-100 text-indigo-800'
    };
    return colorMap[action] || 'bg-gray-100 text-gray-800';
  };

  const getSegmentationColor = (segment) => {
    const colorMap = {
      '高价值用户': 'bg-green-100 text-green-800 border-green-200',
      '活跃用户': 'bg-blue-100 text-blue-800 border-blue-200',
      '潜在用户': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      '流失用户': 'bg-red-100 text-red-800 border-red-200',
      '新用户': 'bg-purple-100 text-purple-800 border-purple-200'
    };
    return colorMap[segment] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">加载分析数据中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">用户行为分析</h1>
              <p className="text-gray-600 mt-1">深入了解用户行为模式和转化路径</p>
            </div>
            <div className="flex items-center space-x-4">
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="7d">最近7天</option>
                <option value="30d">最近30天</option>
                <option value="90d">最近90天</option>
                <option value="1y">最近1年</option>
              </select>
              <button
                onClick={handleExport}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Download className="w-4 h-4 mr-2" />
                导出数据
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {[
              { id: 'overview', label: '概览', icon: BarChart3 },
              { id: 'trends', label: '趋势', icon: TrendingUp },
              { id: 'behaviors', label: '行为', icon: Activity },
              { id: 'funnel', label: '转化漏斗', icon: Target },
              { id: 'segmentation', label: '用户细分', icon: Users }
            ].map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center px-3 py-4 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">总行为数</p>
                    <p className="text-2xl font-bold text-gray-900">{overview?.totalBehaviors || 0}</p>
                  </div>
                  <Activity className="h-8 w-8 text-blue-600" />
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">独立用户数</p>
                    <p className="text-2xl font-bold text-gray-900">{overview?.uniqueUsersCount || 0}</p>
                  </div>
                  <Users className="h-8 w-8 text-green-600" />
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">转化率</p>
                    <p className="text-2xl font-bold text-gray-900">{overview?.conversionRate?.toFixed(1) || 0}%</p>
                  </div>
                  <Target className="h-8 w-8 text-orange-600" />
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">平均会话时长</p>
                    <p className="text-2xl font-bold text-gray-900">{overview?.avgSessionDuration || 0}s</p>
                  </div>
                  <Clock className="h-8 w-8 text-purple-600" />
                </div>
              </div>
            </div>

            {/* Popular Behaviors */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">热门行为</h3>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {popularBehaviors.map((behavior, index) => {
                    const Icon = getBehaviorIcon(behavior.action);
                    return (
                      <div key={behavior.action} className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className={`p-2 rounded-lg ${getBehaviorColor(behavior.action)}`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="ml-4">
                            <p className="text-sm font-medium text-gray-900">{behavior.action}</p>
                            <p className="text-sm text-gray-500">{behavior.uniqueUsersCount} 用户参与</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-900">{behavior.count}</p>
                          <p className="text-sm text-gray-500">平均分数: {behavior.avgScore}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Behavior Distribution */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">行为分布</h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {behaviorDistribution.map((distribution) => (
                    <div key={distribution.category} className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-medium text-gray-900">{distribution.category}</h4>
                        <span className="text-sm text-gray-500">{distribution.percentage}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${distribution.percentage}%` }}
                        ></div>
                      </div>
                      <div className="mt-2 text-sm text-gray-500">
                        {distribution.count} 次行为 · {distribution.uniqueUsersCount} 用户
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Trends Tab */}
        {activeTab === 'trends' && (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">用户行为趋势</h3>
            </div>
            <div className="p-6">
              <div className="space-y-6">
                {trends.map((trend) => (
                  <div key={trend.date} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{trend.date}</p>
                      <p className="text-sm text-gray-500">{trend.uniqueUsersCount} 用户 · {trend.uniqueSessionsCount} 会话</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">{trend.totalBehaviors} 行为</p>
                      <p className="text-sm text-gray-500">转化率: {trend.conversionRate?.toFixed(1) || 0}%</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Behaviors Tab */}
        {activeTab === 'behaviors' && (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">详细行为分析</h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {popularBehaviors.map((behavior) => {
                  const Icon = getBehaviorIcon(behavior.action);
                  return (
                    <div key={behavior.action} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center mb-3">
                        <div className={`p-2 rounded-lg ${getBehaviorColor(behavior.action)}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <h4 className="ml-3 text-sm font-medium text-gray-900">{behavior.action}</h4>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-500">总次数:</span>
                          <span className="font-medium">{behavior.count}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">独立用户:</span>
                          <span className="font-medium">{behavior.uniqueUsersCount}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">平均分数:</span>
                          <span className="font-medium">{behavior.avgScore}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Conversion Funnel Tab */}
        {activeTab === 'funnel' && (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">转化漏斗分析</h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {conversionFunnel.map((step, index) => (
                  <div key={step.step} className="relative">
                    <div className="flex items-center">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-medium text-gray-900">{step.step}</h4>
                          <span className="text-sm text-gray-500">{step.count} 次</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                          <div
                            className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                            style={{ width: `${step.conversionRate}%` }}
                          ></div>
                        </div>
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                          <span>转化率: {step.conversionRate}%</span>
                          <span>流失率: {step.dropOffRate}%</span>
                        </div>
                      </div>
                      {index < conversionFunnel.length - 1 && (
                        <ArrowRight className="w-5 h-5 text-gray-400 mx-4" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Segmentation Tab */}
        {activeTab === 'segmentation' && (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">用户细分分析</h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {userSegmentation.map((segment) => (
                  <div key={segment.name} className={`border-2 rounded-lg p-4 ${getSegmentationColor(segment.name)}`}>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-medium">{segment.name}</h4>
                      <span className="text-lg font-bold">{segment.userCount}</span>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>平均分数:</span>
                        <span className="font-medium">{segment.avgScore}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>平均行为数:</span>
                        <span className="font-medium">{segment.avgBehaviors}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>转化率:</span>
                        <span className="font-medium">{segment.conversionRate}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserBehaviorAnalytics;