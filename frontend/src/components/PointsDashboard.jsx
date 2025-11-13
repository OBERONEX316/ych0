import React, { useState, useEffect } from 'react';
import { 
  Star, 
  TrendingUp, 
  Award, 
  History, 
  Crown, 
  Gift,
  Loader,
  AlertCircle
} from 'lucide-react';
import { pointsAPI } from '../services/api';

const PointsDashboard = () => {
  const [pointsData, setPointsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchPointsData();
  }, []);

  const fetchPointsData = async () => {
    try {
      setLoading(true);
      const [balanceRes, statsRes] = await Promise.all([
        pointsAPI.getPointsBalance(),
        pointsAPI.getPointsStats()
      ]);
      
      setPointsData({
        balance: balanceRes,
        stats: statsRes
      });
    } catch (err) {
      console.error('获取积分数据失败:', err);
      setError(err.response?.data?.error || '获取积分数据失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const getLevelIcon = (level) => {
    switch (level) {
      case 1: return <Star className="h-6 w-6 text-yellow-400" />;
      case 2: return <TrendingUp className="h-6 w-6 text-blue-400" />;
      case 3: return <Award className="h-6 w-6 text-purple-400" />;
      case 4: return <Crown className="h-6 w-6 text-orange-400" />;
      case 5: return <Gift className="h-6 w-6 text-red-400" />;
      default: return <Star className="h-6 w-6 text-gray-400" />;
    }
  };

  const getLevelColor = (level) => {
    switch (level) {
      case 1: return 'bg-yellow-100 text-yellow-800';
      case 2: return 'bg-blue-100 text-blue-800';
      case 3: return 'bg-purple-100 text-purple-800';
      case 4: return 'bg-orange-100 text-orange-800';
      case 5: return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <AlertCircle className="h-12 w-12 text-red-400 mb-4" />
        <p className="text-gray-600 mb-4">{error}</p>
        <button
          onClick={fetchPointsData}
          className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
        >
          重新加载
        </button>
      </div>
    );
  }

  const { balance, stats } = pointsData;
  const progressPercentage = Math.min(
    ((balance.availablePoints || 0) / (balance.nextLevelPoints || 1)) * 100,
    100
  );

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      {/* 积分概览 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gradient-to-br from-primary-50 to-primary-100 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">可用积分</h3>
            <Star className="h-6 w-6 text-primary-600" />
          </div>
          <p className="text-3xl font-bold text-primary-600">
            {balance.availablePoints?.toLocaleString() || 0}
          </p>
          <p className="text-sm text-gray-600 mt-2">当前可用积分</p>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">总获得积分</h3>
            <TrendingUp className="h-6 w-6 text-green-600" />
          </div>
          <p className="text-3xl font-bold text-green-600">
            {balance.totalPoints?.toLocaleString() || 0}
          </p>
          <p className="text-sm text-gray-600 mt-2">累计获得积分</p>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">会员等级</h3>
            {getLevelIcon(balance.level)}
          </div>
          <p className="text-2xl font-bold text-purple-600">
            {balance.levelName}
          </p>
          <p className="text-sm text-gray-600 mt-2">当前会员等级</p>
        </div>
      </div>

      {/* 等级进度 */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">等级进度</h3>
          <span className="text-sm text-gray-600">
            {balance.availablePoints?.toLocaleString() || 0} / {balance.nextLevelPoints?.toLocaleString() || 0}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className="bg-primary-600 h-3 rounded-full transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
        <p className="text-sm text-gray-600 mt-2">
          还差 {Math.max(0, (balance.nextLevelPoints || 0) - (balance.availablePoints || 0)).toLocaleString()} 积分升级到下一等级
        </p>
      </div>

      {/* 积分统计 */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-2">积分统计</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">总获得积分:</span>
                <span className="font-medium">{stats.totalEarned?.toLocaleString() || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">总消费积分:</span>
                <span className="font-medium">{stats.totalSpent?.toLocaleString() || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">总过期积分:</span>
                <span className="font-medium">{stats.totalExpired?.toLocaleString() || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">交易总数:</span>
                <span className="font-medium">{stats.totalTransactions?.toLocaleString() || 0}</span>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-2">等级分布</h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">青铜会员:</span>
                <span className="font-medium">{stats.levelDistribution?.bronze || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">白银会员:</span>
                <span className="font-medium">{stats.levelDistribution?.silver || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">黄金会员:</span>
                <span className="font-medium">{stats.levelDistribution?.gold || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">铂金会员:</span>
                <span className="font-medium">{stats.levelDistribution?.platinum || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">钻石会员:</span>
                <span className="font-medium">{stats.levelDistribution?.diamond || 0}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 操作按钮 */}
      <div className="flex flex-wrap gap-4">
        <button
          onClick={() => window.location.href = '/points/history'}
          className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
        >
          <History className="h-4 w-4 mr-2" />
          查看积分历史
        </button>
        
        <button
          onClick={() => window.location.href = '/points/leaderboard'}
          className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
        >
          <Crown className="h-4 w-4 mr-2" />
          查看积分榜
        </button>
        
        <button
          onClick={() => window.location.href = '/points/rules'}
          className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
        >
          <Gift className="h-4 w-4 mr-2" />
          积分规则
        </button>
      </div>
    </div>
  );
};

export default PointsDashboard;