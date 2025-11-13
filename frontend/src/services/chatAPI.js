import { io } from 'socket.io-client';
import { api } from './api';

class ChatService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.listeners = new Map();
  }

  // 初始化Socket连接
  initialize(token) {
    if (this.socket) {
      this.disconnect();
    }

    this.socket = io('http://localhost:5000', {
      auth: {
        token: token
      },
      transports: ['websocket', 'polling']
    });

    this.setupEventListeners();
  }

  // 设置事件监听器
  setupEventListeners() {
    this.socket.on('connect', () => {
      console.log('🔗 Socket连接成功');
      this.isConnected = true;
      this.emit('connected');
    });

    this.socket.on('disconnect', () => {
      console.log('🔌 Socket连接断开');
      this.isConnected = false;
      this.emit('disconnected');
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ Socket连接错误:', error);
      this.emit('error', error);
    });

    this.socket.on('new-message', (message) => {
      console.log('📨 收到新消息:', message);
      this.emit('new-message', message);
    });

    this.socket.on('user-typing', (data) => {
      this.emit('user-typing', data);
    });

    this.socket.on('messages-read', (data) => {
      this.emit('messages-read', data);
    });

    this.socket.on('error', (error) => {
      console.error('Socket错误:', error);
      this.emit('error', error);
    });

    // 转接和协作相关事件
    this.socket.on('session-transferred', (data) => {
      console.log('🔄 收到会话转接通知:', data);
      this.emit('session-transferred', data);
    });

    this.socket.on('session-transfer-complete', (data) => {
      console.log('✅ 会话转接完成:', data);
      this.emit('session-transfer-complete', data);
    });

    this.socket.on('collaboration-invite', (data) => {
      console.log('🤝 收到协作邀请:', data);
      this.emit('collaboration-invite', data);
    });

    this.socket.on('collaborator-joined', (data) => {
      console.log('👥 协作客服加入:', data);
      this.emit('collaborator-joined', data);
    });

    this.socket.on('collaborator-left', (data) => {
      console.log('👋 协作客服离开:', data);
      this.emit('collaborator-left', data);
    });

    // 满意度评价相关事件
    this.socket.on('session-rated', (data) => {
      console.log('⭐ 收到会话评价通知:', data);
      this.emit('session-rated', data);
    });

    // Odoo 审批事件
    this.socket.on('odoo-approval-event', (data) => {
      console.log('📄 收到 Odoo 审批事件:', data);
      this.emit('odoo-approval-event', data);
    });
  }

  // 加入用户房间
  joinUserRoom(userId) {
    if (this.socket && this.isConnected) {
      this.socket.emit('join-user-room', userId);
    }
  }

  // 加入客服房间
  joinSupportRoom() {
    if (this.socket && this.isConnected) {
      this.socket.emit('join-support-room');
    }
  }

  // 加入会话房间
  joinSession(sessionId) {
    if (this.socket && this.isConnected) {
      this.socket.emit('join-session', sessionId);
    }
  }

  // 发送消息
  sendMessage(messageData) {
    if (this.socket && this.isConnected) {
      this.socket.emit('send-message', messageData);
    }
  }

  // 用户输入状态
  setTyping(sessionId, userId, isTyping) {
    if (this.socket && this.isConnected) {
      this.socket.emit('typing', {
        sessionId,
        userId,
        isTyping
      });
    }
  }

  // 标记消息为已读
  markMessagesAsRead(sessionId, messageIds, userId) {
    if (this.socket && this.isConnected) {
      this.socket.emit('mark-read', {
        sessionId,
        messageIds,
        userId
      });
    }
  }

  // 断开连接
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  // 事件监听管理
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(callback);
    }
  }

  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`事件 ${event} 监听器错误:`, error);
        }
      });
    }
  }

  // REST API 方法
  
  // 获取用户会话列表
  async getUserSessions() {
    try {
      const response = await api.get('/chat/sessions');
      return response;
    } catch (error) {
      console.error('获取会话列表失败:', error);
      throw error;
    }
  }

  // 获取会话消息
  async getSessionMessages(sessionId, limit = 50, skip = 0) {
    try {
      const response = await api.get(`/chat/sessions/${sessionId}/messages`, {
        params: { limit, skip }
      });
      return response;
    } catch (error) {
      console.error('获取消息失败:', error);
      throw error;
    }
  }

  // 创建新会话
  async createSession(title, tags = ['general']) {
    try {
      const response = await api.post('/chat/sessions', {
        title,
        tags
      });
      return response;
    } catch (error) {
      console.error('创建会话失败:', error);
      throw error;
    }
  }

  // 发送消息（REST版本）
  async sendMessageRest(sessionId, content, messageType = 'text', fileInfo = null) {
    try {
      const response = await api.post('/chat/messages', {
        sessionId,
        content,
        messageType,
        fileInfo
      });
      return response;
    } catch (error) {
      console.error('发送消息失败:', error);
      throw error;
    }
  }

  // 标记消息为已读
  async markMessagesAsReadRest(messageIds) {
    try {
      const response = await api.patch('/chat/messages/read', {
        messageIds
      });
      return response;
    } catch (error) {
      console.error('标记消息已读失败:', error);
      throw error;
    }
  }

  // 关闭会话
  async closeSession(sessionId) {
    try {
      const response = await api.patch(`/chat/sessions/${sessionId}/close`);
      return response;
    } catch (error) {
      console.error('关闭会话失败:', error);
      throw error;
    }
  }

  // 获取客服统计
  async getSupportStats() {
    try {
      const response = await api.get('/chat/stats');
      return response;
    } catch (error) {
      console.error('获取统计失败:', error);
      throw error;
    }
  }

  // 提交会话满意度评价
  async submitSessionRating(sessionId, ratingData) {
    try {
      const response = await api.post(`/chat/sessions/${sessionId}/rating`, ratingData);
      return response;
    } catch (error) {
      console.error('提交评价失败:', error);
      throw error;
    }
  }

  // 获取会话评价详情
  async getSessionRating(sessionId) {
    try {
      const response = await api.get(`/chat/sessions/${sessionId}/rating`);
      return response;
    } catch (error) {
      console.error('获取评价失败:', error);
      throw error;
    }
  }

  // 获取客服评分统计
  async getAgentRatingStats(agentId) {
    try {
      const response = await api.get(`/chat/agents/${agentId}/rating-stats`);
      return response;
    } catch (error) {
      console.error('获取客服评分统计失败:', error);
      throw error;
    }
  }

  // 获取客服评分排名（仅管理员）
  async getAgentRatingRankings() {
    try {
      const response = await api.get('/chat/agents/rating-rankings');
      return response;
    } catch (error) {
      console.error('获取评分排名失败:', error);
      throw error;
    }
  }

  // 获取整体评价统计（仅管理员）
  async getOverallRatingStats(startDate, endDate) {
    try {
      const response = await api.get('/chat/rating-stats', {
        params: { startDate, endDate }
      });
      return response;
    } catch (error) {
      console.error('获取整体统计失败:', error);
      throw error;
    }
  }
}

// 创建单例实例
export const chatService = new ChatService();

export default chatService;
