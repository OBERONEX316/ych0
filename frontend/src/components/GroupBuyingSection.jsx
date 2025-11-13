import React, { useState, useEffect } from 'react';
import { Users, Clock, ShoppingCart, TrendingUp, Eye, UserPlus, CheckCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import groupBuyingAPI from '../services/groupBuyingAPI';
import { toast } from 'sonner';

const GroupBuyingSection = () => {
  const { user } = useAuth();
  const [activeActivities, setActiveActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [participatingGroups, setParticipatingGroups] = useState({});

  useEffect(() => {
    fetchActiveActivities();
    if (user) {
      fetchMyGroups();
    }
  }, [user]);

  const fetchActiveActivities = async () => {
    try {
      setLoading(true);
      const response = await groupBuyingAPI.getActiveGroupBuying();
      setActiveActivities(response.data);
    } catch (error) {
      console.error('Failed to fetch active group buying:', error);
      toast.error('获取团购活动失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchMyGroups = async () => {
    try {
      const response = await groupBuyingAPI.getMyGroups();
      const groupsMap = {};
      response.data.forEach(group => {
        groupsMap[group.groupBuyingId] = group;
      });
      setParticipatingGroups(groupsMap);
    } catch (error) {
      console.error('Failed to fetch my groups:', error);
    }
  };

  const handleParticipate = async (activity) => {
    if (!user) {
      toast.error('请先登录');
      return;
    }

    try {
      await groupBuyingAPI.participate(activity._id, 1);
      toast.success('参与团购成功！');
      fetchActiveActivities();
      fetchMyGroups();
    } catch (error) {
      console.error('Failed to participate:', error);
      toast.error(error.message || '参与团购失败');
    }
  };

  const handleViewDetails = (activity) => {
    setSelectedActivity(activity);
    setShowModal(true);
  };

  const getTimeLeft = (endTime) => {
    const now = new Date();
    const end = new Date(endTime);
    const diff = end - now;

    if (diff <= 0) return '已结束';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) return `${days}天 ${hours}小时`;
    if (hours > 0) return `${hours}小时 ${minutes}分钟`;
    return `${minutes}分钟`;
  };

  const getProgressPercentage = (activity) => {
    const totalNeeded = activity.minParticipants * activity.statistics.totalGroups;
    const totalJoined = activity.statistics.totalParticipants;
    return Math.min((totalJoined / totalNeeded) * 100, 100);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  if (activeActivities.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center">
          <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">暂无团购活动</h3>
          <p className="text-gray-600">请稍后再来看看！</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">🔥 热门团购</h2>
        <p className="text-gray-600">与朋友一起享受更优惠的价格</p>
      </div>

      {/* Activities Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {activeActivities.map((activity) => (
          <div key={activity._id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
            {/* Product Image */}
            <div className="relative">
              <img
                src={activity.product?.images?.[0]?.url || '/api/placeholder/400/250'}
                alt={activity.product?.name}
                className="w-full h-48 object-cover"
              />
              <div className="absolute top-2 left-2 bg-red-600 text-white px-2 py-1 rounded text-sm font-medium">
                {activity.discountPercentage}% OFF
              </div>
              <div className="absolute top-2 right-2 bg-blue-600 text-white px-2 py-1 rounded text-sm flex items-center">
                <Clock className="w-3 h-3 mr-1" />
                {getTimeLeft(activity.endTime)}
              </div>
            </div>

            {/* Activity Info */}
            <div className="p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{activity.name}</h3>
              <p className="text-gray-600 text-sm mb-4 line-clamp-2">{activity.description}</p>

              {/* Product Info */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-500">商品：</span>
                  <span className="text-sm font-medium">{activity.product?.name}</span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-500">原价：</span>
                  <span className="text-sm text-gray-500 line-through">¥{activity.originalPrice}</span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-500">团购价：</span>
                  <span className="text-lg font-bold text-red-600">¥{activity.groupPrice}</span>
                </div>
              </div>

              {/* Progress */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-500">进度：</span>
                  <span className="text-sm font-medium">
                    {activity.statistics.totalParticipants} / {activity.minParticipants * activity.statistics.totalGroups} 人
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${getProgressPercentage(activity)}%` }}
                  ></div>
                </div>
              </div>

              {/* Group Requirements */}
              <div className="mb-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">每团人数：</span>
                  <span className="font-medium">{activity.minParticipants} - {activity.maxParticipants} 人</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">最大团数：</span>
                  <span className="font-medium">{activity.maxGroups} 个</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex space-x-2">
                <button
                  onClick={() => handleViewDetails(activity)}
                  className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center"
                >
                  <Eye className="w-4 h-4 mr-1" />
                  详情
                </button>
                
                {participatingGroups[activity._id] ? (
                  <button
                    disabled
                    className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg cursor-not-allowed flex items-center justify-center"
                  >
                    <CheckCircle className="w-4 h-4 mr-1" />
                    已参与
                  </button>
                ) : (
                  <button
                    onClick={() => handleParticipate(activity)}
                    className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
                  >
                    <UserPlus className="w-4 h-4 mr-1" />
                    参与团购
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {showModal && selectedActivity && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl bg-white rounded-lg shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-900">{selectedActivity.name}</h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Product Image */}
              <div>
                <img
                  src={selectedActivity.product?.images?.[0]?.url || '/api/placeholder/400/300'}
                  alt={selectedActivity.product?.name}
                  className="w-full h-64 object-cover rounded-lg"
                />
              </div>

              {/* Activity Details */}
              <div>
                <div className="mb-4">
                  <h4 className="font-semibold text-gray-900 mb-2">活动描述</h4>
                  <p className="text-gray-600">{selectedActivity.description}</p>
                </div>

                <div className="mb-4">
                  <h4 className="font-semibold text-gray-900 mb-2">价格信息</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">原价：</span>
                      <span className="text-gray-500 line-through">¥{selectedActivity.originalPrice}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">团购价：</span>
                      <span className="text-red-600 font-bold">¥{selectedActivity.groupPrice}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">节省：</span>
                      <span className="text-green-600 font-medium">
                        ¥{(selectedActivity.originalPrice - selectedActivity.groupPrice).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mb-4">
                  <h4 className="font-semibold text-gray-900 mb-2">时间信息</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">开始时间：</span>
                      <span>{formatDate(selectedActivity.startTime)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">结束时间：</span>
                      <span>{formatDate(selectedActivity.endTime)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">剩余时间：</span>
                      <span className="text-blue-600 font-medium">{getTimeLeft(selectedActivity.endTime)}</span>
                    </div>
                  </div>
                </div>

                <div className="mb-4">
                  <h4 className="font-semibold text-gray-900 mb-2">参与条件</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">每团人数：</span>
                      <span>{selectedActivity.minParticipants} - {selectedActivity.maxParticipants} 人</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">最大团数：</span>
                      <span>{selectedActivity.maxGroups} 个</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">每人限购：</span>
                      <span>{selectedActivity.conditions?.maxQuantityPerUser || 5} 件</span>
                    </div>
                    {selectedActivity.conditions?.requireEmailVerification && (
                      <div className="text-sm text-orange-600">
                        ⚠️ 需要邮箱验证
                      </div>
                    )}
                  </div>
                </div>

                <div className="mb-4">
                  <h4 className="font-semibold text-gray-900 mb-2">活动统计</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">总团数：</span>
                      <span>{selectedActivity.statistics?.totalGroups || 0} 个</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">成功团数：</span>
                      <span>{selectedActivity.statistics?.successfulGroups || 0} 个</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">总参与人数：</span>
                      <span>{selectedActivity.statistics?.totalParticipants || 0} 人</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">总收入：</span>
                      <span className="text-green-600 font-medium">
                        ¥{selectedActivity.statistics?.totalRevenue?.toFixed(2) || 0}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-4 pt-4 border-t">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
              >
                关闭
              </button>
              {participatingGroups[selectedActivity._id] ? (
                <button
                  disabled
                  className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg cursor-not-allowed"
                >
                  已参与此团购
                </button>
              ) : (
                <button
                  onClick={() => {
                    handleParticipate(selectedActivity);
                    setShowModal(false);
                  }}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  立即参与
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupBuyingSection;