import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Eye, Clock, Users, TrendingUp, Play, Square, BarChart3 } from 'lucide-react';
import { flashSaleAPI } from '../services/api';
import { toast } from 'sonner';

const AdminFlashSalesPage = () => {
  const [flashSales, setFlashSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [selectedSale, setSelectedSale] = useState(null);
  const [stats, setStats] = useState(null);

  // 表单状态
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    startTime: '',
    endTime: '',
    products: [],
    status: 'draft'
  });

  useEffect(() => {
    fetchFlashSales();
  }, []);

  const fetchFlashSales = async () => {
    try {
      setLoading(true);
      const response = await flashSaleAPI.getAllSales();
      if (response.success) {
        setFlashSales(response.data);
      }
    } catch (error) {
      console.error('获取秒杀活动失败:', error);
      toast.error('获取秒杀活动失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setFormData({
      title: '',
      description: '',
      startTime: '',
      endTime: '',
      products: [],
      status: 'draft'
    });
    setShowCreateModal(true);
  };

  const handleEdit = (sale) => {
    setSelectedSale(sale);
    setFormData({
      title: sale.title,
      description: sale.description,
      startTime: new Date(sale.startTime).toISOString().slice(0, 16),
      endTime: new Date(sale.endTime).toISOString().slice(0, 16),
      products: sale.products,
      status: sale.status
    });
    setShowEditModal(true);
  };

  const handleDelete = async (saleId) => {
    if (window.confirm('确定要删除这个秒杀活动吗？')) {
      try {
        const response = await flashSaleAPI.deleteSale(saleId);
        if (response.success) {
          toast.success('删除成功');
          fetchFlashSales();
        }
      } catch (error) {
        console.error('删除失败:', error);
        toast.error('删除失败');
      }
    }
  };

  const handleViewStats = async (sale) => {
    try {
      setSelectedSale(sale);
      const response = await flashSaleAPI.getStatistics(sale._id);
      if (response.success) {
        setStats(response.data);
        setShowStatsModal(true);
      }
    } catch (error) {
      console.error('获取统计失败:', error);
      toast.error('获取统计失败');
    }
  };

  const handleSubmitCreate = async (e) => {
    e.preventDefault();
    try {
      const response = await flashSaleAPI.createSale(formData);
      if (response.success) {
        toast.success('创建成功');
        setShowCreateModal(false);
        fetchFlashSales();
      }
    } catch (error) {
      console.error('创建失败:', error);
      toast.error('创建失败');
    }
  };

  const handleSubmitEdit = async (e) => {
    e.preventDefault();
    try {
      const response = await flashSaleAPI.updateSale(selectedSale._id, formData);
      if (response.success) {
        toast.success('更新成功');
        setShowEditModal(false);
        fetchFlashSales();
      }
    } catch (error) {
      console.error('更新失败:', error);
      toast.error('更新失败');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      draft: 'bg-gray-100 text-gray-800',
      scheduled: 'bg-blue-100 text-blue-800',
      active: 'bg-green-100 text-green-800',
      ended: 'bg-red-100 text-red-800',
      cancelled: 'bg-yellow-100 text-yellow-800'
    };
    return colors[status] || colors.draft;
  };

  const getStatusText = (status) => {
    const texts = {
      draft: '草稿',
      scheduled: '已安排',
      active: '进行中',
      ended: '已结束',
      cancelled: '已取消'
    };
    return texts[status] || status;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 页面头部 */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">秒杀活动管理</h1>
            <p className="text-gray-600 mt-1">创建和管理限时秒杀活动</p>
          </div>
          <button
            onClick={handleCreate}
            className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Plus className="h-5 w-5 mr-2" />
            创建活动
          </button>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">总活动数</p>
                <p className="text-2xl font-bold text-gray-900">{flashSales.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <Play className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">进行中</p>
                <p className="text-2xl font-bold text-gray-900">
                  {flashSales.filter(s => s.status === 'active').length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">即将开始</p>
                <p className="text-2xl font-bold text-gray-900">
                  {flashSales.filter(s => s.status === 'scheduled').length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">总参与人数</p>
                <p className="text-2xl font-bold text-gray-900">
                  {flashSales.reduce((sum, sale) => sum + sale.statistics.totalParticipants, 0)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 活动列表 */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">秒杀活动列表</h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    活动信息
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    状态
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    时间
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    统计
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {flashSales.map((sale) => (
                  <tr key={sale._id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <img
                          className="h-10 w-10 rounded-lg object-cover"
                          src={sale.image || '/images/flash-sale-default.jpg'}
                          alt={sale.title}
                        />
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{sale.title}</div>
                          <div className="text-sm text-gray-500">{sale.products.length} 个商品</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(sale.status)}`}>
                        {getStatusText(sale.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div>开始: {new Date(sale.startTime).toLocaleString()}</div>
                      <div>结束: {new Date(sale.endTime).toLocaleString()}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div>浏览: {sale.statistics.totalViews}</div>
                      <div>参与: {sale.statistics.totalParticipants}</div>
                      <div>订单: {sale.statistics.totalOrders}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleViewStats(sale)}
                          className="text-blue-600 hover:text-blue-900"
                          title="查看统计"
                        >
                          <BarChart3 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleEdit(sale)}
                          className="text-indigo-600 hover:text-indigo-900"
                          title="编辑"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(sale._id)}
                          className="text-red-600 hover:text-red-900"
                          title="删除"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 创建/编辑模态框 */}
        {(showCreateModal || showEditModal) && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  {showCreateModal ? '创建秒杀活动' : '编辑秒杀活动'}
                </h3>
                <form onSubmit={showCreateModal ? handleSubmitCreate : handleSubmitEdit}>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">标题</label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({...formData, title: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      required
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">描述</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      rows={3}
                      required
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">开始时间</label>
                    <input
                      type="datetime-local"
                      value={formData.startTime}
                      onChange={(e) => setFormData({...formData, startTime: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      required
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">结束时间</label>
                    <input
                      type="datetime-local"
                      value={formData.endTime}
                      onChange={(e) => setFormData({...formData, endTime: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      required
                    />
                  </div>
                  <div className="flex items-center justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => {
                        setShowCreateModal(false);
                        setShowEditModal(false);
                      }}
                      className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      取消
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
                    >
                      {showCreateModal ? '创建' : '更新'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* 统计模态框 */}
        {showStatsModal && stats && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">活动统计</h3>
                  <button
                    onClick={() => setShowStatsModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ×
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">基础统计</h4>
                    <div className="text-sm text-gray-600 space-y-1">
                      <div>浏览量: {stats.basicStats.totalViews}</div>
                      <div>参与人数: {stats.basicStats.totalParticipants}</div>
                      <div>订单数: {stats.basicStats.totalOrders}</div>
                      <div>转化率: {stats.basicStats.conversionRate.toFixed(2)}%</div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">订单统计</h4>
                    <div className="text-sm text-gray-600 space-y-1">
                      <div>总订单: {stats.orderStats.totalOrders}</div>
                      <div>总收入: ¥{stats.orderStats.totalRevenue}</div>
                      <div>总商品数: {stats.orderStats.totalItems}</div>
                    </div>
                  </div>
                  
                  {stats.productStats && stats.productStats.length > 0 && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">商品统计</h4>
                      <div className="text-sm text-gray-600 space-y-1">
                        {stats.productStats.map((product, index) => (
                          <div key={index}>
                            {product.productName}: {product.totalQuantity}件, ¥{product.totalRevenue}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminFlashSalesPage;