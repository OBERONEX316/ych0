import React, { useState, useEffect } from 'react';
import { useChat } from '../contexts/ChatContext';
import { 
  MessageSquare, 
  Users, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Search,
  Filter,
  MoreVertical,
  Star,
  MessageCircle
} from 'lucide-react';

const AdminChatPage = () => {
  const {
    sessions,
    currentSession,
    messages,
    loading,
    error,
    loadUserSessions,
    selectSession,
    sendMessage,
    markMessagesAsRead,
    currentUser
  } = useChat();
  
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [messageInput, setMessageInput] = useState('');
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    closed: 0,
    highPriority: 0,
    averageResponseTime: 0
  });

  // 检查用户是否为管理员或客服
  const isSupportStaff = currentUser.role === 'admin' || currentUser.role === 'support';

  useEffect(() => {
    if (isSupportStaff) {
      loadUserSessions();
    }
  }, [isSupportStaff, loadUserSessions]);

  useEffect(() => {
    // 计算统计数据
    if (sessions.length > 0) {
      const total = sessions.length;
      const active = sessions.filter(s => s.status === 'active').length;
      const closed = sessions.filter(s => s.status === 'closed').length;
      const highPriority = sessions.filter(s => s.priority === 'high').length;
      
      // 计算平均响应时间（简化版）
      const responseTimes = sessions
        .filter(s => s.avgResponseTime)
        .map(s => s.avgResponseTime);
      const averageResponseTime = responseTimes.length > 0 
        ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length 
        : 0;

      setStats({
        total,
        active,
        closed,
        highPriority,
        averageResponseTime
      });
    }
  }, [sessions]);

  // 过滤会话
  const filteredSessions = sessions.filter(session => {
    // 状态过滤
    if (statusFilter !== 'all' && session.status !== statusFilter) {
      return false;
    }
    
    // 优先级过滤
    if (priorityFilter !== 'all' && session.priority !== priorityFilter) {
      return false;
    }
    
    // 搜索过滤
    if (searchTerm && 
        !session.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !session.participants.some(p => 
          p.username.toLowerCase().includes(searchTerm.toLowerCase())
        )
    ) {
      return false;
    }
    
    return true;
  });

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!messageInput.trim() || !currentSession) return;
    
    try {
      await sendMessage(messageInput.trim());
      setMessageInput('');
    } catch (error) {
      console.error('发送消息失败:', error);
    }
  };

  const handleAssignToMe = async (sessionId) => {
    // 这里需要实现分配会话给当前客服的逻辑
    console.log('分配会话:', sessionId);
  };

  const handleCloseSession = async (sessionId) => {
    // 这里需要实现关闭会话的逻辑
    console.log('关闭会话:', sessionId);
  };

  const formatDuration = (minutes) => {
    if (minutes < 60) {
      return `${minutes}分钟`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}小时${mins}分钟` : `${hours}小时`;
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'text-red-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'text-green-600';
      case 'closed': return 'text-gray-600';
      case 'pending': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };

  if (!isSupportStaff) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-red-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">权限不足</h2>
          <p className="text-gray-600">您没有权限访问客服管理页面</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 头部统计信息 */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">总会话</h3>
              <MessageSquare className="h-5 w-5 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          </div>
          
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">活跃会话</h3>
              <Users className="h-5 w-5 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.active}</p>
          </div>
          
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">高优先级</h3>
              <AlertCircle className="h-5 w-5 text-red-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.highPriority}</p>
          </div>
          
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">平均响应</h3>
              <Clock className="h-5 w-5 text-purple-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {formatDuration(stats.averageResponseTime)}
            </p>
          </div>
          
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">已解决</h3>
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.closed}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* 左侧会话列表 */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm">
              {/* 搜索和筛选 */}
              <div className="p-4 border-b">
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="搜索会话..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="all">所有状态</option>
                    <option value="active">活跃</option>
                    <option value="pending">待处理</option>
                    <option value="closed">已关闭</option>
                  </select>
                  
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    value={priorityFilter}
                    onChange={(e) => setPriorityFilter(e.target.value)}
                  >
                    <option value="all">所有优先级</option>
                    <option value="high">高</option>
                    <option value="medium">中</option>
                    <option value="low">低</option>
                  </select>
                </div>
              </div>

              {/* 会话列表 */}
              <div className="max-h-96 overflow-y-auto">
                {filteredSessions.map(session => (
                  <div
                    key={session._id}
                    className={`p-4 border-b cursor-pointer hover:bg-gray-50 ${
                      currentSession?._id === session._id ? 'bg-blue-50' : ''
                    }`}
                    onClick={() => selectSession(session)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium text-sm text-gray-900 line-clamp-1">
                        {session.title || '无标题会话'}
                      </h4>
                      <div className="flex items-center gap-1">
                        {session.priority === 'high' && (
                          <Star className="h-3 w-3 text-red-600 fill-current" />
                        )}
                        <span className={`text-xs ${getStatusColor(session.status)}`}>
                          {session.status === 'active' ? '活跃' : 
                           session.status === 'closed' ? '已关闭' : '待处理'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center text-xs text-gray-500">
                      <span>
                        {session.participants
                          .filter(p => p.role === 'user')
                          .map(p => p.username)
                          .join(', ')
                        }
                      </span>
                      <span>
                        {new Date(session.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                    
                    {session.unreadCount > 0 && (
                      <div className="mt-2">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          {session.unreadCount} 条未读
                        </span>
                      </div>
                    )}
                  </div>
                ))}
                
                {filteredSessions.length === 0 && (
                  <div className="p-8 text-center text-gray-500">
                    <MessageCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>暂无会话</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 右侧消息区域 */}
          <div className="lg:col-span-3">
            {currentSession ? (
              <div className="bg-white rounded-lg shadow-sm h-full flex flex-col">
                {/* 会话头部 */}
                <div className="p-4 border-b">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {currentSession.title || '无标题会话'}
                      </h3>
                      <p className="text-sm text-gray-500">
                        创建时间: {new Date(currentSession.createdAt).toLocaleString()}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className={`text-sm ${getPriorityColor(currentSession.priority)}`}>
                        {currentSession.priority === 'high' ? '高优先级' :
                         currentSession.priority === 'medium' ? '中优先级' : '低优先级'}
                      </span>
                      
                      <div className="flex gap-1">
                        <button
                          className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                          onClick={() => handleAssignToMe(currentSession._id)}
                        >
                          分配给我
                        </button>
                        <button
                          className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700"
                          onClick={() => handleCloseSession(currentSession._id)}
                        >
                          关闭会话
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 消息内容 */}
                <div className="flex-1 p-4 overflow-y-auto max-h-96">
                  {messages.map(message => (
                    <div
                      key={message._id}
                      className={`mb-4 ${
                        message.sender.userId === currentUser._id
                          ? 'text-right'
                          : 'text-left'
                      }`}
                    >
                      <div
                        className={`inline-block max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                          message.sender.userId === currentUser._id
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-200 text-gray-900'
                        }`}
                      >
                        <p className="text-sm">{message.content}</p>
                        <p className={`text-xs mt-1 ${
                          message.sender.userId === currentUser._id
                            ? 'text-blue-200'
                            : 'text-gray-500'
                        }`}>
                          {new Date(message.createdAt).toLocaleTimeString()}
                        </p>
                      </div>
                      
                      {message.sender.userId !== currentUser._id && (
                        <p className="text-xs text-gray-500 mt-1">
                          {message.sender.username}
                        </p>
                      )}
                    </div>
                  ))}
                  
                  {messages.length === 0 && (
                    <div className="text-center text-gray-500 py-8">
                      <MessageCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>暂无消息</p>
                    </div>
                  )}
                </div>

                {/* 输入区域 */}
                <div className="p-4 border-t">
                  <form onSubmit={handleSendMessage} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="输入回复消息..."
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                    />
                    <button
                      type="submit"
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                      disabled={!messageInput.trim()}
                    >
                      发送
                    </button>
                  </form>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm p-8 text-center">
                <MessageCircle className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">选择会话</h3>
                <p className="text-gray-500">请从左侧选择一个会话来查看和回复消息</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminChatPage;