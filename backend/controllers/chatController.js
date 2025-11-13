const ChatMessage = require('../models/ChatMessage');
const ChatSession = require('../models/ChatSession');
const User = require('../models/User');
const chatAssignmentService = require('../services/chatAssignmentService');
const intelligentRoutingService = require('../services/intelligentRoutingService');
const aiChatbotService = require('../services/aiChatbotService');

// 获取用户聊天会话列表
const getUserSessions = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const sessions = await ChatSession.find({
      'participants.userId': userId,
      status: { $in: ['active', 'resolved'] }
    })
    .sort({ updatedAt: -1 })
    .populate('participants.userId', 'username avatar role')
    .populate('assignedTo.userId', 'username avatar');
    
    res.json({
      success: true,
      sessions
    });
  } catch (error) {
    console.error('获取聊天会话错误:', error);
    res.status(500).json({
      success: false,
      error: '获取聊天会话失败'
    });
  }
};

// 获取会话消息历史
const getSessionMessages = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { limit = 50, skip = 0 } = req.query;
    
    // 验证用户是否有权限访问此会话
    const session = await ChatSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        error: '会话不存在'
      });
    }
    
    const isParticipant = session.participants.some(
      p => p.userId.toString() === req.user.id.toString()
    );
    
    if (!isParticipant && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: '无权访问此会话'
      });
    }
    
    const messages = await ChatMessage.getSessionMessages(sessionId, parseInt(limit), parseInt(skip));
    
    res.json({
      success: true,
      messages,
      total: messages.length
    });
  } catch (error) {
    console.error('获取消息历史错误:', error);
    res.status(500).json({
      success: false,
      error: '获取消息历史失败'
    });
  }
};

// 创建新会话
const createSession = async (req, res) => {
  try {
    const userId = req.user.id;
    const { title, tags } = req.body;
    
    // 检查用户是否已有活跃会话
    const existingSession = await ChatSession.findOne({
      'participants.userId': userId,
      status: 'active'
    });
    
    if (existingSession) {
      return res.json({
        success: true,
        session: existingSession,
        message: '已有活跃会话'
      });
    }
    
    // 获取用户信息
    const user = await User.findById(userId);
    
    // 创建新会话
    const session = new ChatSession({
      title: title || `${user.username}的客服咨询`,
      tags: tags || ['general'],
      participants: [{
        userId: user._id,
        username: user.username,
        avatar: user.avatar,
        role: 'user'
      }]
    });
    
    await session.save();
    
    // 尝试自动分配会话给客服
    const assignmentResult = await chatAssignmentService.assignSession(session._id, session.tags, session.priority);
    
    if (assignmentResult) {
      // 会话已分配，更新会话信息
      session.assignedTo = assignmentResult.session.assignedTo;
      await session.save();
      
      // 通知客服有新会话分配
      const io = req.app.get('io');
      if (io) {
        io.to(`user-${assignmentResult.agent.userId}`).emit('session-assigned', {
          sessionId: session._id,
          session: session.toObject(),
          assignedBy: 'system'
        });
      }
    }
    
    res.status(201).json({
      success: true,
      session,
      assigned: !!assignmentResult,
      assignedTo: assignmentResult?.agent
    });
  } catch (error) {
    console.error('创建会话错误:', error);
    res.status(500).json({
      success: false,
      error: '创建会话失败'
    });
  }
};

// 发送消息
const sendMessage = async (req, res) => {
  try {
    const { sessionId, content, messageType = 'text', fileInfo, richContent } = req.body;
    const userId = req.user.id;
    
    // 验证会话是否存在且用户有权限
    const session = await ChatSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        error: '会话不存在'
      });
    }
    
    const isParticipant = session.participants.some(
      p => p.userId.toString() === userId.toString()
    );
    
    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        error: '无权在此会话中发送消息'
      });
    }
    
    // 获取用户信息
    const user = await User.findById(userId);
    
    // 创建消息
    const message = new ChatMessage({
      sender: {
        userId: user._id,
        username: user.username,
        avatar: user.avatar,
        role: user.role
      },
      content,
      richContent,
      messageType,
      fileInfo,
      sessionId,
      isSupportMessage: user.role === 'support' || user.role === 'admin'
    });
    
    await message.save();

    // 更新会话的最后消息
    session.lastMessage = {
      content: content.length > 100 ? content.substring(0, 100) + '...' : content,
      senderId: user._id,
      timestamp: new Date()
    };

    // 更新未读消息计数（除了发送者自己）
    session.participants.forEach(participant => {
      if (participant.userId.toString() !== userId.toString()) {
        session.updateUnreadCount(participant.userId.toString(), 1);
      }
    });
    
    await session.save();

    // 检查是否需要自动回复（仅对用户消息且会话未分配时）
    if (user.role === 'user' && !session.assignedTo?.userId) {
      // 首先检查模板自动回复
      const autoReplyInfo = intelligentRoutingService.getAutoReply(message);
      let shouldUseAI = false;
      let aiResponse = null;

      if (autoReplyInfo && autoReplyInfo.shouldReply) {
        // 使用模板自动回复
        await this.sendAutoReply(sessionId, session, autoReplyInfo.response, req);
      } else {
        // 检查是否需要AI回复
        shouldUseAI = aiChatbotService.shouldUseAI(message, session);
        
        if (shouldUseAI) {
          try {
            // 获取会话消息历史作为上下文
            const messageHistory = await ChatMessage.find({ sessionId })
              .sort({ createdAt: -1 })
              .limit(10);

            // 生成AI回复
            aiResponse = await aiChatbotService.generateAIResponse(message, session, messageHistory);
            
            if (aiResponse) {
              await this.sendAutoReply(sessionId, session, aiResponse, req);
              
              // 检查是否需要转接人工客服
              if (aiChatbotService.shouldEscalateToHuman(aiResponse, message)) {
                console.log(`🚨 会话 ${sessionId} 需要转接人工客服`);
                // 提高会话优先级并重新分配
                session.priority = 'high';
                await session.save();
              }
            }
          } catch (error) {
            console.error('AI回复生成失败:', error);
            // AI回复失败时使用默认回复
            const defaultReply = "抱歉，我暂时无法处理您的问题。正在为您转接人工客服，请稍等...";
            await this.sendAutoReply(sessionId, session, defaultReply, req);
          }
        }
      }

      // 尝试重新分配会话（使用智能路由分析）
      if (!session.assignedTo?.userId) {
        const assignmentResult = await chatAssignmentService.assignSession(
          sessionId, 
          session.tags, 
          session.priority,
          message // 传递消息内容用于智能路由分析
        );

        if (assignmentResult) {
          // 通知客服有新会话分配
          const io = req.app.get('io');
          if (io) {
            io.to(`user-${assignmentResult.agent.userId}`).emit('session-assigned', {
              sessionId: session._id,
              session: session.toObject(),
              assignedBy: 'system',
              routingAnalysis: assignmentResult.routingAnalysis
            });
          }
        }
      }
    }
    
    res.status(201).json({
      success: true,
      message
    });
    
  } catch (error) {
    console.error('发送消息错误:', error);
    res.status(500).json({
      success: false,
      error: '发送消息失败'
    });
  }
};

// 标记消息为已读
const markMessagesAsRead = async (req, res) => {
  try {
    const { messageIds } = req.body;
    const userId = req.user.id;
    
    await ChatMessage.markAsRead(messageIds, userId);
    
    // 更新会话的未读消息计数
    const messages = await ChatMessage.find({ _id: { $in: messageIds } });
    const sessionIds = [...new Set(messages.map(msg => msg.sessionId))];
    
    for (const sessionId of sessionIds) {
      const session = await ChatSession.findById(sessionId);
      if (session) {
        session.resetUnreadCount(userId);
        await session.save();
      }
    }
    
    res.json({
      success: true,
      message: '消息已标记为已读'
    });
  } catch (error) {
    console.error('标记消息已读错误:', error);
    res.status(500).json({
      success: false,
      error: '标记消息失败'
    });
  }
};

// 关闭会话
const closeSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id;
    
    const session = await ChatSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        error: '会话不存在'
      });
    }
    
    // 只有参与者或管理员可以关闭会话
    const isParticipant = session.participants.some(
      p => p.userId.toString() === userId.toString()
    );
    
    if (!isParticipant && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: '无权关闭此会话'
      });
    }
    
    session.status = 'closed';
    session.duration.endedAt = new Date();
    session.duration.totalMinutes = Math.round(
      (session.duration.endedAt - session.duration.startedAt) / (1000 * 60)
    );
    
    await session.save();
    
    res.json({
      success: true,
      message: '会话已关闭'
    });
  } catch (error) {
    console.error('关闭会话错误:', error);
    res.status(500).json({
      success: false,
      error: '关闭会话失败'
    });
  }
};

// 获取客服统计数据
const getSupportStats = async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'support') {
      return res.status(403).json({
        success: false,
        error: '无权访问统计数据'
      });
    }
    
    const totalSessions = await ChatSession.countDocuments();
    const activeSessions = await ChatSession.countDocuments({ status: 'active' });
    const resolvedSessions = await ChatSession.countDocuments({ status: 'resolved' });
    const totalMessages = await ChatMessage.countDocuments();
    
    // 获取今日数据
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todaySessions = await ChatSession.countDocuments({
      createdAt: { $gte: today }
    });
    
    const todayMessages = await ChatMessage.countDocuments({
      createdAt: { $gte: today }
    });
    
    res.json({
      success: true,
      stats: {
        totalSessions,
        activeSessions,
        resolvedSessions,
        totalMessages,
        todaySessions,
        todayMessages
      }
    });
  } catch (error) {
    console.error('获取统计数据错误:', error);
    res.status(500).json({
      success: false,
      error: '获取统计数据失败'
    });
  }
};

// 撤回消息
const recallMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { reason } = req.body;
    const userId = req.user.id;
    
    const message = await ChatMessage.recallMessage(messageId, userId, reason);
    
    res.json({
      success: true,
      message: '消息已撤回',
      data: message
    });
  } catch (error) {
    console.error('撤回消息错误:', error);
    res.status(400).json({
      success: false,
      error: error.message || '撤回消息失败'
    });
  }
};

// 编辑消息
const editMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { content, richContent } = req.body;
    const userId = req.user.id;
    
    const message = await ChatMessage.editMessage(messageId, userId, content, richContent);
    
    res.json({
      success: true,
      message: '消息已编辑',
      data: message
    });
  } catch (error) {
    console.error('编辑消息错误:', error);
    res.status(400).json({
      success: false,
      error: error.message || '编辑消息失败'
    });
  }
};

// 获取消息编辑历史
const getMessageEditHistory = async (req, res) => {
  try {
    const { messageId } = req.params;
    
    const message = await ChatMessage.findById(messageId)
      .populate('editHistory.editorId', 'username avatar')
      .populate('recallInfo.recalledBy', 'username avatar');
    
    if (!message) {
      return res.status(404).json({
        success: false,
        error: '消息不存在'
      });
    }
    
    // 检查权限：只有消息参与者可以查看编辑历史
    const session = await ChatSession.findById(message.sessionId);
    const isParticipant = session.participants.some(
      p => p.userId.toString() === req.user.id.toString()
    );
    
    if (!isParticipant && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: '无权查看此消息的编辑历史'
      });
    }
    
    res.json({
      success: true,
      editHistory: message.editHistory,
      recallInfo: message.recallInfo
    });
  } catch (error) {
    console.error('获取消息编辑历史错误:', error);
    res.status(500).json({
      success: false,
      error: '获取消息编辑历史失败'
    });
  }
};

// 获取自动分配系统状态
const getAssignmentStatus = async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'support') {
      return res.status(403).json({
        success: false,
        error: '无权访问分配系统状态'
      });
    }

    const status = chatAssignmentService.getStatus();
    
    res.json({
      success: true,
      status
    });
  } catch (error) {
    console.error('获取分配状态错误:', error);
    res.status(500).json({
      success: false,
      error: '获取分配状态失败'
    });
  }
};

// 手动分配会话
const manualAssignSession = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: '无权手动分配会话'
      });
    }

    const { sessionId, agentId } = req.params;
    
    const result = await chatAssignmentService.manualAssign(sessionId, agentId);
    
    if (result.success) {
      // 通知客服有新会话分配
      const io = req.app.get('io');
      if (io) {
        io.to(`user-${agentId}`).emit('session-assigned', {
          sessionId: sessionId,
          session: result.session.toObject(),
          assignedBy: 'admin',
          adminName: req.user.username
        });
      }
      
      res.json({
        success: true,
        message: '会话分配成功',
        session: result.session
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('手动分配会话错误:', error);
    res.status(500).json({
      success: false,
      error: '分配会话失败'
    });
  }
};

// 更新客服可用状态
const updateAgentAvailability = async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'support') {
      return res.status(403).json({
        success: false,
        error: '无权更新客服状态'
      });
    }

    const { isAvailable, maxSessions, specialties, autoAccept } = req.body;
    
    // 更新数据库中的客服设置
    const updateData = {};
    if (isAvailable !== undefined) {
      updateData['supportSettings.isAvailable'] = isAvailable;
    }
    if (maxSessions !== undefined) {
      updateData['supportSettings.maxConcurrentSessions'] = maxSessions;
    }
    if (specialties !== undefined) {
      updateData['supportSettings.specialties'] = specialties;
    }
    if (autoAccept !== undefined) {
      updateData['supportSettings.autoAcceptSessions'] = autoAccept;
    }
    updateData['supportSettings.lastActivity'] = new Date();
    
    await User.findByIdAndUpdate(req.user.id, updateData);
    
    // 更新内存中的客服状态
    if (isAvailable !== undefined) {
      if (isAvailable) {
        // 获取Socket ID（这里简化处理，实际应该从Socket连接中获取）
        const agentData = chatAssignmentService.availableAgents.get(req.user.id);
        const socketId = agentData?.socketId || null;
        await chatAssignmentService.addAgent(req.user.id, socketId);
      } else {
        await chatAssignmentService.removeAgent(req.user.id);
      }
    }
    
    res.json({
      success: true,
      message: '客服状态更新成功'
    });
  } catch (error) {
    console.error('更新客服状态错误:', error);
    res.status(500).json({
      success: false,
      error: '更新客服状态失败'
    });
  }
};

// 更新会话优先级
const updateSessionPriority = async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'support') {
      return res.status(403).json({
        success: false,
        error: '无权更新会话优先级'
      });
    }

    const { sessionId } = req.params;
    const { priority } = req.body;
    
    // 验证优先级值
    const validPriorities = ['low', 'normal', 'high', 'urgent'];
    if (!validPriorities.includes(priority)) {
      return res.status(400).json({
        success: false,
        error: '无效的优先级值'
      });
    }

    const session = await ChatSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        error: '会话不存在'
      });
    }

    // 检查权限：只有管理员或分配给此会话的客服可以修改优先级
    const isAssignedAgent = session.assignedTo?.userId?.toString() === req.user.id.toString();
    if (!isAssignedAgent && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: '无权修改此会话的优先级'
      });
    }

    session.priority = priority;
    await session.save();

    res.json({
      success: true,
      message: '会话优先级更新成功',
      session
    });
  } catch (error) {
    console.error('更新会话优先级错误:', error);
    res.status(500).json({
      success: false,
      error: '更新会话优先级失败'
    });
  }
};

// 添加会话标签
const addSessionTag = async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'support') {
      return res.status(403).json({
        success: false,
        error: '无权添加会话标签'
      });
    }

    const { sessionId } = req.params;
    const { tag } = req.body;
    
    // 验证标签值
    const validTags = ['technical', 'billing', 'product', 'shipping', 'refund', 'general'];
    if (!validTags.includes(tag)) {
      return res.status(400).json({
        success: false,
        error: '无效的标签值'
      });
    }

    const session = await ChatSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        error: '会话不存在'
      });
    }

    // 检查权限：只有管理员或分配给此会话的客服可以添加标签
    const isAssignedAgent = session.assignedTo?.userId?.toString() === req.user.id.toString();
    if (!isAssignedAgent && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: '无权为此会话添加标签'
      });
    }

    // 避免重复标签
    if (!session.tags.includes(tag)) {
      session.tags.push(tag);
      await session.save();
    }

    res.json({
      success: true,
      message: '会话标签添加成功',
      tags: session.tags
    });
  } catch (error) {
    console.error('添加会话标签错误:', error);
    res.status(500).json({
      success: false,
      error: '添加会话标签失败'
    });
  }
};

// 移除会话标签
const removeSessionTag = async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'support') {
      return res.status(403).json({
        success: false,
        error: '无权移除会话标签'
      });
    }

    const { sessionId, tag } = req.params;
    
    const session = await ChatSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        error: '会话不存在'
      });
    }

    // 检查权限：只有管理员或分配给此会话的客服可以移除标签
    const isAssignedAgent = session.assignedTo?.userId?.toString() === req.user.id.toString();
    if (!isAssignedAgent && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: '无权从此会话移除标签'
      });
    }

    session.tags = session.tags.filter(t => t !== tag);
    await session.save();

    res.json({
      success: true,
      message: '会话标签移除成功',
      tags: session.tags
    });
  } catch (error) {
    console.error('移除会话标签错误:', error);
    res.status(500).json({
      success: false,
      error: '移除会话标签失败'
    });
  }
};

// 获取会话标签统计
const getTagStatistics = async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'support') {
      return res.status(403).json({
        success: false,
        error: '无权访问标签统计'
      });
    }

    const { startDate, endDate } = req.query;
    
    const matchStage = {};
    if (startDate && endDate) {
      matchStage.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const tagStats = await ChatSession.aggregate([
      { $match: matchStage },
      { $unwind: '$tags' },
      {
        $group: {
          _id: '$tags',
          count: { $sum: 1 },
          avgDuration: { $avg: '$duration.totalMinutes' },
          avgRating: { $avg: '$rating.score' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    res.json({
      success: true,
      statistics: tagStats
    });
  } catch (error) {
    console.error('获取标签统计错误:', error);
    res.status(500).json({
      success: false,
      error: '获取标签统计失败'
    });
  }
};

// 转接会话到另一个客服
const transferSession = async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'support') {
      return res.status(403).json({
        success: false,
        error: '无权转接会话'
      });
    }

    const { sessionId } = req.params;
    const { toAgentId, reason, comment } = req.body;

    // 验证转接原因
    const validReasons = ['busy', 'expertise', 'escalation', 'user_request', 'other'];
    if (!validReasons.includes(reason)) {
      return res.status(400).json({
        success: false,
        error: '无效的转接原因'
      });
    }

    const session = await ChatSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        error: '会话不存在'
      });
    }

    // 检查权限：只有当前分配的客服或管理员可以转接会话
    const isAssignedAgent = session.assignedTo?.userId?.toString() === req.user.id.toString();
    if (!isAssignedAgent && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: '无权转接此会话'
      });
    }

    // 获取目标客服信息
    const targetAgent = await User.findById(toAgentId);
    if (!targetAgent || (targetAgent.role !== 'support' && targetAgent.role !== 'admin')) {
      return res.status(400).json({
        success: false,
        error: '目标用户不是客服人员'
      });
    }

    // 执行转接
    session.transferSession(req.user.id, toAgentId, reason, comment);
    
    // 更新分配信息中的用户名
    session.assignedTo.username = targetAgent.username;
    
    // 更新转接历史中的目标客服用户名
    const lastTransfer = session.transferHistory[session.transferHistory.length - 1];
    lastTransfer.toAgent.username = targetAgent.username;
    
    await session.save();

    // 发送Socket通知
    const io = req.app.get('io');
    if (io) {
      io.to(`support-${toAgentId}`).emit('session-transferred', {
        sessionId: session._id,
        fromAgent: {
          userId: req.user.id,
          username: req.user.username
        },
        reason,
        comment
      });

      // 通知原客服
      io.to(`support-${req.user.id}`).emit('session-transfer-complete', {
        sessionId: session._id,
        toAgent: {
          userId: toAgentId,
          username: targetAgent.username
        }
      });
    }

    res.json({
      success: true,
      message: '会话转接成功',
      session
    });
  } catch (error) {
    console.error('转接会话错误:', error);
    res.status(500).json({
      success: false,
      error: '转接会话失败'
    });
  }
};

// 邀请客服协作
const inviteCollaborator = async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'support') {
      return res.status(403).json({
        success: false,
        error: '无权邀请协作'
      });
    }

    const { sessionId } = req.params;
    const { collaboratorId, role = 'observer' } = req.body;

    // 验证协作角色
    const validRoles = ['observer', 'participant', 'advisor'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        error: '无效的协作角色'
      });
    }

    const session = await ChatSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        error: '会话不存在'
      });
    }

    // 检查权限：只有当前分配的客服或管理员可以邀请协作
    const isAssignedAgent = session.assignedTo?.userId?.toString() === req.user.id.toString();
    if (!isAssignedAgent && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: '无权邀请协作到此会话'
      });
    }

    // 获取协作客服信息
    const collaborator = await User.findById(collaboratorId);
    if (!collaborator || (collaborator.role !== 'support' && collaborator.role !== 'admin')) {
      return res.status(400).json({
        success: false,
        error: '目标用户不是客服人员'
      });
    }

    // 添加协作客服
    session.addCollaborator(collaboratorId, collaborator.username, role);
    await session.save();

    // 发送Socket邀请通知
    const io = req.app.get('io');
    if (io) {
      io.to(`support-${collaboratorId}`).emit('collaboration-invite', {
      sessionId: session._id,
      inviter: {
        userId: req.user.id,
        username: req.user.username
      },
      role,
      sessionTitle: session.title || `会话 ${session._id.toString().slice(-6)}`
    });
    }

    res.json({
      success: true,
      message: '协作邀请已发送',
      session
    });
  } catch (error) {
    console.error('邀请协作错误:', error);
    res.status(500).json({
      success: false,
      error: '邀请协作失败'
    });
  }
};

// 加入协作会话
const joinCollaboration = async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'support') {
      return res.status(403).json({
        success: false,
        error: '无权加入协作'
      });
    }

    const { sessionId } = req.params;
    const { role = 'observer' } = req.body;

    const session = await ChatSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        error: '会话不存在'
      });
    }

    // 检查用户是否已经是协作客服
    if (session.isCollaborator(req.user.id)) {
      return res.status(400).json({
        success: false,
        error: '您已经在此会话的协作列表中'
      });
    }

    // 添加当前用户为协作客服
    session.addCollaborator(req.user.id, req.user.username, role);
    await session.save();

    // 发送Socket通知
    const io = req.app.get('io');
    if (io) {
      io.to(sessionId).emit('collaborator-joined', {
        sessionId: session._id,
        collaborator: {
          userId: req.user.id,
          username: req.user.username,
          role
        }
      });
    }

    res.json({
      success: true,
      message: '已成功加入协作会话',
      session
    });
  } catch (error) {
    console.error('加入协作错误:', error);
    res.status(500).json({
      success: false,
      error: '加入协作失败'
    });
  }
};

// 离开协作会话
const leaveCollaboration = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await ChatSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        error: '会话不存在'
      });
    }

    // 检查用户是否是协作客服
    if (!session.isCollaborator(req.user.id)) {
      return res.status(400).json({
        success: false,
        error: '您不在此会话的协作列表中'
      });
    }

    // 移除协作客服
    session.removeCollaborator(req.user.id);
    await session.save();

    // 发送Socket通知
    const io = req.app.get('io');
    if (io) {
      io.to(sessionId).emit('collaborator-left', {
      sessionId: session._id,
      collaborator: {
        userId: req.user.id,
        username: req.user.username
      }
    });
    }

    res.json({
      success: true,
      message: '已成功离开协作会话',
      session
    });
  } catch (error) {
    console.error('离开协作错误:', error);
    res.status(500).json({
      success: false,
      error: '离开协作失败'
    });
  }
};

