import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Users, Clock, Tag, Filter, Search, ChevronLeft, ChevronRight, UserPlus, CheckCircle, XCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import groupBuyingAPI from '../services/groupBuyingAPI';
import { toast } from 'sonner';

const GroupBuyingList = () => {
  const { user } = useAuth();
  const [groupBuying, setGroupBuying] = useState([]);
  const [loading, setLoading] = useState(true);
  const [participatingGroups, setParticipatingGroups] = useState(new Set());
  const [filters, setFilters] = useState({
    status: 'active',
    search: '',
    page: 1,
    limit: 12
  });
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0
  });

  useEffect(() => {
    fetchGroupBuying();
    if (user) {
      fetchUserParticipation();
    }
  }, [filters, user]);

  const fetchGroupBuying = async () => {
    try {
      setLoading(true);
      const params = {
        ...filters,
        page: filters.page,
        limit: filters.limit
      };
      
      const response = await groupBuyingAPI.getAllGroupBuying(params);
      setGroupBuying(response.data);
      setPagination(response.pagination);
    } catch (error) {
      console.error('Failed to fetch group buying:', error);
      toast.error('获取团购活动失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserParticipation = async () => {
    try {
      const response = await groupBuyingAPI.getUserParticipation({ limit: 100 });
      const userGroupIds = new Set(response.data.map(item => item._id));
      setParticipatingGroups(userGroupIds);
    } catch (error) {
      console.error('Failed to fetch user participation:', error);
    }
  };

  const handleJoinGroup = async (groupBuyingId, quantity = 1) => {
    if (!user) {
      toast.error('请先登录');
      return;
    }

    try {
      const response = await groupBuyingAPI.joinGroupBuying(groupBuyingId, { quantity });
      toast.success(response.message);
      
      // Refresh data
      await fetchGroupBuying();
      await fetchUserParticipation();
    } catch (error) {
      console.error('Failed to join group:', error);
      toast.error(error.message || '参与团购失败');
    }
  };

  const handleLeaveGroup = async (groupBuyingId) => {
    if (!user) {
      toast.error('请先登录');
      return;
    }

    try {
      const response = await groupBuyingAPI.leaveGroupBuying(groupBuyingId);
      toast.success(response.message);
      
      // Refresh data
      await fetchGroupBuying();
      await fetchUserParticipation();
    } catch (error) {
      console.error('Failed to leave group:', error);
      toast.error(error.message || '退出团购失败');
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: 1 // Reset to first page when filters change
    }));
  };

  const handlePageChange = (page) => {
    setFilters(prev => ({
      ...prev,
      page
    }));
  };

  const formatTimeLeft = (endTime) => {
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

  const calculateProgress = (current, min) => {
    return Math.min((current / min) * 100, 100);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'ended': return 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'active': return '进行中';
      case 'scheduled': return '即将开始';
      case 'ended': return '已结束';
      case 'cancelled': return '已取消';
      default: return status;
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="bg-gray-200 h-8 w-48 rounded mb-4"></div>
          <div className="bg-gray-200 h-12 w-full rounded mb-6"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(filters.limit)].map((_, index) => (
            <div key={index} className="animate-pulse">
              <div className="bg-gray-200 h-48 rounded-lg mb-4"></div>
              <div className="bg-gray-200 h-4 rounded mb-2"></div>
              <div className="bg-gray-200 h-4 w-2/3 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">团购活动</h1>
        <p className="text-gray-600">与朋友一起享受更优惠的价格</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="搜索团购活动..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
            >
              <option value="active">进行中</option>
              <option value="scheduled">即将开始</option>
              <option value="ended">已结束</option>
              <option value="">全部状态</option>
            </select>
          </div>

          {/* Limit per page */}
          <div>
            <select
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={filters.limit}
              onChange={(e) => handleFilterChange('limit', parseInt(e.target.value))}
            >
              <option value={12}>每页 12 个</option>
              <option value={24}>每页 24 个</option>
              <option value={48}>每页 48 个</option>
            </select>
          </div>

          {/* Refresh Button */}
          <button
            onClick={fetchGroupBuying}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
          >
            <Filter className="w-4 h-4 mr-2" />
            刷新
          </button>
        </div>
      </div>

      {/* Results Count */}
      <div className="mb-4">
        <p className="text-gray-600">
          找到 {pagination.totalItems} 个团购活动
        </p>
      </div>

      {/* Group Buying Grid */}
      {groupBuying.length === 0 ? (
        <div className="text-center py-12">
          <Users className="mx-auto h-16 w-16 text-gray-400 mb-4" />
          <h3 className="text-xl font-medium text-gray-900 mb-2">暂无团购活动</h3>
          <p className="text-gray-500">请尝试调整筛选条件或稍后再试</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
          {groupBuying.map((activity) => {
            const isParticipating = participatingGroups.has(activity._id);
            const availableGroups = activity.groups?.filter(group => 
              group.status === 'forming' && group.currentParticipants < activity.maxParticipants
            ) || [];
            
            const progress = availableGroups.length > 0 ? 
              calculateProgress(availableGroups[0].currentParticipants, activity.minParticipants) : 0;

            return (
              <div key={activity._id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                {/* Product Image */}
                <div className="relative mb-4">
                  <img
                    src={activity.product?.images?.[0]?.url || '/api/placeholder/300/200'}
                    alt={activity.product?.name}
                    className="w-full h-48 object-cover rounded-lg"
                  />
                  <div className="absolute top-2 left-2 bg-red-500 text-white px-2 py-1 rounded text-sm font-medium">
                    {activity.discountPercentage}% OFF
                  </div>
                  <div className={`absolute top-2 right-2 px-2 py-1 rounded text-xs font-medium ${getStatusColor(activity.status)}`}>
                    {getStatusText(activity.status)}
                  </div>
                </div>

                {/* Product Info */}
                <h3 className="font-semibold text-lg text-gray-900 mb-2 line-clamp-2">
                  {activity.name}
                </h3>
                <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                  {activity.description}
                </p>

                {/* Price Info */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl font-bold text-red-600">
                      ¥{activity.groupPrice}
                    </span>
                    <span className="text-sm text-gray-500 line-through">
                      ¥{activity.originalPrice}
                    </span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Users className="w-4 h-4 mr-1" />
                    {activity.minParticipants}-{activity.maxParticipants}人
                  </div>
                </div>

                {/* Time Left */}
                <div className="flex items-center text-sm text-gray-600 mb-3">
                  <Clock className="w-4 h-4 mr-1" />
                  {formatTimeLeft(activity.endTime)}
                </div>

                {/* Progress Bar */}
                {availableGroups.length > 0 && (
                  <div className="mb-3">
                    <div className="flex justify-between text-sm text-gray-600 mb-1">
                      <span>团购进度</span>
                      <span>{availableGroups[0].currentParticipants}/{activity.minParticipants}人</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                {/* Available Groups */}
                <div className="mb-4">
                  <div className="flex justify-between text-sm text-gray-600 mb-2">
                    <span>可加入小组</span>
                    <span>{availableGroups.length}个</span>
                  </div>
                  {availableGroups.slice(0, 2).map((group) => (
                    <div key={group.groupId} className="flex justify-between items-center py-1 px-2 bg-gray-50 rounded text-sm">
                      <span>小组 {group.groupId.slice(-4)}</span>
                      <span className="text-blue-600">{group.currentParticipants}/{activity.maxParticipants}人</span>
                    </div>
                  ))}
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-2">
                  {isParticipating ? (
                    <button
                      onClick={() => handleLeaveGroup(activity._id)}
                      className="flex-1 bg-gray-500 text-white py-2 px-4 rounded-lg hover:bg-gray-600 transition-colors flex items-center justify-center text-sm"
                    >
                      <XCircle className="w-4 h-4 mr-1" />
                      退出团购
                    </button>
                  ) : (
                    <button
                      onClick={() => handleJoinGroup(activity._id)}
                      disabled={activity.status !== 'active' || availableGroups.length === 0}
                      className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center text-sm disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      <UserPlus className="w-4 h-4 mr-1" />
                      {activity.status === 'active' ? '参与团购' : '不可参与'}
                    </button>
                  )}
                  <Link
                    to={`/group-buying/${activity._id}`}
                    className="bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center text-sm"
                  >
                    详情
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-center space-x-2">
          <button
            onClick={() => handlePageChange(pagination.currentPage - 1)}
            disabled={pagination.currentPage === 1}
            className="flex items-center px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            上一页
          </button>

          <div className="flex space-x-1">
            {[...Array(Math.min(5, pagination.totalPages))].map((_, index) => {
              const pageNum = Math.max(1, Math.min(pagination.totalPages - 4, pagination.currentPage - 2)) + index;
              if (pageNum > pagination.totalPages) return null;
              
              return (
                <button
                  key={pageNum}
                  onClick={() => handlePageChange(pageNum)}
                  className={`px-3 py-2 rounded-lg ${
                    pagination.currentPage === pageNum
                      ? 'bg-blue-600 text-white'
                      : 'border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => handlePageChange(pagination.currentPage + 1)}
            disabled={pagination.currentPage === pagination.totalPages}
            className="flex items-center px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            下一页
            <ChevronRight className="w-4 h-4 ml-1" />
          </button>
        </div>
      )}
    </div>
  );
};

export default GroupBuyingList;