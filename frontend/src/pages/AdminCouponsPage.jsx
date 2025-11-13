import React, { useState, useEffect } from 'react';
import { couponAPI } from '../services/api';
import { 
  Tag, 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Edit3, 
  Trash2, 
  Eye,
  Loader,
  Calendar,
  Percent,
  DollarSign,
  Users,
  BarChart3
} from 'lucide-react';

const AdminCouponsPage = () => {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCoupon, setSelectedCoupon] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    type: '',
    page: 1,
    limit: 10,
    search: ''
  });
  const [pagination, setPagination] = useState({});
  const [showFilters, setShowFilters] = useState(false);

  // 表单状态
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    discountType: 'percentage',
    discountValue: '',
    minOrderAmount: '',
    maxDiscountAmount: '',
    usageLimit: '',
    usageLimitPerUser: '',
    validFrom: '',
    validUntil: '',
    isActive: true,
    applicableCategories: [],
    applicableProducts: []
  });

  useEffect(() => {
    fetchCoupons();
  }, [filters]);

  const fetchCoupons = async () => {
    try {
      setLoading(true);
      const result = await couponAPI.getCoupons(filters);
      if (result.success) {
        setCoupons(result.data);
        setPagination(result.pagination);
      } else {
        setError(result.error || '获取优惠券失败');
      }
    } catch (err) {
      console.error('获取优惠券失败:', err);
      setError(err.response?.data?.error || '获取优惠券失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: key === 'page' ? value : 1
    }));
  };

  const handleCreateCoupon = async (e) => {
    e.preventDefault();
    try {
      const result = await couponAPI.createCoupon(formData);
      if (result.success) {
        alert('优惠券创建成功');
        setShowCreateModal(false);
        setFormData({
          name: '',
          code: '',
          description: '',
          discountType: 'percentage',
          discountValue: '',
          minOrderAmount: '',
          maxDiscountAmount: '',
          usageLimit: '',
          usageLimitPerUser: '',
          validFrom: '',
          validUntil: '',
          isActive: true,
          applicableCategories: [],
          applicableProducts: []
        });
        fetchCoupons();
      } else {
        alert(result.error || '创建优惠券失败');
      }
    } catch (err) {
      console.error('创建优惠券失败:', err);
      alert('创建优惠券失败，请稍后重试');
    }
  };

  const handleEditCoupon = async (e) => {
    e.preventDefault();
    try {
      const result = await couponAPI.updateCoupon(selectedCoupon._id, formData);
      if (result.success) {
        alert('优惠券更新成功');
        setShowEditModal(false);
        setSelectedCoupon(null);
        fetchCoupons();
      } else {
        alert(result.error || '更新优惠券失败');
      }
    } catch (err) {
      console.error('更新优惠券失败:', err);
      alert('更新优惠券失败，请稍后重试');
    }
  };

  const handleDeleteCoupon = async (couponId) => {
    if (!confirm('确定要删除这个优惠券吗？此操作不可恢复。')) {
      return;
    }
    
    try {
      const result = await couponAPI.deleteCoupon(couponId);
      if (result.success) {
        alert('优惠券删除成功');
        fetchCoupons();
      } else {
        alert(result.error || '删除优惠券失败');
      }
    } catch (err) {
      console.error('删除优惠券失败:', err);
      alert('删除优惠券失败，请稍后重试');
    }
  };

  const handleEditClick = (coupon) => {
    setSelectedCoupon(coupon);
    setFormData({
      name: coupon.name,
      code: coupon.code,
      description: coupon.description || '',
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      minOrderAmount: coupon.minOrderAmount || '',
      maxDiscountAmount: coupon.maxDiscountAmount || '',
      usageLimit: coupon.usageLimit || '',
      usageLimitPerUser: coupon.usageLimitPerUser || '',
      validFrom: coupon.validFrom ? new Date(coupon.validFrom).toISOString().split('T')[0] : '',
      validUntil: coupon.validUntil ? new Date(coupon.validUntil).toISOString().split('T')[0] : '',
      isActive: coupon.isActive,
      applicableCategories: coupon.applicableCategories || [],
      applicableProducts: coupon.applicableProducts || []
    });
    setShowEditModal(true);
  };

  const getStatusText = (coupon) => {
    const now = new Date();
    const validFrom = new Date(coupon.validFrom);
    const validUntil = new Date(coupon.validUntil);
    
    if (!coupon.isActive) return '已禁用';
    if (now < validFrom) return '未开始';
    if (now > validUntil) return '已过期';
    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) return '已用完';
    return '进行中';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case '进行中': return 'text-green-600 bg-green-100';
      case '已过期': return 'text-gray-600 bg-gray-100';
      case '未开始': return 'text-blue-600 bg-blue-100';
      case '已禁用': return 'text-red-600 bg-red-100';
      case '已用完': return 'text-orange-600 bg-orange-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getDiscountIcon = (type) => {
    return type === 'percentage' ? 
      <Percent className="h-4 w-4" /> : 
      <DollarSign className="h-4 w-4" />;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('zh-CN');
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY'
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <Loader className="h-8 w-8 text-primary-600 animate-spin mr-3" />
          <span className="text-gray-600">加载优惠券中...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-3">
          <Tag className="h-8 w-8 text-primary-600" />
          <h1 className="text-2xl font-bold text-gray-900">优惠券管理</h1>
          <span className="text-sm text-gray-500">
            ({pagination.totalItems || 0} 张优惠券)
          </span>
        </div>
        
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <Filter className="h-4 w-4 mr-2" />
            筛选
          </button>
          
          <button 
            onClick={() => setShowCreateModal(true)}
            className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            新建优惠券
          </button>
        </div>
      </div>

      {/* 筛选面板 */}
      {showFilters && (
        <div className="bg-white border rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">优惠券筛选</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                优惠券状态
              </label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">全部状态</option>
                <option value="active">进行中</option>
                <option value="expired">已过期</option>
                <option value="upcoming">未开始</option>
                <option value="disabled">已禁用</option>
                <option value="used_up">已用完</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                优惠类型
              </label>
              <select
                value={filters.type}
                onChange={(e) => handleFilterChange('type', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">全部类型</option>
                <option value="percentage">百分比折扣</option>
                <option value="fixed">固定金额</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                搜索优惠券
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  placeholder="优惠券名称、代码..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 优惠券列表 */}
      <div className="bg-white border rounded-lg overflow-hidden">
        {/* 表格头部 */}
        <div className="bg-gray-50 px-6 py-3 grid grid-cols-12 gap-4 text-sm font-medium text-gray-700">
          <div className="col-span-2">优惠券信息</div>
          <div className="col-span-2">折扣信息</div>
          <div className="col-span-2">使用限制</div>
          <div className="col-span-2">有效期</div>
          <div className="col-span-2">状态/使用情况</div>
          <div className="col-span-2">操作</div>
        </div>

        {/* 优惠券行 */}
        {coupons.length === 0 ? (
          <div className="text-center py-12">
            <Tag className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">暂无优惠券</h3>
            <p className="text-gray-500">没有找到符合条件的优惠券</p>
          </div>
        ) : (
          coupons.map((coupon) => {
            const status = getStatusText(coupon);
            return (
              <div key={coupon._id} className="border-t px-6 py-4 grid grid-cols-12 gap-4 items-center text-sm">
                {/* 优惠券信息 */}
                <div className="col-span-2">
                  <div className="font-medium">{coupon.name}</div>
                  <div className="text-gray-500 text-xs font-mono">{coupon.code}</div>
                  {coupon.description && (
                    <div className="text-gray-500 text-xs mt-1">{coupon.description}</div>
                  )}
                </div>

                {/* 折扣信息 */}
                <div className="col-span-2">
                  <div className="flex items-center space-x-1">
                    {getDiscountIcon(coupon.discountType)}
                    <span className="font-medium text-green-600">
                      {coupon.discountType === 'percentage' 
                        ? `${coupon.discountValue}%` 
                        : formatCurrency(coupon.discountValue)
                      }
                    </span>
                  </div>
                  {coupon.minOrderAmount > 0 && (
                    <div className="text-gray-500 text-xs mt-1">
                      最低消费: {formatCurrency(coupon.minOrderAmount)}
                    </div>
                  )}
                </div>

                {/* 使用限制 */}
                <div className="col-span-2">
                  <div className="flex items-center space-x-1 text-xs">
                    <Users className="h-3 w-3" />
                    <span>
                      {coupon.usageLimitPerUser || '无限'} 次/人
                    </span>
                  </div>
                  <div className="text-gray-500 text-xs mt-1">
                    总次数: {coupon.usageLimit || '无限'}
                  </div>
                </div>

                {/* 有效期 */}
                <div className="col-span-2">
                  <div className="flex items-center space-x-1 text-xs">
                    <Calendar className="h-3 w-3" />
                    <span>{formatDate(coupon.validFrom)}</span>
                  </div>
                  <div className="text-gray-500 text-xs mt-1">
                    至 {formatDate(coupon.validUntil)}
                  </div>
                </div>

                {/* 状态/使用情况 */}
                <div className="col-span-2">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
                    {status}
                  </span>
                  <div className="text-gray-500 text-xs mt-1">
                    已使用: {coupon.usedCount || 0} 次
                  </div>
                </div>

                {/* 操作 */}
                <div className="col-span-2">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setSelectedCoupon(coupon)}
                      className="p-1 text-blue-600 hover:text-blue-800"
                      title="查看详情"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    
                    <button
                      onClick={() => handleEditClick(coupon)}
                      className="p-1 text-green-600 hover:text-green-800"
                      title="编辑"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                    
                    <button
                      onClick={() => handleDeleteCoupon(coupon._id)}
                      className="p-1 text-red-600 hover:text-red-800"
                      title="删除"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 分页控件 */}
      {pagination.totalPages > 1 && (
        <div className="flex justify-center items-center mt-6 space-x-2">
          <button
            onClick={() => handleFilterChange('page', filters.page - 1)}
            disabled={filters.page === 1}
            className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            上一页
          </button>
          
          <span className="text-sm text-gray-600">
            第 {filters.page} 页，共 {pagination.totalPages} 页
          </span>
          
          <button
            onClick={() => handleFilterChange('page', filters.page + 1)}
            disabled={filters.page === pagination.totalPages}
            className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            下一页
          </button>
        </div>
      )}

      {/* 创建优惠券模态框 */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold">新建优惠券</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleCreateCoupon} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    优惠券名称 *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    优惠券代码 *
                  </label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({...formData, code: e.target.value.toUpperCase()})}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  描述
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    折扣类型 *
                  </label>
                  <select
                    value={formData.discountType}
                    onChange={(e) => setFormData({...formData, discountType: e.target.value})}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="percentage">百分比折扣</option>
                    <option value="fixed">固定金额</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    折扣值 *
                  </label>
                  <input
                    type="number"
                    value={formData.discountValue}
                    onChange={(e) => setFormData({...formData, discountValue: e.target.value})}
                    required
                    min="0"
                    step={formData.discountType === 'percentage' ? '1' : '0.01'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    最低订单金额
                  </label>
                  <input
                    type="number"
                    value={formData.minOrderAmount}
                    onChange={(e) => setFormData({...formData, minOrderAmount: e.target.value})}
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    最大折扣金额
                  </label>
                  <input
                    type="number"
                    value={formData.maxDiscountAmount}
                    onChange={(e) => setFormData({...formData, maxDiscountAmount: e.target.value})}
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    总使用次数限制
                  </label>
                  <input
                    type="number"
                    value={formData.usageLimit}
                    onChange={(e) => setFormData({...formData, usageLimit: e.target.value})}
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    单用户使用次数限制
                  </label>
                  <input
                    type="number"
                    value={formData.usageLimitPerUser}
                    onChange={(e) => setFormData({...formData, usageLimitPerUser: e.target.value})}
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    开始时间 *
                  </label>
                  <input
                    type="date"
                    value={formData.validFrom}
                    onChange={(e) => setFormData({...formData, validFrom: e.target.value})}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    结束时间 *
                  </label>
                  <input
                    type="date"
                    value={formData.validUntil}
                    onChange={(e) => setFormData({...formData, validUntil: e.target.value})}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">立即启用</span>
                </label>
              </div>

              <div className="flex justify-end space-x-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary-600 text-white rounded-md text-sm font-medium hover:bg-primary-700"
                >
                  创建优惠券
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 编辑优惠券模态框 */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold">编辑优惠券</h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleEditCoupon} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    优惠券名称 *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    优惠券代码 *
                  </label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({...formData, code: e.target.value.toUpperCase()})}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  描述
                </label>
                <textarea
                  value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    折扣类型 *
                  </label>
                  <select
                    value={formData.discountType}
                    onChange={(e) => setFormData({...formData, discountType: e.target.value})}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="percentage">百分比折扣</option>
                    <option value="fixed">固定金额</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    折扣值 *
                  </label>
                  <input
                    type="number"
                    value={formData.discountValue}
                    onChange={(e) => setFormData({...formData, discountValue: e.target.value})}
                    required
                    min="0"
                    step={formData.discountType === 'percentage' ? '1' : '0.01'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    最低订单金额
                  </label>
                  <input
                    type="number"
                    value={formData.minOrderAmount}
                    onChange={(e) => setFormData({...formData, minOrderAmount: e.target.value})}
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    最大折扣金额
                  </label>
                  <input
                    type="number"
                    value={formData.maxDiscountAmount}
                    onChange={(e) => setFormData({...formData, maxDiscountAmount: e.target.value})}
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    总使用次数限制
                  </label>
                  <input
                    type="number"
                    value={formData.usageLimit}
                    onChange={(e) => setFormData({...formData, usageLimit: e.target.value})}
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    单用户使用次数限制
                  </label>
                  <input
                    type="number"
                    value={formData.usageLimitPerUser}
                    onChange={(e) => setFormData({...formData, usageLimitPerUser: e.target.value})}
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    开始时间 *
                  </label>
                  <input
                    type="date"
                    value={formData.validFrom}
                    onChange={(e) => setFormData({...formData, validFrom: e.target.value})}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    结束时间 *
                  </label>
                  <input
                    type="date"
                    value={formData.validUntil}
                    onChange={(e) => setFormData({...formData, validUntil: e.target.value})}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">立即启用</span>
                </label>
              </div>

              <div className="flex justify-end space-x-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary-600 text-white rounded-md text-sm font-medium hover:bg-primary-700"
                >
                  更新优惠券
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCouponsPage;