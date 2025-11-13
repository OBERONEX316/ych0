const ChatSession = require('../models/ChatSession');
const User = require('../models/User');
const intelligentRoutingService = require('./intelligentRoutingService');

class ChatAssignmentService {
  constructor() {
    this.availableAgents = new Map(); // 内存中维护在线客服状态
    this.sessionQueue = []; // 待分配会话队列
    this.isProcessing = false;
  }

  /**
   * 添加客服到可用列表
   */
  async addAgent(userId, socketId) {
    try {
      const user = await User.findById(userId);
      if (!user || (user.role !== 'admin' && user.role !== 'support')) {
        return false;
      }

      // 更新用户在线状态
      await User.findByIdAndUpdate(userId, {
        'supportSettings.isAvailable': true,
        'supportSettings.lastActivity': new Date()
      });

      this.availableAgents.set(userId, {
        socketId,
        userId,
        username: user.username,
        currentSessions: user.supportSettings.currentSessions || 0,
        maxSessions: user.supportSettings.maxConcurrentSessions || 5,
        specialties: user.supportSettings.specialties || [],
        responseTime: user.supportSettings.averageResponseTime || 0,
        satisfactionScore: user.supportSettings.satisfactionScore || 0,
        lastActivity: new Date()
      });

      console.log(`🛠️  客服 ${user.username} 上线，当前在线客服: ${this.availableAgents.size}`);
      return true;
    } catch (error) {
      console.error('添加客服错误:', error);
      return false;
    }
  }

  /**
   * 移除客服从可用列表
   */
  async removeAgent(userId) {
    try {
      await User.findByIdAndUpdate(userId, {
        'supportSettings.isAvailable': false
      });

      this.availableAgents.delete(userId);
      console.log(`🛠️  客服 ${userId} 下线，剩余在线客服: ${this.availableAgents.size}`);
    } catch (error) {
      console.error('移除客服错误:', error);
    }
  }

  /**
   * 按优先级添加会话到队列
   */
  addToQueue(queueItem) {
    const priorityWeights = {
      'urgent': 4,
      'high': 3,
      'normal': 2,
      'low': 1
    };

    // 计算当前项目的权重
    const currentWeight = priorityWeights[queueItem.priority] || 2;
    
    // 找到插入位置（按优先级降序）
    let insertIndex = 0;
    for (let i = 0; i < this.sessionQueue.length; i++) {
      const itemWeight = priorityWeights[this.sessionQueue[i].priority] || 2;
      if (currentWeight > itemWeight) {
        insertIndex = i;
        break;
      } else if (currentWeight === itemWeight) {
        // 相同优先级，按创建时间排序（先到先服务）
        if (queueItem.createdAt < this.sessionQueue[i].createdAt) {
          insertIndex = i;
          break;
        }
      }
      insertIndex = i + 1;
    }

    // 插入到正确位置
    this.sessionQueue.splice(insertIndex, 0, queueItem);
  }

  /**
   * 重新排序队列（当客服上线或优先级变化时）
   */
  reorderQueue() {
    const priorityWeights = {
      'urgent': 4,
      'high': 3,
      'normal': 2,
      'low': 1
    };

    this.sessionQueue.sort((a, b) => {
      const aWeight = priorityWeights[a.priority] || 2;
      const bWeight = priorityWeights[b.priority] || 2;
      
      if (bWeight !== aWeight) {
        return bWeight - aWeight; // 优先级高的在前
      }
      
      // 相同优先级，按创建时间排序
      return a.createdAt - b.createdAt;
    });
  }

  /**
   * 更新客服会话计数
   */
  async updateAgentSessionCount(userId, change) {
    try {
      const agent = this.availableAgents.get(userId);
      if (agent) {
        agent.currentSessions += change;
        
        // 更新数据库
        await User.findByIdAndUpdate(userId, {
          'supportSettings.currentSessions': agent.currentSessions,
          'supportSettings.lastActivity': new Date()
        });

        // 如果会话数达到上限，从可用列表中移除
        if (agent.currentSessions >= agent.maxSessions) {
          this.availableAgents.delete(userId);
          console.log(`📊 客服 ${agent.username} 会话数已达上限 (${agent.currentSessions}/${agent.maxSessions})`);
        }
      }
    } catch (error) {
      console.error('更新客服会话计数错误:', error);
    }
  }

  /**
   * 获取最适合的客服
   */
  getBestAgent(sessionTags = []) {
    if (this.availableAgents.size === 0) {
      return null;
    }

    const agents = Array.from(this.availableAgents.values());
    
    // 过滤掉会话数已达上限的客服
    const availableAgents = agents.filter(agent => 
      agent.currentSessions < agent.maxSessions
    );

    if (availableAgents.length === 0) {
      return null;
    }

    // 评分算法：综合考虑专业匹配度、会话负载、响应时间和满意度
    const scoredAgents = availableAgents.map(agent => {
      let score = 100;

      // 专业匹配度（最高+50分）
      const specialtyMatch = sessionTags.filter(tag => 
        agent.specialties.includes(tag)
      ).length;
      score += specialtyMatch * 10;

      // 会话负载（当前会话数越少，分数越高，最高+30分）
      const loadFactor = (agent.maxSessions - agent.currentSessions) / agent.maxSessions;
      score += loadFactor * 30;

      // 响应时间（响应时间越短，分数越高，最高+10分）
      if (agent.responseTime > 0) {
        const responseFactor = Math.max(0, 1 - (agent.responseTime / 300)); // 5分钟为基准
        score += responseFactor * 10;
      }

      // 满意度（满意度越高，分数越高，最高+10分）
      score += agent.satisfactionScore * 2;

      return { agent, score };
    });

    // 按分数降序排序
    scoredAgents.sort((a, b) => b.score - a.score);

    console.log('客服评分结果:', scoredAgents.map(a => ({
      username: a.agent.username,
      score: a.score,
      sessions: `${a.agent.currentSessions}/${a.agent.maxSessions}`,
      specialties: a.agent.specialties
    })));

    return scoredAgents[0]?.agent || null;
  }

