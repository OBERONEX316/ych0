import React, { useState, useEffect, useRef } from 'react';
import { useChat } from '../contexts/ChatContext';
import './ChatWidget.css';

const ChatWidget = () => {
  const {
    isConnected,
    sessions,
    currentSession,
    messages,
    unreadCount,
    loading,
    error,
    loadUserSessions,
    createSession,
    sendMessage,
    selectSession,
    setTyping,
    markMessagesAsRead,
    currentUser
  } = useChat();
  
  const [isOpen, setIsOpen] = useState(false);
  const [messageInput, setMessageInput] = useState('');
  const [showSessionsList, setShowSessionsList] = useState(false);
  const [newSessionTitle, setNewSessionTitle] = useState('');
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // 滚动到最新消息
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && currentSession) {
      // 标记当前会话的消息为已读
      const unreadMessageIds = messages
        .filter(msg => msg.status === 'delivered' && msg.sender.userId !== currentUser._id)
        .map(msg => msg._id);
      
      if (unreadMessageIds.length > 0) {
        markMessagesAsRead(unreadMessageIds);
      }
    }
  }, [isOpen, currentSession, messages, currentUser._id, markMessagesAsRead]);

  // 加载用户会话
  useEffect(() => {
    if (isOpen && isConnected) {
      loadUserSessions();
    }
  }, [isOpen, isConnected, loadUserSessions]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!messageInput.trim() || !currentSession) return;
    
    try {
      await sendMessage(messageInput.trim());
      setMessageInput('');
      
      // 清除输入状态
      setTyping(false);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
    } catch (error) {
      console.error('发送消息失败:', error);
    }
  };

  const handleInputChange = (e) => {
    setMessageInput(e.target.value);
    
    // 设置输入状态
    if (currentSession) {
      setTyping(true);
      
      // 清除之前的定时器
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // 设置新的定时器，停止输入后清除输入状态
      typingTimeoutRef.current = setTimeout(() => {
        setTyping(false);
      }, 1000);
    }
  };

  const handleCreateSession = async () => {
    if (!newSessionTitle.trim()) return;
    
    try {
      setIsCreatingSession(true);
      await createSession(newSessionTitle.trim());
      setNewSessionTitle('');
      setIsCreatingSession(false);
      setShowSessionsList(false);
    } catch (error) {
      console.error('创建会话失败:', error);
      setIsCreatingSession(false);
    }
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getSessionTitle = (session) => {
    if (session.title) return session.title;
    
    // 如果是客服会话，显示客服名称
    if (session.type === 'support') {
      const supportUser = session.participants.find(p => p.role === 'support');
      return supportUser ? `客服: ${supportUser.username}` : '客服会话';
    }
    
    return '新会话';
  };

  if (!currentUser._id) {
    return null; // 未登录用户不显示聊天组件
  }

  return (
    <div className="chat-widget">
      {/* 聊天按钮 */}
      <button
        className="chat-button"
        onClick={() => setIsOpen(!isOpen)}
        title="在线客服"
      >
        💬
        {unreadCount > 0 && (
          <span className="unread-badge">{unreadCount}</span>
        )}
      </button>

      {/* 聊天窗口 */}
      {isOpen && (
        <div className="chat-window">
          {/* 头部 */}
          <div className="chat-header">
            <div className="chat-title">
              {currentSession ? (
                <>
                  <span>{getSessionTitle(currentSession)}</span>
                  <span className="connection-status">
                    {isConnected ? '🟢' : '🔴'}
                  </span>
                </>
              ) : (
                '在线客服'
              )}
            </div>
            
            <div className="chat-actions">
              <button
                className="session-list-btn"
                onClick={() => setShowSessionsList(!showSessionsList)}
                title="会话列表"
              >
                📋
              </button>
              <button
                className="close-chat-btn"
                onClick={() => setIsOpen(false)}
                title="关闭"
              >
                ×
              </button>
            </div>
          </div>

          {/* 错误提示 */}
          {error && (
            <div className="chat-error">
              {error}
              <button onClick={() => {}}>×</button>
            </div>
          )}

          {/* 会话列表 */}
          {showSessionsList && (
            <div className="sessions-panel">
              <div className="sessions-header">
                <h4>我的会话</h4>
                <button onClick={() => setShowSessionsList(false)}>×</button>
              </div>
              
              <div className="sessions-list">
                {sessions.map(session => (
                  <div
                    key={session._id}
                    className={`session-item ${
                      currentSession?._id === session._id ? 'active' : ''
                    }`}
                    onClick={() => {
                      selectSession(session);
                      setShowSessionsList(false);
                    }}
                  >
                    <div className="session-title">{getSessionTitle(session)}</div>
                    <div className="session-meta">
                      {session.unreadCount > 0 && (
                        <span className="session-unread">{session.unreadCount}</span>
                      )}
                      <span className="session-time">
                        {new Date(session.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
                
                {sessions.length === 0 && (
                  <div className="no-sessions">暂无会话</div>
                )}
              </div>
              
              <div className="new-session-form">
                <input
                  type="text"
                  placeholder="输入会话标题..."
                  value={newSessionTitle}
                  onChange={(e) => setNewSessionTitle(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleCreateSession()}
                />
                <button
                  onClick={handleCreateSession}
                  disabled={isCreatingSession || !newSessionTitle.trim()}
                >
                  {isCreatingSession ? '创建中...' : '新建会话'}
                </button>
              </div>
            </div>
          )}

          {/* 消息区域 */}
          <div className="messages-container">
            {loading && !currentSession ? (
              <div className="loading">加载中...</div>
            ) : currentSession ? (
              <>
                <div className="messages">
                  {messages.length === 0 ? (
                    <div className="no-messages">
                      开始与客服对话吧！
                    </div>
                  ) : (
                    messages.map((message) => (
                      <div
                        key={message._id}
                        className={`message ${
                          message.sender.userId === currentUser._id
                            ? 'own-message'
                            : 'other-message'
                        }`}
                      >
                        <div className="message-content">
                          <div className="message-text">{message.content}</div>
                          <div className="message-time">
                            {formatTime(message.createdAt)}
                          </div>
                        </div>
                        
                        {message.sender.userId !== currentUser._id && (
                          <div className="message-sender">
                            {message.sender.username}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* 输入区域 */}
                <form className="message-input-form" onSubmit={handleSendMessage}>
                  <input
                    ref={inputRef}
                    type="text"
                    placeholder="输入消息..."
                    value={messageInput}
                    onChange={handleInputChange}
                    disabled={!isConnected}
                  />
                  <button
                    type="submit"
                    disabled={!messageInput.trim() || !isConnected}
                  >
                    发送
                  </button>
                </form>
              </>
            ) : (
              <div className="welcome-message">
                <h3>欢迎使用在线客服</h3>
                <p>请选择一个会话或创建新会话来开始对话</p>
                <button
                  onClick={() => {
                    setNewSessionTitle('产品咨询');
                    handleCreateSession();
                  }}
                  disabled={isCreatingSession}
                >
                  开始咨询
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatWidget;