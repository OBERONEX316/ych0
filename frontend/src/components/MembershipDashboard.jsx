import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { membershipAPI } from '../services/membershipAPI';
import { 
  Crown, 
  Star, 
  Gift, 
  Trophy, 
  Target, 
  Clock, 
  CheckCircle, 
  Lock,
  TrendingUp,
  Award,
  Zap,
  Shield,
  Heart,
  Calendar,
  CreditCard,
  ShoppingBag,
  Users,
  BarChart3
} from 'lucide-react';
import { toast } from 'sonner';

const MembershipDashboard = () => {
  const { user, token } = useAuth();
  const [membership, setMembership] = useState(null);
  const [allLevels, setAllLevels] = useState([]);
  const [availableTasks, setAvailableTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchMembershipData();
  }, [token]);

  const fetchMembershipData = async () => {
    try {
      setLoading(true);
      
      // 获取用户会员信息
      const membershipData = await membershipAPI.getUserMembership(token);
      setMembership(membershipData.data);
      
      // 获取所有会员等级
      const levelsData = await membershipAPI.getAllLevels();
      setAllLevels(levelsData.data);
      
      // 获取用户可参与的任务
      const tasksData = await membershipAPI.getUserAvailableTasks(token);
      setAvailableTasks(tasksData.data);
      
    } catch (error) {
      console.error('获取会员数据失败:', error);
      toast.error('获取会员数据失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const getLevelIcon = (level) => {
    const iconMap = {
      1: <Star className="h-6 w-6 text-gray-400" />,
      2: <Star className="h-6 w-6 text-blue-400" />,
      3: <Award className="h-6 w-6 text-purple-400" />,
      4: <Trophy className="h-6 w-6 text-yellow-400" />,
      5: <Crown className="h-6 w-6 text-red-400" />
    };
    return iconMap[level] || <Star className="h-6 w-6 text-gray-400" />;
  };

  const getDifficultyColor = (difficulty) => {
    const colorMap = {
      easy: 'text-green-500 bg-green-50',
      medium: 'text-yellow-500 bg-yellow-50',
      hard: 'text-orange-500 bg-orange-50',
      expert: 'text-red-500 bg-red-50'
    };
    return colorMap[difficulty] || 'text-gray-500 bg-gray-50';
  };

  const handleTaskComplete = async (taskId) => {
    try {
      await membershipAPI.updateTaskProgress(token, taskId, task.target);
      toast.success('任务完成！奖励已发放');
      fetchMembershipData();
    } catch (error) {
      console.error('完成任务失败:', error);
      toast.error('完成任务失败，请稍后重试');
    }
  };

  const handlePointsRedeem = async (points, reason) => {
    try {
      await membershipAPI.redeemPoints(token, points, reason);
      toast.success('积分兑换成功！');
      fetchMembershipData();
    } catch (error) {
      console.error('积分兑换失败:', error);
      toast.error(error.message || '积分兑换失败');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">加载会员信息中...</p>
        </div>
      </div>
    );
  }

  if (!membership) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Crown className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">暂无会员信息</h3>
          <p className="text-gray-600">请先登录或联系客服</p>
        </div>
      </div>
    );
  }

  const { membership: userMembership, nextLevel, upgradeProgress } = membership;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* 页面标题 */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">会员中心</h1>
          <p className="text-gray-600">享受专属权益，提升购物体验</p>
        </div>

        {/* 导航标签 */}
        <div className="flex justify-center mb-8">
          <div className="bg-white rounded-lg p-1 shadow-sm">
            {[
              { id: 'overview', label: '会员概览', icon: Crown },
              { id: 'tasks', label: '会员任务', icon: Target },
              { id: 'benefits', label: '专属权益', icon: Gift },
              { id: 'points', label: '积分中心', icon: Star }
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center space-x-2 ${
                  activeTab === id
                    ? 'bg-primary-600 text-white'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 会员概览 */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* 当前等级卡片 */}
            <div className="bg-gradient-to-r from-primary-600 to-purple-600 rounded-xl p-8 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-3 mb-4">
                    {getLevelIcon(userMembership.currentLevel.level)}
                    <div>
                      <h2 className="text-2xl font-bold">{userMembership.currentLevel.name}</h2>
                      <p className="text-primary-100">LV.{userMembership.currentLevel.level}</p>
                    </div>
                  </div>
                  <p className="text-primary-100 mb-4">{userMembership.currentLevel.description}</p>
                  <div className="flex items-center space-x-6 text-sm">
                    <div className="flex items-center space-x-2">
                      <Star className="h-4 w-4" />
                      <span>{userMembership.stats.totalPoints} 积分</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <ShoppingBag className="h-4 w-4" />
                      <span>{userMembership.stats.totalOrders} 订单</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CreditCard className="h-4 w-4" />
                      <span>¥{userMembership.stats.totalSpent} 消费</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-primary-100 text-sm mb-2">会员有效期至</p>
                  <p className="text-lg font-semibold">
                    {new Date(userMembership.membershipExpiry).toLocaleDateString('zh-CN')}
                  </p>
                </div>
              </div>
            </div>

            {/* 升级进度 */}
            {nextLevel && upgradeProgress && (
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">升级进度</h3>
                  <span className="text-sm text-gray-500">距离 {nextLevel.name}</span>
                </div>
                <div className="space-y-4">
                  {upgradeProgress.missing.points > 0 && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Star className="h-5 w-5 text-yellow-500" />
                        <span className="text-gray-700">积分要求</span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-500">
                          {userMembership.stats.totalPoints} / {nextLevel.upgradeConditions.minPoints}
                        </div>
                        <div className="text-sm text-red-500">
                          还需 {upgradeProgress.missing.points} 积分
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {upgradeProgress.missing.spent > 0 && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <CreditCard className="h-5 w-5 text-blue-500" />
                        <span className="text-gray-700">消费要求</span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-500">
                          ¥{userMembership.stats.totalSpent} / ¥{nextLevel.upgradeConditions.minTotalSpent}
                        </div>
                        <div className="text-sm text-red-500">
                          还需消费 ¥{upgradeProgress.missing.spent}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {upgradeProgress.missing.orders > 0 && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <ShoppingBag className="h-5 w-5 text-green-500" />
                        <span className="text-gray-700">订单要求</span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-500">
                          {userMembership.stats.totalOrders} / {nextLevel.upgradeConditions.minOrders}
                        </div>
                        <div className="text-sm text-red-500">
                          还需 {upgradeProgress.missing.orders} 笔订单
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 等级对比 */}
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">会员等级对比</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {allLevels.map((level) => (
                  <div
                    key={level._id}
                    className={`p-4 rounded-lg border-2 ${
                      level._id === userMembership.currentLevel._id
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center space-x-3 mb-3">
                      {getLevelIcon(level.level)}
                      <div>
                        <h4 className="font-semibold text-gray-900">{level.name}</h4>
                        <p className="text-sm text-gray-500">LV.{level.level}</p>
                      </div>
                    </div>
                    <div className="space-y-2 text-sm">
                      {level.benefits.discountRate > 0 && (
                        <div className="flex items-center space-x-2">
                          <Zap className="h-4 w-4 text-yellow-500" />
                          <span>{level.benefits.discountRate}% 专属折扣</span>
                        </div>
                      )}
                      {level.benefits.pointsMultiplier > 1 && (
                        <div className="flex items-center space-x-2">
                          <Star className="h-4 w-4 text-blue-500" />
                          <span>{level.benefits.pointsMultiplier}倍积分</span>
                        </div>
                      )}
                      {level.benefits.freeShippingThreshold > 0 && (
                        <div className="flex items-center space-x-2">
                          <Gift className="h-4 w-4 text-green-500" />
                          <span>满¥{level.benefits.freeShippingThreshold}免运费</span>
                        </div>
                      )}
                      {level.benefits.hasPrioritySupport && (
                        <div className="flex items-center space-x-2">
                          <Shield className="h-4 w-4 text-purple-500" />
                          <span>专属客服</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 会员任务 */}
        {activeTab === 'tasks' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">会员任务</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {availableTasks.map((task) => {
                  const userTaskProgress = userMembership.tasksProgress.find(
                    tp => tp.taskId === task._id
                  );
                  const progress = userTaskProgress?.progress || 0;
                  const isCompleted = userTaskProgress?.isCompleted || false;
                  const rewardsClaimed = userTaskProgress?.rewardsClaimed || false;

                  return (
                    <div key={task._id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900 mb-1">{task.title}</h4>
                          <p className="text-sm text-gray-600 mb-2">{task.description}</p>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(task.difficulty)}`}>
                          {task.difficulty}
                        </span>
                      </div>

                      <div className="mb-3">
                        <div className="flex justify-between text-sm text-gray-600 mb-1">
                          <span>{task.getProgressDescription()}</span>
                          <span>{progress} / {task.target}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-primary-600 h-2 rounded-full transition-all"
                            style={{ width: `${Math.min((progress / task.target) * 100, 100)}%` }}
                          ></div>
                        </div>
                      </div>

                      <div className="mb-3">
                        <div className="text-xs text-gray-500 mb-1">奖励：</div>
                        <div className="flex flex-wrap gap-1">
                          {task.getRewardsDescription().map((reward, index) => (
                            <span key={index} className="px-2 py-1 bg-yellow-50 text-yellow-700 text-xs rounded">
                              {reward}
                            </span>
                          ))}
                        </div>
                      </div>

                      <button
                        onClick={() => handleTaskComplete(task._id)}
                        disabled={isCompleted && rewardsClaimed}
                        className={`w-full py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                          isCompleted && rewardsClaimed
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : isCompleted
                            ? 'bg-green-600 text-white hover:bg-green-700'
                            : 'bg-primary-600 text-white hover:bg-primary-700'
                        }`}
                      >
                        {isCompleted && rewardsClaimed ? '已完成' : isCompleted ? '领取奖励' : '完成任务'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* 专属权益 */}
        {activeTab === 'benefits' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">当前权益</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {userMembership.currentLevel.benefits.discountRate > 0 && (
                  <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg p-4">
                    <div className="flex items-center space-x-3 mb-2">
                      <Zap className="h-6 w-6 text-yellow-600" />
                      <h4 className="font-semibold text-gray-900">专属折扣</h4>
                    </div>
                    <p className="text-2xl font-bold text-yellow-600 mb-1">
                      {userMembership.currentLevel.benefits.discountRate}%
                    </p>
                    <p className="text-sm text-gray-600">全场商品享受专属折扣</p>
                  </div>
                )}

                {userMembership.currentLevel.benefits.pointsMultiplier > 1 && (
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4">
                    <div className="flex items-center space-x-3 mb-2">
                      <Star className="h-6 w-6 text-blue-600" />
                      <h4 className="font-semibold text-gray-900">积分加成</h4>
                    </div>
                    <p className="text-2xl font-bold text-blue-600 mb-1">
                      {userMembership.currentLevel.benefits.pointsMultiplier}倍
                    </p>
                    <p className="text-sm text-gray-600">购物获得额外积分奖励</p>
                  </div>
                )}

                {userMembership.currentLevel.benefits.freeShippingThreshold > 0 && (
                  <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4">
                    <div className="flex items-center space-x-3 mb-2">
                      <Gift className="h-6 w-6 text-green-600" />
                      <h4 className="font-semibold text-gray-900">免运费</h4>
                    </div>
                    <p className="text-2xl font-bold text-green-600 mb-1">
                      满¥{userMembership.currentLevel.benefits.freeShippingThreshold}
                    </p>
                    <p className="text-sm text-gray-600">享受免运费服务</p>
                  </div>
                )}

                {userMembership.currentLevel.benefits.hasPrioritySupport && (
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4">
                    <div className="flex items-center space-x-3 mb-2">
                      <Shield className="h-6 w-6 text-purple-600" />
                      <h4 className="font-semibold text-gray-900">专属客服</h4>
                    </div>
                    <p className="text-sm text-gray-600">享受专属客服支持</p>
                  </div>
                )}

                {userMembership.currentLevel.benefits.hasExclusiveEvents && (
                  <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-4">
                    <div className="flex items-center space-x-3 mb-2">
                      <Heart className="h-6 w-6 text-red-600" />
                      <h4 className="font-semibold text-gray-900">专属活动</h4>
                    </div>
                    <p className="text-sm text-gray-600">参与会员专属活动</p>
                  </div>
                )}

                {userMembership.currentLevel.benefits.birthdayBenefits && (
                  <div className="bg-gradient-to-br from-pink-50 to-pink-100 rounded-lg p-4">
                    <div className="flex items-center space-x-3 mb-2">
                      <Calendar className="h-6 w-6 text-pink-600" />
                      <h4 className="font-semibold text-gray-900">生日特权</h4>
                    </div>
                    <p className="text-sm text-gray-600">{userMembership.currentLevel.benefits.birthdayBenefits}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 积分中心 */}
        {activeTab === 'points' && (
          <div className="space-y-6">
            {/* 积分概览 */}
            <div className="bg-gradient-to-r from-yellow-400 to-orange-500 rounded-xl p-8 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-3 mb-4">
                    <Star className="h-8 w-8" />
                    <div>
                      <h2 className="text-2xl font-bold">我的积分</h2>
                      <p className="text-yellow-100">可用于兑换商品和优惠券</p>
                    </div>
                  </div>
                  <p className="text-4xl font-bold mb-2">{membership.availablePoints}</p>
                  <div className="flex items-center space-x-6 text-sm">
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4" />
                      <span>{membership.expiringPoints} 积分即将过期</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <button
                    onClick={() => handlePointsRedeem(100, '积分兑换测试')}
                    className="bg-white text-orange-500 px-6 py-2 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                  >
                    积分兑换
                  </button>
                </div>
              </div>
            </div>

            {/* 积分获取方式 */}
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">积分获取方式</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                  <ShoppingBag className="h-8 w-8 text-primary-600" />
                  <div>
                    <h4 className="font-semibold text-gray-900">购物消费</h4>
                    <p className="text-sm text-gray-600">每消费1元获得{userMembership.currentLevel.benefits.pointsMultiplier}积分</p>
                  </div>
                </div>

                <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                  <Users className="h-8 w-8 text-green-600" />
                  <div>
                    <h4 className="font-semibold text-gray-900">推荐好友</h4>
                    <p className="text-sm text-gray-600">成功推荐好友获得积分奖励</p>
                  </div>
                </div>

                <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                  <CheckCircle className="h-8 w-8 text-blue-600" />
                  <div>
                    <h4 className="font-semibold text-gray-900">完成任务</h4>
                    <p className="text-sm text-gray-600">完成会员任务获得积分奖励</p>
                  </div>
                </div>

                <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                  <Heart className="h-8 w-8 text-red-600" />
                  <div>
                    <h4 className="font-semibold text-gray-900">每日签到</h4>
                    <p className="text-sm text-gray-600">每日签到获得积分奖励</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MembershipDashboard;