  /**
   * 分配会话给客服（集成智能路由）
   */
  async assignSession(sessionId, sessionTags = [], priority = 'normal', message = null) {
    try {
      const session = await ChatSession.findById(sessionId);
      if (!session || session.assignedTo?.userId) {
        return null; // 会话不存在或已分配
      }

      // 使用智能路由分析会话
      const routingAnalysis = intelligentRoutingService.analyzeSession(session, message);
      
      // 更新会话优先级和标签（基于路由分析）
      if (routingAnalysis.priority !== session.priority) {
        session.priority = routingAnalysis.priority;
        await session.save();
        console.log(`📊 智能路由更新会话 ${sessionId} 优先级: ${session.priority} → ${routingAnalysis.priority}`);
      }

      // 合并路由分析所需的专业领域和原始标签
      const effectiveTags = [...new Set([...sessionTags, ...routingAnalysis.requiredSpecialties])];

      const bestAgent = this.getBestAgent(effectiveTags);
      if (!bestAgent) {
        // 没有可用客服，加入队列（按优先级排序）
        const queueItem = { 
          sessionId, 
          sessionTags: effectiveTags, 
          priority: routingAnalysis.priority, 
          createdAt: new Date(),
          routingAnalysis: routingAnalysis.appliedRules
        };
        this.addToQueue(queueItem);
        console.log(`⏳ 会话 ${sessionId} (优先级: ${routingAnalysis.priority}, 路由规则: ${routingAnalysis.appliedRules.join(', ')}) 加入等待队列，队列长度: ${this.sessionQueue.length}`);
        return null;
      }

      // 分配会话
      session.assignedTo = {
        userId: bestAgent.userId,
        username: bestAgent.username
      };
      session.tags = effectiveTags; // 更新标签
      await session.save();

      // 更新客服会话计数
      await this.updateAgentSessionCount(bestAgent.userId, 1);

      console.log(`✅ 会话 ${sessionId} 通过智能路由分配给客服 ${bestAgent.username} (规则: ${routingAnalysis.appliedRules.join(', ')})`);
      
      return {
        agent: bestAgent,
        session: session,
        routingAnalysis: routingAnalysis
      };
    } catch (error) {
      console.error('分配会话错误:', error);
      return null;
    }
  }

  /**
   * 处理等待队列中的会话
   */
  async processQueue() {
    if (this.isProcessing || this.sessionQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      while (this.sessionQueue.length > 0 && this.availableAgents.size > 0) {
        const queuedSession = this.sessionQueue.shift();
        
        // 检查会话是否仍然需要分配
        const session = await ChatSession.findById(queuedSession.sessionId);
        if (session && !session.assignedTo?.userId) {
          await this.assignSession(queuedSession.sessionId, queuedSession.sessionTags);
        }

        // 短暂延迟，避免过度处理
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } catch (error) {
      console.error('处理队列错误:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * 手动分配会话（管理员操作）
   */
  async manualAssign(sessionId, agentId) {
    try {
      const session = await ChatSession.findById(sessionId);
      const agent = await User.findById(agentId);

      if (!session || !agent) {
        return { success: false, error: '会话或客服不存在' };
      }

      if (agent.role !== 'admin' && agent.role !== 'support') {
        return { success: false, error: '用户不是客服' };
      }

      // 检查客服是否在线且有容量
      const agentData = this.availableAgents.get(agentId);
      if (!agentData || agentData.currentSessions >= agentData.maxSessions) {
        return { success: false, error: '客服不可用或会话数已达上限' };
      }

      session.assignedTo = {
        userId: agent._id,
        username: agent.username
      };
      await session.save();

      // 更新客服会话计数
      await this.updateAgentSessionCount(agentId, 1);

      console.log(`👨‍💼 管理员手动分配会话 ${sessionId} 给客服 ${agent.username}`);

      return { success: true, session };
    } catch (error) {
      console.error('手动分配错误:', error);
      return { success: false, error: '分配失败' };
    }
  }

  /**
   * 获取系统状态
   */
  getStatus() {
    return {
      onlineAgents: this.availableAgents.size,
      queuedSessions: this.sessionQueue.length,
      availableAgents: Array.from(this.availableAgents.values()).map(agent => ({
        userId: agent.userId,
        username: agent.username,
        currentSessions: agent.currentSessions,
        maxSessions: agent.maxSessions,
        specialties: agent.specialties
      })),
      queue: this.sessionQueue.map(item => ({
        sessionId: item.sessionId,
        waitingTime: Math.floor((new Date() - item.createdAt) / 1000),
        tags: item.sessionTags
      }))
    };
  }

  /**
   * 启动队列处理定时器
   */
  startQueueProcessor() {
    setInterval(() => {
      this.processQueue();
    }, 5000); // 每5秒检查一次队列

    console.log('🚀 聊天会话队列处理器已启动');
  }
}

// 创建单例实例
const chatAssignmentService = new ChatAssignmentService();

module.exports = chatAssignmentService;