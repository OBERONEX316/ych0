import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Users, Clock, Tag, ShoppingCart, UserPlus, CheckCircle, XCircle, ArrowLeft, Crown } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import groupBuyingAPI from '../services/groupBuyingAPI';
import { toast } from 'sonner';

const GroupBuyingDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [groupBuying, setGroupBuying] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [selectedGroupId, setSelectedGroupId] = useState('');

  useEffect(() => {
    fetchGroupBuyingDetail();
  }, [id]);

  const fetchGroupBuyingDetail = async () => {
    try {
      setLoading(true);
      const response = await groupBuyingAPI.getGroupBuyingById(id);
      setGroupBuying(response.data);
      
      // Set default selected group
      const availableGroups = response.data.groups?.filter(group => 
        group.status === 'forming' && group.currentParticipants < response.data.maxParticipants
      ) || [];
      
      if (availableGroups.length > 0) {
        setSelectedGroupId(availableGroups[0].groupId);
      }
    } catch (error) {
      console.error('Failed to fetch group buying detail:', error);
      toast.error('获取团购详情失败');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinGroup = async () => {
    if (!user) {
      toast.error('请先登录');
      return;
    }

    if (!selectedGroupId) {
      toast.error('请选择要加入的小组');
      return;
    }

    try {
      const response = await groupBuyingAPI.joinGroupBuying(id, { 
        quantity, 
        groupId: selectedGroupId 
      });
      toast.success(response.message);
      await fetchGroupBuyingDetail();
    } catch (error) {
      console.error('Failed to join group:', error);
      toast.error(error.message || '参与团购失败');
    }
  };

  const handleLeaveGroup = async () => {
    if (!user) {
      toast.error('请先登录');
      return;
    }

    try {
      const response = await groupBuyingAPI.leaveGroupBuying(id);
      toast.success(response.message);
      await fetchGroupBuyingDetail();
    } catch (error) {
      console.error('Failed to leave group:', error);
      toast.error(error.message || '退出团购失败');
    }
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

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="bg-gray-200 h-8 w-32 rounded mb-6"></div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-gray-200 h-96 rounded-lg"></div>
            <div>
              <div className="bg-gray-200 h-8 w-3/4 rounded mb-4"></div>
              <div className="bg-gray-200 h-4 w-full rounded mb-2"></div>
              <div className="bg-gray-200 h-4 w-2/3 rounded mb-4"></div>
              <div className="bg-gray-200 h-12 w-48 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!groupBuying) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">团购活动不存在</h2>
          <Link to="/group-buying" className="text-blue-600 hover:text-blue-700">
            返回团购列表
          </Link>
        </div>
      </div>
    );
  }

  const availableGroups = groupBuying.groups?.filter(group => 
    group.status === 'forming' && group.currentParticipants < groupBuying.maxParticipants
  ) || [];
  
  const successfulGroups = groupBuying.groups?.filter(group => 
    group.status === 'successful'
  ) || [];

  const isParticipating = groupBuying.userParticipation?.isParticipating;
  const userGroupId = groupBuying.userParticipation?.groupId;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Back Button */}
      <Link to="/group-buying" className="flex items-center text-blue-600 hover:text-blue-700 mb-6">
        <ArrowLeft className="w-4 h-4 mr-2" />
        返回团购列表
      </Link>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Product Image */}
        <div className="space-y-4">
          <div className="relative">
            <img
              src={groupBuying.product?.images?.[0]?.url || '/api/placeholder/600/400'}
              alt={groupBuying.product?.name}
              className="w-full h-96 object-cover rounded-lg"
            />
            <div className="absolute top-4 left-4 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-medium">
              {groupBuying.discountPercentage}% OFF
            </div>
            <div className="absolute top-4 right-4 bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-medium flex items-center">
              <Clock className="w-4 h-4 mr-1" />
              {formatTimeLeft(groupBuying.endTime)}
            </div>
          </div>
        </div>

        {/* Product Info and Actions */}
        <div className="space-y-6">
          {/* Title and Description */}
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              {groupBuying.name}
            </h1>
            <p className="text-gray-600 mb-6">
              {groupBuying.description}
            </p>
          </div>

          {/* Price Info */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-4">
                <span className="text-3xl font-bold text-red-600">
                  ¥{groupBuying.groupPrice}
                </span>
                <span className="text-lg text-gray-500 line-through">
                  ¥{groupBuying.originalPrice}
                </span>
              </div>
              <div className="text-sm text-gray-600">
                <div className="flex items-center mb-1">
                  <Users className="w-4 h-4 mr-1" />
                  {groupBuying.minParticipants}-{groupBuying.maxParticipants}人
                </div>
                <div className="flex items-center">
                  <Tag className="w-4 h-4 mr-1" />
                  节省 ¥{(groupBuying.originalPrice - groupBuying.groupPrice).toFixed(2)}
                </div>
              </div>
            </div>
          </div>

          {/* Group Selection */}
          {!isParticipating && availableGroups.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">选择小组</h3>
              <div className="space-y-2">
                {availableGroups.map((group) => {
                  const progress = calculateProgress(group.currentParticipants, groupBuying.minParticipants);
                  const isSelected = selectedGroupId === group.groupId;
                  
                  return (
                    <div
                      key={group.groupId}
                      className={`p-4 border rounded-lg cursor-pointer transition-all ${
                        isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setSelectedGroupId(group.groupId)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">小组 {group.groupId.slice(-4)}</span>
                        <span className="text-sm text-gray-600">
                          {group.currentParticipants}/{groupBuying.maxParticipants}人
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                        <div 
                          className="bg-green-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${progress}%` }}
                        ></div>
                      </div>
                      <div className="text-sm text-gray-600">
                        还需 {Math.max(0, groupBuying.minParticipants - group.currentParticipants)} 人成团
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Quantity Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  购买数量 (每人最多 {groupBuying.conditions?.maxQuantityPerUser || 5} 件)
                </label>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50"
                  >
                    -
                  </button>
                  <span className="text-lg font-medium w-8 text-center">{quantity}</span>
                  <button
                    onClick={() => setQuantity(Math.min((groupBuying.conditions?.maxQuantityPerUser || 5), quantity + 1))}
                    className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Join Button */}
              <button
                onClick={handleJoinGroup}
                className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
              >
                <UserPlus className="w-5 h-5 mr-2" />
                参与团购
              </button>
            </div>
          )}

          {/* User Participation Status */}
          {isParticipating && (
            <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
              <div className="flex items-center text-green-800 mb-2">
                <CheckCircle className="w-5 h-5 mr-2" />
                <span className="font-medium">您已参与此团购</span>
              </div>
              <p className="text-green-700 text-sm mb-3">
                小组ID: {userGroupId?.slice(-4)}
              </p>
              <button
                onClick={handleLeaveGroup}
                className="bg-red-600 text-white py-2 px-4 rounded hover:bg-red-700 transition-colors"
              >
                退出团购
              </button>
            </div>
          )}

          {/* Statistics */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-semibold text-gray-900 mb-3">团购统计</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">总小组数:</span>
                <span className="font-medium ml-2">{groupBuying.statistics?.totalGroups || 0}</span>
              </div>
              <div>
                <span className="text-gray-600">成功小组:</span>
                <span className="font-medium ml-2 text-green-600">{groupBuying.statistics?.successfulGroups || 0}</span>
              </div>
              <div>
                <span className="text-gray-600">总参与人数:</span>
                <span className="font-medium ml-2">{groupBuying.statistics?.totalParticipants || 0}</span>
              </div>
              <div>
                <span className="text-gray-600">节省总额:</span>
                <span className="font-medium ml-2 text-red-600">¥{(groupBuying.statistics?.totalDiscount || 0).toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Groups Information */}
      <div className="mt-12">
        <h3 className="text-2xl font-bold text-gray-900 mb-6">团购小组</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Available Groups */}
          {availableGroups.map((group) => {
            const progress = calculateProgress(group.currentParticipants, groupBuying.minParticipants);
            const isUserGroup = userGroupId === group.groupId;
            
            return (
              <div key={group.groupId} className={`border rounded-lg p-4 ${
                isUserGroup ? 'border-green-500 bg-green-50' : 'border-gray-200'
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold">小组 {group.groupId.slice(-4)}</h4>
                  {isUserGroup && (
                    <span className="bg-green-500 text-white px-2 py-1 rounded text-xs flex items-center">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      我的小组
                    </span>
                  )}
                </div>
                
                <div className="mb-3">
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>进度</span>
                    <span>{group.currentParticipants}/{groupBuying.minParticipants}人</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                </div>

                <div className="mb-3">
                  <div className="text-sm text-gray-600 mb-2">小组成员:</div>
                  <div className="space-y-1">
                    {group.participants.slice(0, 3).map((participant, index) => (
                      <div key={index} className="flex items-center text-sm">
                        <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs mr-2">
                          {participant.user?.firstName?.[0] || 'U'}
                        </div>
                        <span className="text-gray-700">
                          {participant.user?.firstName} {participant.user?.lastName}
                          {participant.isLeader && (
                            <Crown className="w-3 h-3 text-yellow-500 ml-1 inline" />
                          )}
                        </span>
                        <span className="text-gray-500 ml-auto">{participant.quantity}件</span>
                      </div>
                    ))}
                    {group.participants.length > 3 && (
                      <div className="text-xs text-gray-500">
                        还有 {group.participants.length - 3} 人...
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-sm text-gray-600">
                  还需 {Math.max(0, groupBuying.minParticipants - group.currentParticipants)} 人成团
                </div>
              </div>
            );
          })}

          {/* Successful Groups */}
          {successfulGroups.map((group) => (
            <div key={group.groupId} className="border border-green-200 bg-green-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-green-800">小组 {group.groupId.slice(-4)}</h4>
                <span className="bg-green-500 text-white px-2 py-1 rounded text-xs flex items-center">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  已成团
                </span>
              </div>
              
              <div className="mb-3">
                <div className="flex justify-between text-sm text-green-700 mb-1">
                  <span>成团人数</span>
                  <span>{group.currentParticipants}人</span>
                </div>
                <div className="w-full bg-green-200 rounded-full h-2">
                  <div className="bg-green-500 h-2 rounded-full w-full"></div>
                </div>
              </div>

              <div className="text-sm text-green-700">
                完成时间: {new Date(group.completedAt).toLocaleString()}
              </div>
            </div>
          ))}
        </div>

        {availableGroups.length === 0 && successfulGroups.length === 0 && (
          <div className="text-center py-8">
            <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">暂无团购小组</h4>
            <p className="text-gray-500">成为第一个参与团购的人吧！</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default GroupBuyingDetail;