import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../services/api';
import { ArrowLeft, Save, Eye, EyeOff, User, Mail, Phone, Camera, AlertCircle, CheckCircle, Lock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const SettingsPage = () => {
  const { user, updateProfile, updatePassword } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  // 个人信息表单
  const [profileForm, setProfileForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    avatar: ''
  });
  
  // 密码修改表单
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // 初始化表单数据
  useEffect(() => {
    if (user) {
      setProfileForm({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        phone: user.phone || '',
        avatar: user.avatar || ''
      });
    }
  }, [user]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('welcome') === '1') {
      setMessage({ type: 'success', text: '欢迎加入！请完善个人信息，提升体验。' });
      setTimeout(() => setMessage({ type: '', text: '' }), 5000);
    }
  }, [location.search]);

  const handleProfileChange = (e) => {
    setProfileForm({
      ...profileForm,
      [e.target.name]: e.target.value
    });
    setMessage({ type: '', text: '' });
  };

  const handlePasswordChange = (e) => {
    setPasswordForm({
      ...passwordForm,
      [e.target.name]: e.target.value
    });
    setMessage({ type: '', text: '' });
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const result = await updateProfile(profileForm);
      if (result.success) {
        setMessage({ type: 'success', text: '个人信息更新成功！' });
        // 3秒后清除成功消息
        setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      } else {
        setMessage({ type: 'error', text: result.error || '更新失败' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.message || '更新失败' });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    // 验证密码
    if (passwordForm.newPassword.length < 6) {
      setMessage({ type: 'error', text: '新密码长度至少6位' });
      setLoading(false);
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setMessage({ type: 'error', text: '两次输入的密码不一致' });
      setLoading(false);
      return;
    }

    try {
      const result = await updatePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      });

      if (result.success) {
        setMessage({ type: 'success', text: '密码修改成功！' });
        // 清空密码表单
        setPasswordForm({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
        // 3秒后清除成功消息
        setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      } else {
        setMessage({ type: 'error', text: result.error || '密码修改失败' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.message || '密码修改失败' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <button
              onClick={() => navigate('/')}
              className="flex items-center text-gray-600 hover:text-gray-900 mr-4"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              返回
            </button>
            <h1 className="text-xl font-semibold text-gray-900">个人设置</h1>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab('profile')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'profile'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                个人信息
              </button>
              <button
                onClick={() => setActiveTab('password')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'password'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                修改密码
              </button>
            </nav>
          </div>

          {/* Message */}
          {message.text && (
            <div className={`px-6 py-4 ${
              message.type === 'error' 
                ? 'bg-red-50 border-l-4 border-red-400 text-red-700' 
                : 'bg-green-50 border-l-4 border-green-400 text-green-700'
            }`}>
              <div className="flex items-center">
                {message.type === 'error' ? (
                  <AlertCircle className="h-5 w-5 mr-3" />
                ) : (
                  <CheckCircle className="h-5 w-5 mr-3" />
                )}
                <p className="text-sm">{message.text}</p>
              </div>
            </div>
          )}

          {/* Content */}
          <div className="p-6">
            {/* 个人信息表单 */}
            {activeTab === 'profile' && (
              <form onSubmit={handleProfileSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
                      姓氏
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <User className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="text"
                        id="firstName"
                        name="firstName"
                        value={profileForm.firstName}
                        onChange={handleProfileChange}
                        className="pl-10 block w-full border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                        placeholder="请输入姓氏"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
                      名字
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <User className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="text"
                        id="lastName"
                        name="lastName"
                        value={profileForm.lastName}
                        onChange={handleProfileChange}
                        className="pl-10 block w-full border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                        placeholder="请输入名字"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    邮箱地址
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="email"
                      id="email"
                      value={user?.email || ''}
                      className="pl-10 block w-full border-gray-300 rounded-md bg-gray-50 cursor-not-allowed"
                      disabled
                      readOnly
                    />
                  </div>
                  <p className="mt-1 text-sm text-gray-500">邮箱地址不可修改</p>
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                    手机号码
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Phone className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={profileForm.phone}
                      onChange={handleProfileChange}
                      className="pl-10 block w-full border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                      placeholder="请输入手机号码"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    头像
                  </label>
                  <div className="flex items-center space-x-4">
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Camera className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={async (e) => {
                          try {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            setLoading(true);
                            const fd = new FormData();
                            fd.append('file', file);
                            const res = await api.post('/upload/single', fd);
                            const url = res.file?.url || res.data?.file?.url || '';
                            const absolute = url.startsWith('http') ? url : `${import.meta.env.VITE_API_ORIGIN || 'http://localhost:5000'}${url}`;
                            setProfileForm(prev => ({ ...prev, avatar: absolute }));
                            setMessage({ type: 'success', text: '头像已上传，记得点击保存更改' });
                            setTimeout(() => setMessage({ type: '', text: '' }), 3000);
                          } catch (err) {
                            const msg = err?.response?.data?.error || '头像上传失败';
                            setMessage({ type: 'error', text: msg });
                            setTimeout(() => setMessage({ type: '', text: '' }), 3000);
                          } finally {
                            setLoading(false);
                          }
                        }}
                        className="pl-10 block w-full border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                    {profileForm.avatar && (
                      <img
                        src={profileForm.avatar}
                        alt="头像预览"
                        className="w-16 h-16 rounded-full object-cover border"
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    )}
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {loading ? '保存中...' : '保存更改'}
                  </button>
                </div>
              </form>
            )}

            {/* 密码修改表单 */}
            {activeTab === 'password' && (
              <form onSubmit={handlePasswordSubmit} className="space-y-6">
                <div>
                  <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-2">
                    当前密码
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      id="currentPassword"
                      name="currentPassword"
                      value={passwordForm.currentPassword}
                      onChange={handlePasswordChange}
                      className="pl-10 pr-10 block w-full border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                      placeholder="请输入当前密码"
                      required
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    >
                      {showCurrentPassword ? (
                        <EyeOff className="h-5 w-5 text-gray-400" />
                      ) : (
                        <Eye className="h-5 w-5 text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-2">
                    新密码
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      id="newPassword"
                      name="newPassword"
                      value={passwordForm.newPassword}
                      onChange={handlePasswordChange}
                      className="pl-10 pr-10 block w-full border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                      placeholder="请输入新密码"
                      required
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                    >
                      {showNewPassword ? (
                        <EyeOff className="h-5 w-5 text-gray-400" />
                      ) : (
                        <Eye className="h-5 w-5 text-gray-400" />
                      )}
                    </button>
                  </div>
                  <p className="mt-1 text-sm text-gray-500">密码长度至少6位</p>
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                    确认新密码
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      id="confirmPassword"
                      name="confirmPassword"
                      value={passwordForm.confirmPassword}
                      onChange={handlePasswordChange}
                      className="pl-10 pr-10 block w-full border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                      placeholder="请再次输入新密码"
                      required
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-5 w-5 text-gray-400" />
                      ) : (
                        <Eye className="h-5 w-5 text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {loading ? '修改中...' : '修改密码'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