// 获取协作会话列表
const getCollaborationSessions = async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'support') {
      return res.status(403).json({
        success: false,
        error: '无权访问协作会话列表'
      });
    }

    const sessions = await ChatSession.findUserCollaborationSessions(req.user.id);

    res.json({
      success: true,
      sessions
    });
  } catch (error) {
    console.error('获取协作会话列表错误:', error);
    res.status(500).json({
      success: false,
      error: '获取协作会话列表失败'
    });
  }
};

// 提交会话满意度评价
const submitSessionRating = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const {
      score,
      comment = '',
      dimensions = {},
      tags = [],
      wouldRecommend = true
    } = req.body;

    // 验证评分
    if (!score || score < 1 || score > 5 || !Number.isInteger(score)) {
      return res.status(400).json({
        success: false,
        error: '评分必须是1-5之间的整数'
      });
    }

    const session = await ChatSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        error: '会话不存在'
      });
    }

    // 检查用户是否是会话参与者
    const isParticipant = session.participants.some(
      p => p.userId.toString() === req.user.id.toString()
    );

    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        error: '您不是此会话的参与者，无法评价'
      });
    }

    // 检查是否已经评价过
    if (session.hasRating()) {
      return res.status(400).json({
        success: false,
        error: '此会话已经评价过'
      });
    }

    // 添加评价
    session.addRating({
      score,
      comment,
      ratedBy: req.user.id,
      dimensions,
      tags,
      wouldRecommend
    });

    await session.save();

    // 发送Socket通知（如果有客服在线）
    const io = req.app.get('io');
    if (io && session.assignedTo && session.assignedTo.userId) {
      io.to(`support-${session.assignedTo.userId}`).emit('session-rated', {
        sessionId: session._id,
        score,
        comment: comment.substring(0, 100) + (comment.length > 100 ? '...' : ''),
        ratedBy: {
          userId: req.user.id,
          username: req.user.username
        }
      });
    }

    res.json({
      success: true,
      message: '评价提交成功',
      rating: session.rating
    });
  } catch (error) {
    console.error('提交评价错误:', error);
    res.status(500).json({
      success: false,
      error: '评价提交失败'
    });
  }
};

// 获取会话评价详情
const getSessionRating = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await ChatSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        error: '会话不存在'
      });
    }

    // 检查权限：会话参与者、客服或管理员可以查看评价
    const isParticipant = session.participants.some(
      p => p.userId.toString() === req.user.id.toString()
    );
    const isSupportOrAdmin = ['admin', 'support'].includes(req.user.role);

    if (!isParticipant && !isSupportOrAdmin) {
      return res.status(403).json({
        success: false,
        error: '无权查看此会话的评价'
      });
    }

    if (!session.hasRating()) {
      return res.status(404).json({
        success: false,
        error: '此会话尚未评价'
      });
    }

    res.json({
      success: true,
      rating: session.rating
    });
  } catch (error) {
    console.error('获取评价错误:', error);
    res.status(500).json({
      success: false,
      error: '获取评价失败'
    });
  }
};

// 获取客服评分统计
const getAgentRatingStats = async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'support') {
      return res.status(403).json({
        success: false,
        error: '无权查看客服评分统计'
      });
    }

    const { agentId } = req.params;

    // 如果是客服查看自己的统计，需要验证权限
    if (req.user.role === 'support' && req.user.id !== agentId) {
      return res.status(403).json({
        success: false,
        error: '只能查看自己的评分统计'
      });
    }

    const stats = await ChatSession.getAgentRatingStats(agentId);

    res.json({
      success: true,
      stats: stats || {
        totalRatings: 0,
        averageRating: 0,
        ratingDistribution: []
      }
    });
  } catch (error) {
    console.error('获取客服评分统计错误:', error);
    res.status(500).json({
      success: false,
      error: '获取评分统计失败'
    });
  }
};

// 获取客服评分排名
const getAgentRatingRankings = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: '仅管理员可以查看评分排名'
      });
    }

    const rankings = await ChatSession.getAgentRatingRankings();

    res.json({
      success: true,
      rankings
    });
  } catch (error) {
    console.error('获取客服评分排名错误:', error);
    res.status(500).json({
      success: false,
      error: '获取评分排名失败'
    });
  }
};

// 获取整体评价统计
const getOverallRatingStats = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: '仅管理员可以查看整体统计'
      });
    }

    const { startDate, endDate } = req.query;

    const stats = await ChatSession.getRatingStats(startDate, endDate);
    const result = stats[0] || {
      totalRatings: 0,
      averageRating: 0,
      ratingDistribution: [],
      fiveStarRatings: 0,
      oneStarRatings: 0
    };

    // 计算评分分布
    const distribution = {
      1: result.ratingDistribution ? result.ratingDistribution.filter(s => s === 1).length : 0,
      2: result.ratingDistribution ? result.ratingDistribution.filter(s => s === 2).length : 0,
      3: result.ratingDistribution ? result.ratingDistribution.filter(s => s === 3).length : 0,
      4: result.ratingDistribution ? result.ratingDistribution.filter(s => s === 4).length : 0,
      5: result.ratingDistribution ? result.ratingDistribution.filter(s => s === 5).length : 0
    };

    res.json({
      success: true,
      stats: {
        totalRatings: result.totalRatings,
        averageRating: Math.round(result.averageRating * 10) / 10 || 0,
        distribution,
        fiveStarRatings: result.fiveStarRatings,
        oneStarRatings: result.oneStarRatings,
        nps: result.totalRatings > 0 ? 
          Math.round(((result.fiveStarRatings - result.oneStarRatings) / result.totalRatings) * 100) : 0
      }
    });
  } catch (error) {
    console.error('获取整体评价统计错误:', error);
    res.status(500).json({
      success: false,
      error: '获取统计失败'
    });
  }
};

// 发送自动回复消息的辅助方法
const sendAutoReply = async (sessionId, session, replyContent, req) => {
  // 创建自动回复消息
  const autoReplyMessage = new ChatMessage({
    sender: {
      userId: null, // 系统自动回复
      username: '系统助手',
      avatar: '/images/system-avatar.png',
      role: 'system'
    },
    content: replyContent,
    sessionId,
    isSupportMessage: true,
    messageType: 'text'
  });

  await autoReplyMessage.save();

  // 更新会话的最后消息
  session.lastMessage = {
    content: replyContent.length > 100 ? replyContent.substring(0, 100) + '...' : replyContent,
    senderId: null,
    timestamp: new Date()
  };

  // 增加所有用户的未读计数
  session.participants.forEach(participant => {
    session.updateUnreadCount(participant.userId.toString(), 1);
  });

  await session.save();

  console.log(`🤖 自动回复会话 ${sessionId}: ${replyContent.substring(0, 50)}...`);

  // 通过Socket通知客户端有新消息
  const io = req.app.get('io');
  if (io) {
    io.to(`session-${sessionId}`).emit('new-message', {
      message: autoReplyMessage.toObject()
    });
  }
};

module.exports = {
  getUserSessions,
  getSessionMessages,
  createSession,
  sendMessage,
  markMessagesAsRead,
  closeSession,
  getSupportStats,
  recallMessage,
  editMessage,
  getMessageEditHistory,
  getAssignmentStatus,
  manualAssignSession,
  updateAgentAvailability,
  updateSessionPriority,
  addSessionTag,
  removeSessionTag,
  getTagStatistics,
  transferSession,
  inviteCollaborator,
  joinCollaboration,
  leaveCollaboration,
  getCollaborationSessions,
  submitSessionRating,
  getSessionRating,
  getAgentRatingStats,
  getAgentRatingRankings,
  getOverallRatingStats,
  sendAutoReply
};