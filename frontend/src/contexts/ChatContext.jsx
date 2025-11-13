import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { chatService } from '../services/chatAPI';
import { useNotification, NOTIFICATION_TYPES } from './NotificationContext';

// 聊天上下文
const ChatContext = createContext();

// 初始状态
const initialState = {
  isConnected: false,
  sessions: [],
  currentSession: null,
  messages: [],
  unreadCount: 0,
  onlineUsers: new Set(),
  typingUsers: new Set(),
  error: null,
  loading: false
};

// Action Types
const ACTION_TYPES = {
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',
  SET_CONNECTED: 'SET_CONNECTED',
  SET_SESSIONS: 'SET_SESSIONS',
  SET_CURRENT_SESSION: 'SET_CURRENT_SESSION',
  SET_MESSAGES: 'SET_MESSAGES',
  ADD_MESSAGE: 'ADD_MESSAGE',
  UPDATE_MESSAGE: 'UPDATE_MESSAGE',
  MARK_MESSAGES_READ: 'MARK_MESSAGES_READ',
  SET_UNREAD_COUNT: 'SET_UNREAD_COUNT',
  USER_TYPING: 'USER_TYPING',
  USER_STOPPED_TYPING: 'USER_STOPPED_TYPING',
  USER_ONLINE: 'USER_ONLINE',
  USER_OFFLINE: 'USER_OFFLINE'
};

// Reducer
function chatReducer(state, action) {
  switch (action.type) {
    case ACTION_TYPES.SET_LOADING:
      return { ...state, loading: action.payload };
    
    case ACTION_TYPES.SET_ERROR:
      return { ...state, error: action.payload, loading: false };
    
    case ACTION_TYPES.SET_CONNECTED:
      return { ...state, isConnected: action.payload };
    
    case ACTION_TYPES.SET_SESSIONS:
      return { ...state, sessions: action.payload };
    
    case ACTION_TYPES.SET_CURRENT_SESSION:
      return { ...state, currentSession: action.payload };
    
    case ACTION_TYPES.SET_MESSAGES:
      return { ...state, messages: action.payload };
    
    case ACTION_TYPES.ADD_MESSAGE:
      return {
        ...state,
        messages: [...state.messages, action.payload]
      };
    
    case ACTION_TYPES.UPDATE_MESSAGE:
      return {
        ...state,
        messages: state.messages.map(msg =>
          msg._id === action.payload._id ? action.payload : msg
        )
      };
    
    case ACTION_TYPES.MARK_MESSAGES_READ:
      return {
        ...state,
        messages: state.messages.map(msg =>
          action.payload.messageIds.includes(msg._id)
            ? { ...msg, status: 'read' }
            : msg
        )
      };
    
    case ACTION_TYPES.SET_UNREAD_COUNT:
      return { ...state, unreadCount: action.payload };
    
    case ACTION_TYPES.USER_TYPING:
      return {
        ...state,
        typingUsers: new Set([...state.typingUsers, action.payload])
      };
    
    case ACTION_TYPES.USER_STOPPED_TYPING:
      const newTypingUsers = new Set(state.typingUsers);
      newTypingUsers.delete(action.payload);
      return { ...state, typingUsers: newTypingUsers };
    
    case ACTION_TYPES.USER_ONLINE:
      return {
        ...state,
        onlineUsers: new Set([...state.onlineUsers, action.payload])
      };
    
    case ACTION_TYPES.USER_OFFLINE:
      const newOnlineUsers = new Set(state.onlineUsers);
      newOnlineUsers.delete(action.payload);
      return { ...state, onlineUsers: newOnlineUsers };
    
    default:
      return state;
  }
}

// Provider组件
export function ChatProvider({ children }) {
  const [state, dispatch] = useReducer(chatReducer, initialState);
  const { showNotification } = useNotification();
  
  // 初始化Socket连接
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      chatService.initialize(token);
      
      // 设置事件监听
      chatService.on('connected', () => {
        dispatch({ type: ACTION_TYPES.SET_CONNECTED, payload: true });
        
        // 加入用户房间
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        if (user._id) {
          chatService.joinUserRoom(user._id);
          
          // 如果是客服或管理员，加入客服房间
          if (user.role === 'admin' || user.role === 'support') {
            chatService.joinSupportRoom();
          }
        }
      });
      
      chatService.on('disconnected', () => {
        dispatch({ type: ACTION_TYPES.SET_CONNECTED, payload: false });
      });
      
      chatService.on('new-message', (message) => {
        dispatch({ type: ACTION_TYPES.ADD_MESSAGE, payload: message });
        
        // 更新未读计数
        if (message.sender.userId !== state.currentUser?._id) {
          dispatch({ type: ACTION_TYPES.SET_UNREAD_COUNT, payload: state.unreadCount + 1 });
        }
      });
      
      chatService.on('user-typing', (data) => {
        if (data.isTyping) {
          dispatch({ type: ACTION_TYPES.USER_TYPING, payload: data.userId });
        } else {
          dispatch({ type: ACTION_TYPES.USER_STOPPED_TYPING, payload: data.userId });
        }
      });
      
      chatService.on('messages-read', (data) => {
        dispatch({ type: ACTION_TYPES.MARK_MESSAGES_READ, payload: data });
      });
      
      chatService.on('error', (error) => {
        dispatch({ type: ACTION_TYPES.SET_ERROR, payload: error.message });
      });

      // 订阅 Odoo 审批事件并显示通知
      chatService.on('odoo-approval-event', (data) => {
        try {
          const titleMap = {
            submitted: '销售订单待审批',
            approved: '销售订单已审批',
            rejected: '销售订单被拒绝',
            confirmed: '销售订单已确认'
          };
          const typeMap = {
            submitted: NOTIFICATION_TYPES.INFO,
            approved: NOTIFICATION_TYPES.SUCCESS,
            rejected: NOTIFICATION_TYPES.WARNING,
            confirmed: NOTIFICATION_TYPES.SUCCESS
          };
          const title = titleMap[data?.approvalState] || '销售订单更新';
          const message = `${data?.orderName || ''} 状态: ${data?.state || ''} 审批: ${data?.approvalState || ''}`.trim();
          showNotification(title, message, typeMap[data?.approvalState] || NOTIFICATION_TYPES.INFO, 7000);
        } catch (e) {
          console.error('显示审批通知失败:', e);
        }
      });
    }
    
    return () => {
      chatService.disconnect();
    };
  }, []);
  
  // Action Creators
  const actions = {
    // 加载用户会话列表
    async loadUserSessions() {
      try {
        dispatch({ type: ACTION_TYPES.SET_LOADING, payload: true });
        const response = await chatService.getUserSessions();
        dispatch({ type: ACTION_TYPES.SET_SESSIONS, payload: response.sessions });
        return response.sessions;
      } catch (error) {
        dispatch({ type: ACTION_TYPES.SET_ERROR, payload: error.message });
        throw error;
      } finally {
        dispatch({ type: ACTION_TYPES.SET_LOADING, payload: false });
      }
    },
    
    // 加载会话消息
    async loadSessionMessages(sessionId) {
      try {
        dispatch({ type: ACTION_TYPES.SET_LOADING, payload: true });
        const response = await chatService.getSessionMessages(sessionId);
        dispatch({ type: ACTION_TYPES.SET_MESSAGES, payload: response.messages });
        return response.messages;
      } catch (error) {
        dispatch({ type: ACTION_TYPES.SET_ERROR, payload: error.message });
        throw error;
      } finally {
        dispatch({ type: ACTION_TYPES.SET_LOADING, payload: false });
      }
    },
    
    // 创建新会话
    async createSession(title, tags = ['general']) {
      try {
        dispatch({ type: ACTION_TYPES.SET_LOADING, payload: true });
        const response = await chatService.createSession(title, tags);
        
        // 加入新会话的房间
        chatService.joinSession(response.session._id);
        
        dispatch({ type: ACTION_TYPES.SET_CURRENT_SESSION, payload: response.session });
        dispatch({ type: ACTION_TYPES.SET_SESSIONS, payload: [...state.sessions, response.session] });
        
        return response.session;
      } catch (error) {
        dispatch({ type: ACTION_TYPES.SET_ERROR, payload: error.message });
        throw error;
      } finally {
        dispatch({ type: ACTION_TYPES.SET_LOADING, payload: false });
      }
    },
    
    // 发送消息
    async sendMessage(content, messageType = 'text', fileInfo = null) {
      try {
        if (!state.currentSession) {
          throw new Error('没有活跃的会话');
        }
        
        const messageData = {
          sessionId: state.currentSession._id,
          content,
          messageType,
          fileInfo,
          sender: {
            userId: state.currentUser?._id,
            username: state.currentUser?.username,
            role: state.currentUser?.role
          }
        };
        
        // 通过Socket发送实时消息
        chatService.sendMessage(messageData);
        
        // 同时通过REST API保存消息
        const response = await chatService.sendMessageRest(
          state.currentSession._id,
          content,
          messageType,
          fileInfo
        );
        
        return response.message;
      } catch (error) {
        dispatch({ type: ACTION_TYPES.SET_ERROR, payload: error.message });
        throw error;
      }
    },
    
    // 标记消息为已读
    async markMessagesAsRead(messageIds) {
      try {
        // 通过Socket发送已读状态
        if (state.currentSession) {
          const user = JSON.parse(localStorage.getItem('user') || '{}');
          chatService.markMessagesAsRead(
            state.currentSession._id,
            messageIds,
            user._id
          );
        }
        
        // 通过REST API更新数据库
        await chatService.markMessagesAsReadRest(messageIds);
        
        dispatch({ type: ACTION_TYPES.MARK_MESSAGES_READ, payload: { messageIds } });
        dispatch({ type: ACTION_TYPES.SET_UNREAD_COUNT, payload: 0 });
        
      } catch (error) {
        dispatch({ type: ACTION_TYPES.SET_ERROR, payload: error.message });
        throw error;
      }
    },
    
    // 设置输入状态
    setTyping(isTyping) {
      if (state.currentSession && state.currentUser) {
        chatService.setTyping(
          state.currentSession._id,
          state.currentUser._id,
          isTyping
        );
      }
    },
    
    // 选择会话
    selectSession(session) {
      dispatch({ type: ACTION_TYPES.SET_CURRENT_SESSION, payload: session });
      
      // 加入会话房间
      chatService.joinSession(session._id);
      
      // 加载会话消息
      actions.loadSessionMessages(session._id);
      
      // 重置未读计数
      dispatch({ type: ACTION_TYPES.SET_UNREAD_COUNT, payload: 0 });
    },
    
    // 清除错误
    clearError() {
      dispatch({ type: ACTION_TYPES.SET_ERROR, payload: null });
    },
    
    // 断开连接
    disconnect() {
      chatService.disconnect();
      dispatch({ type: ACTION_TYPES.SET_CONNECTED, payload: false });
    }
  };
  
  const value = {
    ...state,
    ...actions,
    currentUser: JSON.parse(localStorage.getItem('user') || '{}')
  };
  
  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
}

// Hook
export function useChat() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat必须在ChatProvider内使用');
  }
  return context;
}

export default ChatContext;
