import React, { useState, useEffect } from 'react';
import { userAdminAPI } from '../services/api';
import { 
  Users, 
  Mail, 
  Phone, 
  Calendar, 
  Eye, 
  Edit3, 
  Trash2,
  Loader,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  UserCheck,
  UserX
} from 'lucide-react';

const AdminUsersPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [filters, setFilters] = useState({
    role: '',
    isActive: '',
    search: '',
    page: 1,
    limit: 10
  });
  const [pagination, setPagination] = useState({});
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, [filters]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await userAdminAPI.getAllUsers(filters);
      if (response.data.success) {
        setUsers(response.data.data);
        setPagination(response.data.pagination);
      } else {
        setError(response.data.error || '获取用户数据失败');
      }
    } catch (err) {
      console.error('获取用户数据失败:', err);
      setError(err.response?.data?.error || '获取用户数据失败，请稍后重试');
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

  const handleStatusUpdate = async (userId, isActive) => {
    try {
      const response = await userAdminAPI.updateUserStatus(userId, { isActive });
      if (response.data.success) {
        setUsers(prev => prev.map(user => 
          user._id === userId ? { ...user, isActive } : user
        ));
        alert(`用户已${isActive ? '启用' : '禁用'}`);
      } else {
        alert(response.data.error || '更新用户状态失败');
      }
    } catch (err) {
      console.error('更新用户状态失败:', err);
      alert('更新用户状态失败，请稍后重试');
    }
  };

  const handleRoleUpdate = async (userId, role) => {
    try {
      const response = await userAdminAPI.updateUserRole(userId, { role });
      if (response.data.success) {
        setUsers(prev => prev.map(user => 
          user._id === userId ? { ...user, role } : user
        ));
        alert('用户角色更新成功');
      } else {
        alert(response.data.error || '更新用户角色失败');
      }
    } catch (err) {
      console.error('更新用户角色失败:', err);
      alert('更新用户角色失败，请稍后重试');
    }
  };

  const getRoleText = (role) => {
    const roleMap = {
      'user': '普通用户',
      'admin': '管理员',
      'moderator': '版主'
    };
    return roleMap[role] || role;
  };

  const getStatusIcon = (isActive) => {
    return isActive ? 
      <CheckCircle className="h-5 w-5 text-green-600" /> : 
      <XCircle className="h-5 w-5 text-red-600" />;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('zh-CN');
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <Loader className="h-8 w-8 text-primary-600 animate-spin mr-3" />
          <span className="text-gray-600">加载用户数据中...</span>
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
          <Users className="h-8 w-8 text-primary-600" />
          <h1 className="text-2xl font-bold text-gray-900">用户管理</h1>
          <span className="text-sm text-gray-500">
            ({pagination.totalItems || 0} 个用户)
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
        </div>
      </div>

      {/* 筛选面板 */}
      {showFilters && (
        <div className="bg-white border rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">用户筛选</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                用户角色
              </label>
              <select
                value={filters.role}
                onChange={(e) => handleFilterChange('role', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">全部角色</option>
                <option value="user">普通用户</option>
                <option value="admin">管理员</option>
                <option value="moderator">版主</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                账户状态
              </label>
              <select
                value={filters.isActive}
                onChange={(e) => handleFilterChange('isActive', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">全部状态</option>
                <option value="true">已启用</option>
                <option value="false">已禁用</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                搜索用户
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  placeholder="用户名、邮箱..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 用户列表 */}
      <div className="bg-white border rounded-lg overflow-hidden">
        {/* 表格头部 */}
        <div className="bg-gray-50 px-6 py-3 grid grid-cols-12 gap-4 text-sm font-medium text-gray-700">
          <div className="col-span-3">用户信息</div>
          <div className="col-span-2">联系方式</div>
          <div className="col-span-2">角色</div>
          <div className="col-span-2">状态</div>
          <div className="col-span-2">注册时间</div>
          <div className="col-span-1">操作</div>
        </div>

        {/* 用户行 */}
        {users.length === 0 ? (
          <div className="text-center py-12">
            <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">暂无用户</h3>
            <p className="text-gray-500">没有找到符合条件的用户</p>
          </div>
        ) : (
          users.map((user) => (
            <div key={user._id} className="border-t px-6 py-4 grid grid-cols-12 gap-4 items-center text-sm">
              {/* 用户信息 */}
              <div className="col-span-3">
                <div className="font-medium">{user.username}</div>
                <div className="text-gray-500 text-xs">
                  {user.firstName} {user.lastName}
                </div>
              </div>

              {/* 联系方式 */}
              <div className="col-span-2">
                <div className="flex items-center text-gray-600 text-xs">
                  <Mail className="h-3 w-3 mr-1" />
                  {user.email}
                </div>
                {user.phone && (
                  <div className="flex items-center text-gray-600 text-xs mt-1">
                    <Phone className="h-3 w-3 mr-1" />
                    {user.phone}
                  </div>
                )}
              </div>

              {/* 角色 */}
              <div className="col-span-2">
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {getRoleText(user.role)}
                </span>
              </div>

              {/* 状态 */}
              <div className="col-span-2">
                <div className="flex items-center space-x-2">
                  {getStatusIcon(user.isActive)}
                  <span className="font-medium">
                    {user.isActive ? '已启用' : '已禁用'}
                  </span>
                </div>
              </div>

              {/* 注册时间 */}
              <div className="col-span-2">
                <div className="text-gray-600 text-xs">
                  {formatDate(user.createdAt)}
                </div>
              </div>

              {/* 操作 */}
              <div className="col-span-1">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setSelectedUser(user)}
                    className="p-1 text-blue-600 hover:text-blue-800"
                    title="查看详情"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  
                  <select
                    value={user.role}
                    onChange={(e) => handleRoleUpdate(user._id, e.target.value)}
                    className="px-2 py-1 border border-gray-300 rounded text-xs focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="user">普通用户</option>
                    <option value="moderator">版主</option>
                    <option value="admin">管理员</option>
                  </select>
                </div>
              </div>
            </div>
          ))
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

      {/* 用户详情模态框 */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold">用户详情</h3>
              <button
                onClick={() => setSelectedUser(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              {/* 基本信息 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-medium">用户名:</label>
                  <p>{selectedUser.username}</p>
                </div>
                <div>
                  <label className="font-medium">邮箱:</label>
                  <p>{selectedUser.email}</p>
                </div>
                <div>
                  <label className="font-medium">姓名:</label>
                  <p>{selectedUser.firstName} {selectedUser.lastName}</p>
                </div>
                <div>
                  <label className="font-medium">手机号:</label>
                  <p>{selectedUser.phone || '未设置'}</p>
                </div>
              </div>

              {/* 账户信息 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-medium">角色:</label>
                  <p>{getRoleText(selectedUser.role)}</p>
                </div>
                <div>
                  <label className="font-medium">状态:</label>
                  <p className={selectedUser.isActive ? 'text-green-600' : 'text-red-600'}>
                    {selectedUser.isActive ? '已启用' : '已禁用'}
                  </p>
                </div>
                <div>
                  <label className="font-medium">注册时间:</label>
                  <p>{formatDate(selectedUser.createdAt)}</p>
                </div>
                <div>
                  <label className="font-medium">最后登录:</label>
                  <p>{selectedUser.lastLogin ? formatDate(selectedUser.lastLogin) : '从未登录'}</p>
                </div>
              </div>

              {/* 操作按钮 */}
              <div className="flex space-x-4 pt-4">
                <button
                  onClick={() => handleStatusUpdate(selectedUser._id, !selectedUser.isActive)}
                  className={`px-4 py-2 rounded text-sm font-medium ${
                    selectedUser.isActive 
                      ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                      : 'bg-green-100 text-green-700 hover:bg-green-200'
                  }`}
                >
                  {selectedUser.isActive ? '禁用账户' : '启用账户'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsersPage;