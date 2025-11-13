import React, { useState, useEffect } from 'react';
import { 
  Users, 
  ShoppingCart, 
  Package, 
  Star, 
  TrendingUp, 
  Calendar,
  DollarSign,
  CreditCard,
  Heart,
  MessageSquare,
  BarChart3,
  Activity,
  AlertCircle,
  Eye,
  Filter
} from 'lucide-react';
import { analyticsAPI } from '../services/api';

const UserAnalyticsPage = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState('7d');
  const [activeTab, setActiveTab] = useState('overview');
  const [analyticsData, setAnalyticsData] = useState({
    userStats: {
      total: 0,
      active: 0,
      new: 0,
      growthRate: 0
    },
    orderStats: {
      total: 0,
      completed: 0,
      pending: 0,
      new: 0,
      conversionRate: 0
    },
    productStats: {
      total: 0,
      outOfStock: 0,
      lowStock: 0
    },
    reviewStats: {
      total: 0,
      positive: 0,
      positiveRate: 0
    },
    activityTrend: [],
    popularProducts: [],
    demographics: {
      roles: [],
      status: [],
      registrationTrend: []
    }
  });

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await analyticsAPI.getUserAnalytics({ timeRange });
      
      if (response.data.success) {
        setAnalyticsData(response.data.data);
      } else {
        throw new Error(response.data.error || '获取数据失败');
      }
    } catch (err) {
      console.error('获取分析数据失败:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalyticsData();
  }, [timeRange]);

  const StatCard = ({ title, value, icon: Icon, trend, color = 'blue' }) => (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {trend && (
            <p className={`text-sm ${trend > 0 ? 'text-green-600' : 'text-red-600'} mt-1`}>
              {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%
            </p>
          )}
        </div>
        <div className={`p-3 rounded-full bg-${color}-100`}>
          <Icon className={`h-6 w-6 text-${color}-600`} />
        </div>
      </div>
    </div>
  );

  const MetricCard = ({ title, current, previous, unit = '' }) => (
    <div className="bg-white rounded-lg shadow p-4">
      <h4 className="text-sm font-medium text-gray-600 mb-2">{title}</h4>
      <div className="flex items-baseline justify-between">
        <span className="text-xl font-bold text-gray-900">
          {current.toLocaleString()}{unit}
        </span>
        {previous && (
          <span className={`text-sm ${current >= previous ? 'text-green-600' : 'text-red-600'}`}>
            {current >= previous ? '+' : ''}{((current - previous) / previous * 100).toFixed(1)}%
          </span>
        )}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">加载分析数据中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">加载失败</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={fetchAnalyticsData}
            className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 transition-colors"
          >
            重新加载
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 页面标题和筛选 */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8">
          <div className="mb-4 lg:mb-0">
            <h1 className="text-3xl font-bold text-gray-900">用户行为分析</h1>
            <p className="text-gray-600 mt-2">全面了解用户行为和业务表现</p>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center bg-white rounded-lg shadow-sm px-3 py-2">
              <Filter className="h-4 w-4 text-gray-400 mr-2" />
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="bg-transparent border-none text-sm focus:outline-none focus:ring-0"
              >
                <option value="7days">最近7天</option>
                <option value="30days">最近30天</option>
                <option value="90days">最近90天</option>
              </select>
            </div>
            
            <div className="flex items-center bg-white rounded-lg shadow-sm px-3 py-2">
              <Calendar className="h-4 w-4 text-gray-400 mr-2" />
              <span className="text-sm text-gray-600">
                {new Date().toLocaleDateString('zh-CN')}
              </span>
            </div>
          </div>
        </div>

        {/* 标签页导航 */}
        <div className="bg-white rounded-lg shadow-sm mb-8">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'overview', label: '概览', icon: BarChart3 },
              { id: 'users', label: '用户分析', icon: Users },
              { id: 'orders', label: '订单分析', icon: ShoppingCart },
              { id: 'products', label: '商品分析', icon: TrendingUp }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center px-3 py-4 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* 概览标签页 */}
        {activeTab === 'overview' && (
          <>
            {/* 概览统计 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="总用户数"
            value={analyticsData.userStats.total.toLocaleString()}
            icon={Users}
            trend={{ value: analyticsData.userStats.growthRate, isPositive: analyticsData.userStats.growthRate > 0 }}
            color="blue"
          />
          <StatCard
            title="总订单数"
            value={analyticsData.orderStats.total.toLocaleString()}
            icon={ShoppingCart}
            trend={{ value: analyticsData.orderStats.conversionRate, isPositive: analyticsData.orderStats.conversionRate > 0 }}
            color="green"
          />
          <StatCard
            title="完成订单"
            value={analyticsData.orderStats.completed.toLocaleString()}
            icon={CreditCard}
            trend={{ value: analyticsData.orderStats.conversionRate, isPositive: analyticsData.orderStats.conversionRate > 0 }}
            color="purple"
          />
          <StatCard
            title="转化率"
            value={`${analyticsData.orderStats.conversionRate}%`}
            icon={TrendingUp}
            trend={{ value: analyticsData.orderStats.conversionRate, isPositive: analyticsData.orderStats.conversionRate > 0 }}
            color="orange"
          />
        </div>

            {/* 详细指标网格 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              <div className="col-span-1 md:col-span-2 lg:col-span-3">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">用户行为指标</h3>
              </div>
              
              <MetricCard
                title="新增用户"
                current={analyticsData.userStats.newUsers}
                previous={analyticsData.userStats.previousNewUsers}
              />
              <MetricCard
                title="活跃用户"
                current={analyticsData.userStats.activeUsers}
                previous={analyticsData.userStats.previousActiveUsers}
              />
              <MetricCard
                title="回访用户"
                current={analyticsData.userStats.returningUsers}
                previous={analyticsData.userStats.previousReturningUsers}
              />
              
              <MetricCard
                title="收藏添加"
                current={analyticsData.behaviorStats.favoritesAdded}
                previous={analyticsData.behaviorStats.previousFavoritesAdded}
              />
              <MetricCard
                title="购物车添加"
                current={analyticsData.behaviorStats.cartAdds}
                previous={analyticsData.behaviorStats.previousCartAdds}
              />
              <MetricCard
                title="搜索查询"
                current={analyticsData.behaviorStats.searchQueries}
                previous={analyticsData.behaviorStats.previousSearchQueries}
              />
            </div>

            {/* 转化率指标 */}
            <div className="bg-white rounded-lg shadow p-6 mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">转化率分析</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {analyticsData.orderStats.conversionRate}%
                  </div>
                  <div className="text-sm text-gray-600">整体转化率</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    ¥{analyticsData.orderStats.avgOrderValue}
                  </div>
                  <div className="text-sm text-gray-600">平均订单价值</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {analyticsData.behaviorStats.avgSessionDuration}
                  </div>
                  <div className="text-sm text-gray-600">平均会话时长</div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* 其他标签页内容可以类似实现 */}
        {activeTab !== 'overview' && (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <BarChart3 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {activeTab === 'users' && '用户分析'}
              {activeTab === 'orders' && '订单分析'}
              {activeTab === 'products' && '商品分析'}
            </h3>
            <p className="text-gray-600">
              详细分析功能正在开发中，敬请期待！
            </p>
          </div>
        )}

        {/* 数据更新时间 */}
        <div className="text-center text-sm text-gray-500 mt-8">
          数据最后更新: {new Date().toLocaleString('zh-CN')}
        </div>
      </div>
    </div>
  );
};

export default UserAnalyticsPage;