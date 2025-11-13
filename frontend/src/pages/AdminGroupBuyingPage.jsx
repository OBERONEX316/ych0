import React, { useState, useEffect } from 'react';
import { 
  Plus, Edit, Trash2, Eye, Search, Filter, Calendar, Users, 
  DollarSign, TrendingUp, Clock, CheckCircle, XCircle,
  ChevronLeft, ChevronRight, BarChart3, PieChart, Download
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import groupBuyingAPI from '../services/groupBuyingAPI';
import { toast } from 'sonner';

const AdminGroupBuyingPage = () => {
  const { user } = useAuth();
  const [groupBuying, setGroupBuying] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statistics, setStatistics] = useState(null);
  const [filters, setFilters] = useState({
    status: '',
    search: '',
    page: 1,
    limit: 10
  });
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0
  });
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('create'); // create, edit, view
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    product: '',
    originalPrice: '',
    groupPrice: '',
    minParticipants: 2,
    maxParticipants: 10,
    startTime: '',
    endTime: '',
    maxGroups: 100,
    conditions: {
      maxQuantityPerUser: 5,
      requireEmailVerification: true
    }
  });

  useEffect(() => {
    fetchGroupBuying();
    fetchStatistics();
  }, [filters]);

  const fetchGroupBuying = async () => {
    try {
      setLoading(true);
      const response = await groupBuyingAPI.getAllGroupBuying(filters);
      setGroupBuying(response.data);
      setPagination(response.pagination);
    } catch (error) {
      console.error('Failed to fetch group buying:', error);
      toast.error('获取团购活动失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchStatistics = async () => {
    try {
      const response = await groupBuyingAPI.getStatistics({ timeRange: '30d' });
      setStatistics(response.data);
    } catch (error) {
      console.error('Failed to fetch statistics:', error);
    }
  };

  const handleCreate = () => {
    setModalType('create');
    setSelectedActivity(null);
    setFormData({
      name: '',
      description: '',
      product: '',
      originalPrice: '',
      groupPrice: '',
      minParticipants: 2,
      maxParticipants: 10,
      startTime: '',
      endTime: '',
      maxGroups: 100,
      conditions: {
        maxQuantityPerUser: 5,
        requireEmailVerification: true
      }
    });
    setShowModal(true);
  };

  const handleEdit = (activity) => {
    setModalType('edit');
    setSelectedActivity(activity);
    setFormData({
      name: activity.name,
      description: activity.description,
      product: activity.product?._id || '',
      originalPrice: activity.originalPrice,
      groupPrice: activity.groupPrice,
      minParticipants: activity.minParticipants,
      maxParticipants: activity.maxParticipants,
      startTime: activity.startTime ? new Date(activity.startTime).toISOString().slice(0, 16) : '',
      endTime: activity.endTime ? new Date(activity.endTime).toISOString().slice(0, 16) : '',
      maxGroups: activity.maxGroups,
      conditions: {
        maxQuantityPerUser: activity.conditions?.maxQuantityPerUser || 5,
        requireEmailVerification: activity.conditions?.requireEmailVerification !== false
      }
    });
    setShowModal(true);
  };

  const handleView = (activity) => {
    setModalType('view');
    setSelectedActivity(activity);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (modalType === 'create') {
        await groupBuyingAPI.createGroupBuying(formData);
        toast.success('团购活动创建成功');
      } else {
        await groupBuyingAPI.updateGroupBuying(selectedActivity._id, formData);
        toast.success('团购活动更新成功');
      }
      
      setShowModal(false);
      fetchGroupBuying();
      fetchStatistics();
    } catch (error) {
      console.error('Failed to save group buying:', error);
      toast.error(error.message || '保存失败');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('确定要删除这个团购活动吗？')) return;
    
    try {
      await groupBuyingAPI.deleteGroupBuying(id);
      toast.success('团购活动删除成功');
      fetchGroupBuying();
      fetchStatistics();
    } catch (error) {
      console.error('Failed to delete group buying:', error);
      toast.error('删除失败');
    }
  };

  const handleCancel = async (id) => {
    if (!window.confirm('确定要取消这个团购活动吗？')) return;
    
    try {
      await groupBuyingAPI.cancelGroupBuying(id, '管理员取消');
      toast.success('团购活动已取消');
      fetchGroupBuying();
      fetchStatistics();
    } catch (error) {
      console.error('Failed to cancel group buying:', error);
      toast.error('取消失败');
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: 1
    }));
  };

  const handlePageChange = (page) => {
    setFilters(prev => ({
      ...prev,
      page
    }));
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('zh-CN');
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

  const exportData = () => {
    const data = groupBuying.map(activity => ({
      名称: activity.name,
      商品: activity.product?.name || '未知商品',
      原价: activity.originalPrice,
      团购价: activity.groupPrice,
      折扣: `${activity.discountPercentage}%`,
      状态: getStatusText(activity.status),
      开始时间: formatDate(activity.startTime),
      结束时间: formatDate(activity.endTime),
      总小组数: activity.statistics?.totalGroups || 0,
      成功小组数: activity.statistics?.successfulGroups || 0,
      参与人数: activity.statistics?.totalParticipants || 0,
      总收入: activity.statistics?.totalRevenue || 0
    }));
    
    const csv = [
      Object.keys(data[0]).join(','),
      ...data.map(row => Object.values(row).join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `团购活动数据_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">团购管理</h1>
        <p className="text-gray-600">管理团购活动，查看统计数据</p>
      </div>

      {/* Statistics Cards */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">总活动数</p>
                <p className="text-2xl font-bold text-gray-900">{statistics.totalActivities}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">活跃活动</p>
                <p className="text-2xl font-bold text-gray-900">{statistics.activeActivities}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">成功率</p>
                <p className="text-2xl font-bold text-gray-900">{statistics.successRate.toFixed(1)}%</p>
              </div>
              <PieChart className="h-8 w-8 text-purple-600" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">总收入</p>
                <p className="text-2xl font-bold text-gray-900">¥{statistics.totalRevenue.toFixed(2)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-yellow-600" />
            </div>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="搜索团购活动..."
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
              />
            </div>

            {/* Status Filter */}
            <select
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
            >
              <option value="">全部状态</option>
              <option value="active">进行中</option>
              <option value="scheduled">即将开始</option>
              <option value="ended">已结束</option>
              <option value="cancelled">已取消</option>
            </select>

            {/* Limit per page */}
            <select
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={filters.limit}
              onChange={(e) => handleFilterChange('limit', parseInt(e.target.value))}
            >
              <option value={10}>每页 10 个</option>
              <option value={20}>每页 20 个</option>
              <option value={50}>每页 50 个</option>
            </select>
          </div>

          <div className="flex gap-2">
            <button
              onClick={exportData}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center"
            >
              <Download className="w-4 h-4 mr-2" />
              导出
            </button>
            <button
              onClick={handleCreate}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
            >
              <Plus className="w-4 h-4 mr-2" />
              创建团购
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  活动信息
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  商品
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  价格信息
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  时间
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  统计
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  状态
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {groupBuying.map((activity) => (
                <tr key={activity._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{activity.name}</div>
                      <div className="text-sm text-gray-500 line-clamp-2">{activity.description}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <img
                        src={activity.product?.images?.[0]?.url || '/api/placeholder/50/50'}
                        alt={activity.product?.name}
                        className="w-10 h-10 rounded-lg object-cover mr-3"
                      />
                      <div>
                        <div className="text-sm font-medium text-gray-900">{activity.product?.name}</div>
                        <div className="text-sm text-gray-500">ID: {activity.product?._id?.slice(-6)}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      <div className="font-medium">团购价: ¥{activity.groupPrice}</div>
                      <div className="text-gray-500 line-through">原价: ¥{activity.originalPrice}</div>
                      <div className="text-red-600 font-medium">折扣: {activity.discountPercentage}%</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div>
                      <div>开始: {formatDate(activity.startTime)}</div>
                      <div>结束: {formatDate(activity.endTime)}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div>
                      <div>小组: {activity.statistics?.totalGroups || 0}</div>
                      <div>成功: {activity.statistics?.successfulGroups || 0}</div>
                      <div>参与: {activity.statistics?.totalParticipants || 0}</div>
                      <div className="font-medium">收入: ¥{activity.statistics?.totalRevenue?.toFixed(2) || 0}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(activity.status)}`}>
                      {getStatusText(activity.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleView(activity)}
                        className="text-blue-600 hover:text-blue-900"
                        title="查看详情"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleEdit(activity)}
                        className="text-yellow-600 hover:text-yellow-900"
                        title="编辑"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      {activity.status === 'active' && (
                        <button
                          onClick={() => handleCancel(activity._id)}
                          className="text-orange-600 hover:text-orange-900"
                          title="取消活动"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(activity._id)}
                        className="text-red-600 hover:text-red-900"
                        title="删除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="bg-gray-50 px-6 py-3 flex items-center justify-between border-t border-gray-200">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handlePageChange(pagination.currentPage - 1)}
                disabled={pagination.currentPage === 1}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              <div className="flex space-x-1">
                {[...Array(Math.min(5, pagination.totalPages))].map((_, index) => {
                  const pageNum = Math.max(1, Math.min(pagination.totalPages - 4, pagination.currentPage - 2)) + index;
                  if (pageNum > pagination.totalPages) return null;
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      className={`px-3 py-2 text-sm font-medium rounded-md ${
                        pagination.currentPage === pageNum
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
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
                className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            
            <div className="text-sm text-gray-700">
              第 {pagination.currentPage} 页，共 {pagination.totalPages} 页，共 {pagination.totalItems} 条记录
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl bg-white rounded-lg shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {modalType === 'create' ? '创建团购活动' : modalType === 'edit' ? '编辑团购活动' : '团购活动详情'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">活动名称</label>
                  <input
                    type="text"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    disabled={modalType === 'view'}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">商品ID</label>
                  <input
                    type="text"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={formData.product}
                    onChange={(e) => setFormData(prev => ({ ...prev, product: e.target.value }))}
                    disabled={modalType === 'view'}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">活动描述</label>
                <textarea
                  required
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  disabled={modalType === 'view'}
                />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">原价</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={formData.originalPrice}
                    onChange={(e) => setFormData(prev => ({ ...prev, originalPrice: parseFloat(e.target.value) }))}
                    disabled={modalType === 'view'}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">团购价</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={formData.groupPrice}
                    onChange={(e) => setFormData(prev => ({ ...prev, groupPrice: parseFloat(e.target.value) }))}
                    disabled={modalType === 'view'}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">最少人数</label>
                  <input
                    type="number"
                    min="2"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={formData.minParticipants}
                    onChange={(e) => setFormData(prev => ({ ...prev, minParticipants: parseInt(e.target.value) }))}
                    disabled={modalType === 'view'}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">最多人数</label>
                  <input
                    type="number"
                    min="2"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={formData.maxParticipants}
                    onChange={(e) => setFormData(prev => ({ ...prev, maxParticipants: parseInt(e.target.value) }))}
                    disabled={modalType === 'view'}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">开始时间</label>
                  <input
                    type="datetime-local"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={formData.startTime}
                    onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
                    disabled={modalType === 'view'}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">结束时间</label>
                  <input
                    type="datetime-local"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={formData.endTime}
                    onChange={(e) => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
                    disabled={modalType === 'view'}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">最大小组数</label>
                <input
                  type="number"
                  min="1"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={formData.maxGroups}
                  onChange={(e) => setFormData(prev => ({ ...prev, maxGroups: parseInt(e.target.value) }))}
                  disabled={modalType === 'view'}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">每人限购数量</label>
                  <input
                    type="number"
                    min="1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={formData.conditions.maxQuantityPerUser}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      conditions: { ...prev.conditions, maxQuantityPerUser: parseInt(e.target.value) }
                    }))}
                    disabled={modalType === 'view'}
                  />
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    className="mr-2"
                    checked={formData.conditions.requireEmailVerification}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      conditions: { ...prev.conditions, requireEmailVerification: e.target.checked }
                    }))}
                    disabled={modalType === 'view'}
                  />
                  <label className="text-sm font-medium text-gray-700">需要邮箱验证</label>
                </div>
              </div>

              {modalType !== 'view' && (
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                  >
                    {modalType === 'create' ? '创建' : '更新'}
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminGroupBuyingPage;