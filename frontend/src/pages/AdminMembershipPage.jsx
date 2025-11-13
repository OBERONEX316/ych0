import React, { useState, useEffect } from 'react';
import { membershipAPI } from '../services/membershipAPI';
import { 
  Crown, 
  Plus, 
  Edit, 
  Trash2, 
  Save, 
  X,
  Star,
  Gift,
  Target,
  Users,
  TrendingUp,
  Award,
  Zap,
  Shield,
  Calendar,
  CreditCard,
  Package,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

const AdminMembershipPage = () => {
  const [levels, setLevels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingLevel, setEditingLevel] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    level: '',
    description: '',
    icon: '',
    color: '#4F46E5',
    upgradeConditions: {
      minPoints: 0,
      minTotalSpent: 0,
      minOrders: 0,
      minReferrals: 0
    },
    benefits: {
      discountRate: 0,
      pointsMultiplier: 1,
      freeShippingThreshold: 0,
      hasPrioritySupport: false,
      hasExclusiveEvents: false,
      birthdayBenefits: '',
      otherBenefits: []
    },
    isActive: true,
    sortOrder: 0,
    validityPeriod: 365
  });

  useEffect(() => {
    fetchMembershipLevels();
  }, []);

  const fetchMembershipLevels = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await membershipAPI.getAllLevels();
      setLevels(response.data);
    } catch (error) {
      console.error('获取会员等级失败:', error);
      toast.error('获取会员等级失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLevel = async () => {
    try {
      const token = localStorage.getItem('token');
      await membershipAPI.createMembershipLevel(token, formData);
      toast.success('会员等级创建成功');
      setShowCreateModal(false);
      resetForm();
      fetchMembershipLevels();
    } catch (error) {
      console.error('创建会员等级失败:', error);
      toast.error('创建会员等级失败：' + error.message);
    }
  };

  const handleUpdateLevel = async () => {
    try {
      const token = localStorage.getItem('token');
      await membershipAPI.updateMembershipLevel(token, editingLevel._id, formData);
      toast.success('会员等级更新成功');
      setEditingLevel(null);
      resetForm();
      fetchMembershipLevels();
    } catch (error) {
      console.error('更新会员等级失败:', error);
      toast.error('更新会员等级失败：' + error.message);
    }
  };

  const handleDeleteLevel = async (levelId) => {
    if (window.confirm('确定要删除这个会员等级吗？此操作不可恢复。')) {
      try {
        const token = localStorage.getItem('token');
        await membershipAPI.deleteMembershipLevel(token, levelId);
        toast.success('会员等级删除成功');
        fetchMembershipLevels();
      } catch (error) {
        console.error('删除会员等级失败:', error);
        toast.error('删除会员等级失败：' + error.message);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      level: '',
      description: '',
      icon: '',
      color: '#4F46E5',
      upgradeConditions: {
        minPoints: 0,
        minTotalSpent: 0,
        minOrders: 0,
        minReferrals: 0
      },
      benefits: {
        discountRate: 0,
        pointsMultiplier: 1,
        freeShippingThreshold: 0,
        hasPrioritySupport: false,
        hasExclusiveEvents: false,
        birthdayBenefits: '',
        otherBenefits: []
      },
      isActive: true,
      sortOrder: 0,
      validityPeriod: 365
    });
  };

  const getLevelIcon = (level) => {
    const iconMap = {
      1: <Star className="h-6 w-6 text-gray-400" />,
      2: <Star className="h-6 w-6 text-blue-400" />,
      3: <Award className="h-6 w-6 text-purple-400" />,
      4: <Award className="h-6 w-6 text-yellow-400" />,
      5: <Crown className="h-6 w-6 text-red-400" />
    };
    return iconMap[level] || <Star className="h-6 w-6 text-gray-400" />;
  };

  const openEditModal = (level) => {
    setEditingLevel(level);
    setFormData({
      name: level.name,
      level: level.level,
      description: level.description,
      icon: level.icon,
      color: level.color,
      upgradeConditions: level.upgradeConditions,
      benefits: level.benefits,
      isActive: level.isActive,
      sortOrder: level.sortOrder,
      validityPeriod: level.validityPeriod
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">加载会员等级中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* 页面标题 */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-3">
            <Crown className="h-8 w-8 text-primary-600" />
            <h1 className="text-2xl font-bold text-gray-900">会员等级管理</h1>
            <span className="text-sm text-gray-500">({levels.length} 个等级)</span>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            创建等级
          </button>
        </div>

        {/* 等级列表 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {levels.map((level) => (
            <div key={level._id} className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    {getLevelIcon(level.level)}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{level.name}</h3>
                      <p className="text-sm text-gray-500">LV.{level.level}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => openEditModal(level)}
                      className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteLevel(level._id)}
                      className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <p className="text-gray-600 text-sm mb-4">{level.description}</p>

                {/* 升级条件 */}
                <div className="space-y-2 mb-4">
                  <h4 className="text-sm font-semibold text-gray-900">升级条件：</h4>
                  <div className="space-y-1 text-sm text-gray-600">
                    <div className="flex items-center space-x-2">
                      <Target className="h-4 w-4" />
                      <span>积分：{level.upgradeConditions.minPoints}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CreditCard className="h-4 w-4" />
                      <span>消费：¥{level.upgradeConditions.minTotalSpent}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Package className="h-4 w-4" />
                      <span>订单：{level.upgradeConditions.minOrders}</span>
                    </div>
                  </div>
                </div>

                {/* 权益 */}
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-gray-900">权益：</h4>
                  <div className="flex flex-wrap gap-2">
                    {level.benefits.discountRate > 0 && (
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">
                        {level.benefits.discountRate}%折扣
                      </span>
                    )}
                    {level.benefits.pointsMultiplier > 1 && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                        {level.benefits.pointsMultiplier}倍积分
                      </span>
                    )}
                    {level.benefits.freeShippingThreshold > 0 && (
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                        满¥{level.benefits.freeShippingThreshold}免运费
                      </span>
                    )}
                    {level.benefits.hasPrioritySupport && (
                      <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded">
                        专属客服
                      </span>
                    )}
                    {level.benefits.hasExclusiveEvents && (
                      <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded">
                        专属活动
                      </span>
                    )}
                  </div>
                </div>

                {/* 状态 */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">状态：</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      level.isActive 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {level.isActive ? '启用' : '停用'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 创建/编辑模态框 */}
        {(showCreateModal || editingLevel) && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                  {editingLevel ? '编辑会员等级' : '创建会员等级'}
                </h2>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingLevel(null);
                    resetForm();
                  }}
                  className="p-2 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-6">
                {/* 基本信息 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      等级名称
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                      placeholder="例如：黄金会员"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      等级编号
                    </label>
                    <input
                      type="number"
                      value={formData.level}
                      onChange={(e) => setFormData({ ...formData, level: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                      min="1"
                      max="10"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    等级描述
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                    rows="3"
                    placeholder="描述这个等级的特点和权益..."
                  />
                </div>

                {/* 升级条件 */}
                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <TrendingUp className="h-5 w-5 mr-2" />
                    升级条件
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        最低积分
                      </label>
                      <input
                        type="number"
                        value={formData.upgradeConditions.minPoints}
                        onChange={(e) => setFormData({
                          ...formData,
                          upgradeConditions: {
                            ...formData.upgradeConditions,
                            minPoints: parseInt(e.target.value)
                          }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                        min="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        最低消费金额
                      </label>
                      <input
                        type="number"
                        value={formData.upgradeConditions.minTotalSpent}
                        onChange={(e) => setFormData({
                          ...formData,
                          upgradeConditions: {
                            ...formData.upgradeConditions,
                            minTotalSpent: parseFloat(e.target.value)
                          }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                        min="0"
                        step="0.01"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        最低订单数
                      </label>
                      <input
                        type="number"
                        value={formData.upgradeConditions.minOrders}
                        onChange={(e) => setFormData({
                          ...formData,
                          upgradeConditions: {
                            ...formData.upgradeConditions,
                            minOrders: parseInt(e.target.value)
                          }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                        min="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        最低推荐数
                      </label>
                      <input
                        type="number"
                        value={formData.upgradeConditions.minReferrals}
                        onChange={(e) => setFormData({
                          ...formData,
                          upgradeConditions: {
                            ...formData.upgradeConditions,
                            minReferrals: parseInt(e.target.value)
                          }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                        min="0"
                      />
                    </div>
                  </div>
                </div>

                {/* 权益配置 */}
                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <Gift className="h-5 w-5 mr-2" />
                    权益配置
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        折扣率 (%)
                      </label>
                      <input
                        type="number"
                        value={formData.benefits.discountRate}
                        onChange={(e) => setFormData({
                          ...formData,
                          benefits: {
                            ...formData.benefits,
                            discountRate: parseInt(e.target.value)
                          }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                        min="0"
                        max="100"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        积分倍数
                      </label>
                      <input
                        type="number"
                        value={formData.benefits.pointsMultiplier}
                        onChange={(e) => setFormData({
                          ...formData,
                          benefits: {
                            ...formData.benefits,
                            pointsMultiplier: parseFloat(e.target.value)
                          }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                        min="1"
                        step="0.1"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        免运费门槛
                      </label>
                      <input
                        type="number"
                        value={formData.benefits.freeShippingThreshold}
                        onChange={(e) => setFormData({
                          ...formData,
                          benefits: {
                            ...formData.benefits,
                            freeShippingThreshold: parseFloat(e.target.value)
                          }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                        min="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        有效期 (天)
                      </label>
                      <input
                        type="number"
                        value={formData.validityPeriod}
                        onChange={(e) => setFormData({ ...formData, validityPeriod: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                        min="1"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.benefits.hasPrioritySupport}
                        onChange={(e) => setFormData({
                          ...formData,
                          benefits: {
                            ...formData.benefits,
                            hasPrioritySupport: e.target.checked
                          }
                        })}
                        className="mr-2"
                      />
                      <label className="text-sm text-gray-700">专属客服</label>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.benefits.hasExclusiveEvents}
                        onChange={(e) => setFormData({
                          ...formData,
                          benefits: {
                            ...formData.benefits,
                            hasExclusiveEvents: e.target.checked
                          }
                        })}
                        className="mr-2"
                      />
                      <label className="text-sm text-gray-700">专属活动</label>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.isActive}
                        onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                        className="mr-2"
                      />
                      <label className="text-sm text-gray-700">启用状态</label>
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      生日特权
                    </label>
                    <input
                      type="text"
                      value={formData.benefits.birthdayBenefits}
                      onChange={(e) => setFormData({
                        ...formData,
                        benefits: {
                          ...formData.benefits,
                          birthdayBenefits: e.target.value
                        }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                      placeholder="例如：生日当月享受额外8折优惠"
                    />
                  </div>
                </div>

                {/* 操作按钮 */}
                <div className="flex justify-end space-x-4 pt-6 border-t">
                  <button
                    onClick={() => {
                      setShowCreateModal(false);
                      setEditingLevel(null);
                      resetForm();
                    }}
                    className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    取消
                  </button>
                  <button
                    onClick={editingLevel ? handleUpdateLevel : handleCreateLevel}
                    className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors flex items-center"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {editingLevel ? '更新' : '创建'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminMembershipPage;