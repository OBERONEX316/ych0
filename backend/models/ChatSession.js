const mongoose = require('mongoose');

const chatSessionSchema = new mongoose.Schema({
  // 会话参与者
  participants: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    username: {
      type: String,
      required: true
    },
    avatar: String,
    role: {
      type: String,
      enum: ['user', 'admin', 'support'],
      required: true
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    isOnline: {
      type: Boolean,
      default: false
    },
    lastSeen: Date
  }],
  
  // 会话信息
  title: {
    type: String,
    trim: true,
    maxlength: 100
  },
  
  // 会话类型
  sessionType: {
    type: String,
    enum: ['user_support', 'group_support', 'user_to_user'],
    default: 'user_support'
  },
  
  // 会话状态
  status: {
    type: String,
    enum: ['active', 'resolved', 'closed', 'archived'],
    default: 'active'
  },
  
  // 优先级
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  
  // 会话标签
  tags: [{
    type: String,
    enum: ['technical', 'billing', 'product', 'shipping', 'refund', 'general']
  }],
  
  // 最后一条消息
  lastMessage: {
    content: String,
    senderId: mongoose.Schema.Types.ObjectId,
    timestamp: Date
  },
  
  // 未读消息计数
  unreadCount: {
    type: Map,
    of: Number,
    default: {}
  },
  
  // 会话元数据
  metadata: {
    userAgent: String,
    ipAddress: String,
    referrer: String,
    pageUrl: String
  },
  
  // 分配给哪个客服
  assignedTo: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    username: String
  },
  
  // 会话评分和满意度评价
  rating: {
    score: {
      type: Number,
      min: 1,
      max: 5,
      validate: {
        validator: Number.isInteger,
        message: '评分必须是整数'
      }
    },
    comment: {
      type: String,
      maxlength: 500
    },
    ratedAt: {
      type: Date,
      default: Date.now
    },
    ratedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    // 评价维度
    dimensions: {
      responseTime: {
        type: Number,
        min: 1,
        max: 5
      },
      professionalism: {
        type: Number,
        min: 1,
        max: 5
      },
      problemResolution: {
        type: Number,
        min: 1,
        max: 5
      },
      communication: {
        type: Number,
        min: 1,
        max: 5
      }
    },
    // 评价标签
    tags: [{
      type: String,
      enum: ['quick_response', 'helpful', 'friendly', 'knowledgeable', 'patient', 'efficient', 'thorough']
    }],
    // 是否推荐
    wouldRecommend: {
      type: Boolean,
      default: true
    },
    // 评价状态
    status: {
      type: String,
      enum: ['pending', 'submitted', 'reviewed', 'flagged'],
      default: 'submitted'
    }
  },
  
  // 会话持续时间
  duration: {
    startedAt: {
      type: Date,
      default: Date.now
    },
    endedAt: Date,
    totalMinutes: Number
  },

  // 转接历史
  transferHistory: [{
    fromAgent: {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      username: String
    },
    toAgent: {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      username: String
    },
    reason: {
      type: String,
      enum: ['busy', 'expertise', 'escalation', 'user_request', 'other']
    },
    comment: String,
    transferredAt: {
      type: Date,
      default: Date.now
    }
  }],

  // 协作状态
  collaboration: {
    isCollaborative: {
      type: Boolean,
      default: false
    },
    collaboratingAgents: [{
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      username: String,
      joinedAt: {
        type: Date,
        default: Date.now
      },
      role: {
        type: String,
        enum: ['observer', 'participant', 'advisor']
      }
    }],
    lastCollaborationActivity: Date
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// 创建索引
chatSessionSchema.index({ 'participants.userId': 1, status: 1 });
chatSessionSchema.index({ status: 1, priority: 1 });
chatSessionSchema.index({ 'assignedTo.userId': 1 });
chatSessionSchema.index({ createdAt: -1 });

// 虚拟字段：获取会话中的用户ID列表
chatSessionSchema.virtual('userIds').get(function() {
  return this.participants.map(p => p.userId.toString());
});

// 虚拟字段：检查会话是否包含用户
chatSessionSchema.virtual('hasUser').get(function() {
  return this.participants.some(p => p.role === 'user');
});

// 虚拟字段：检查会话是否包含客服
chatSessionSchema.virtual('hasSupport').get(function() {
  return this.participants.some(p => p.role === 'support' || p.role === 'admin');
});

// 静态方法：查找用户的活跃会话
chatSessionSchema.statics.findUserSessions = async function(userId) {
  return this.find({
    'participants.userId': userId,
    status: { $in: ['active', 'resolved'] }
  }).sort({ updatedAt: -1 });
};

// 静态方法：查找需要分配的会话（未分配客服的会话）
chatSessionSchema.statics.findUnassignedSessions = async function() {
  return this.find({
    'assignedTo.userId': { $exists: false },
    status: 'active',
    'participants.role': 'user'
  }).sort({ createdAt: 1 });
};

// 实例方法：添加参与者
chatSessionSchema.methods.addParticipant = function(userId, username, role = 'user', avatar = null) {
  const existingParticipant = this.participants.find(
    p => p.userId.toString() === userId.toString()
  );
  
  if (!existingParticipant) {
    this.participants.push({
      userId,
      username,
      role,
      avatar,
      joinedAt: new Date()
    });
  }
  
  return this;
};

// 实例方法：更新未读消息计数
chatSessionSchema.methods.updateUnreadCount = function(userId, count = 1) {
  const currentCount = this.unreadCount.get(userId.toString()) || 0;
  this.unreadCount.set(userId.toString(), currentCount + count);
  return this;
};

// 实例方法：重置未读消息计数
chatSessionSchema.methods.resetUnreadCount = function(userId) {
  this.unreadCount.set(userId.toString(), 0);
  return this;
};

// 实例方法：转接会话到另一个客服
chatSessionSchema.methods.transferSession = function(fromAgentId, toAgentId, reason = 'other', comment = '') {
  // 记录转接历史
  this.transferHistory.push({
    fromAgent: {
      userId: fromAgentId,
      username: this.assignedTo?.username || ''
    },
    toAgent: {
      userId: toAgentId,
      username: '' // 将在控制器中填充
    },
    reason,
    comment,
    transferredAt: new Date()
  });

  // 更新分配信息
  this.assignedTo = {
    userId: toAgentId,
    username: '' // 将在控制器中填充
  };

  return this;
};

// 实例方法：添加协作客服
chatSessionSchema.methods.addCollaborator = function(userId, username, role = 'observer') {
  const existingCollaborator = this.collaboration.collaboratingAgents.find(
    agent => agent.userId.toString() === userId.toString()
  );

  if (!existingCollaborator) {
    this.collaboration.collaboratingAgents.push({
      userId,
      username,
      role,
      joinedAt: new Date()
    });
    this.collaboration.isCollaborative = true;
    this.collaboration.lastCollaborationActivity = new Date();
  }

  return this;
};

// 实例方法：移除协作客服
chatSessionSchema.methods.removeCollaborator = function(userId) {
  this.collaboration.collaboratingAgents = this.collaboration.collaboratingAgents.filter(
    agent => agent.userId.toString() !== userId.toString()
  );

  // 如果没有协作客服了，关闭协作模式
  if (this.collaboration.collaboratingAgents.length === 0) {
    this.collaboration.isCollaborative = false;
  }

  this.collaboration.lastCollaborationActivity = new Date();
  return this;
};

// 实例方法：检查用户是否是协作客服
chatSessionSchema.methods.isCollaborator = function(userId) {
  return this.collaboration.collaboratingAgents.some(
    agent => agent.userId.toString() === userId.toString()
  );
};

// 静态方法：查找需要协作的会话
chatSessionSchema.statics.findSessionsNeedingCollaboration = async function() {
  return this.find({
    'collaboration.isCollaborative': true,
    status: 'active'
  }).sort({ 'collaboration.lastCollaborationActivity': -1 });
};

// 静态方法：查找用户的协作会话
chatSessionSchema.statics.findUserCollaborationSessions = async function(userId) {
  return this.find({
    'collaboration.collaboratingAgents.userId': userId,
    status: 'active'
  }).sort({ updatedAt: -1 });
};

// 实例方法：添加满意度评价
chatSessionSchema.methods.addRating = function(ratingData) {
  const {
    score,
    comment = '',
    ratedBy,
    dimensions = {},
    tags = [],
    wouldRecommend = true
  } = ratingData;
  
  this.rating = {
    score,
    comment,
    ratedBy,
    dimensions: {
      responseTime: dimensions.responseTime || null,
      professionalism: dimensions.professionalism || null,
      problemResolution: dimensions.problemResolution || null,
      communication: dimensions.communication || null
    },
    tags,
    wouldRecommend,
    ratedAt: new Date(),
    status: 'submitted'
  };
  
  return this;
};

// 实例方法：检查是否已评价
chatSessionSchema.methods.hasRating = function() {
  return !!this.rating && !!this.rating.score;
};

// 实例方法：获取平均维度评分
chatSessionSchema.methods.getAverageDimensionScore = function() {
  if (!this.rating || !this.rating.dimensions) {
    return null;
  }
  
  const dimensions = this.rating.dimensions;
  const validScores = Object.values(dimensions).filter(score => score !== null && score !== undefined);
  
  if (validScores.length === 0) {
    return null;
  }
  
  const sum = validScores.reduce((total, score) => total + score, 0);
  return Math.round((sum / validScores.length) * 10) / 10;
};

// 静态方法：获取客服评分统计
chatSessionSchema.statics.getAgentRatingStats = async function(agentId) {
  const stats = await this.aggregate([
    {
      $match: {
        'assignedTo.userId': new mongoose.Types.ObjectId(agentId),
        'rating.score': { $exists: true }
      }
    },
    {
      $group: {
        _id: '$assignedTo.userId',
        totalRatings: { $sum: 1 },
        averageRating: { $avg: '$rating.score' },
        ratingDistribution: {
          $push: '$rating.score'
        },
        averageResponseTime: { $avg: '$rating.dimensions.responseTime' },
        averageProfessionalism: { $avg: '$rating.dimensions.professionalism' },
        averageProblemResolution: { $avg: '$rating.dimensions.problemResolution' },
        averageCommunication: { $avg: '$rating.dimensions.communication' }
      }
    }
  ]);
  
  return stats[0] || null;
};

// 静态方法：获取所有客服的评分排名
chatSessionSchema.statics.getAgentRatingRankings = async function() {
  return this.aggregate([
    {
      $match: {
        'rating.score': { $exists: true }
      }
    },
    {
      $group: {
        _id: '$assignedTo.userId',
        agentName: { $first: '$assignedTo.username' },
        totalRatings: { $sum: 1 },
        averageRating: { $avg: '$rating.score' },
        lastRatingDate: { $max: '$rating.ratedAt' }
      }
    },
    {
      $match: {
        totalRatings: { $gte: 5 } // 至少5个评价才参与排名
      }
    },
    {
      $sort: {
        averageRating: -1,
        totalRatings: -1
      }
    }
  ]);
};

// 静态方法：获取评价统计（按时间范围）
chatSessionSchema.statics.getRatingStats = async function(startDate, endDate) {
  const matchStage = {
    'rating.score': { $exists: true }
  };
  
  if (startDate && endDate) {
    matchStage['rating.ratedAt'] = {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    };
  }
  
  return this.aggregate([
    {
      $match: matchStage
    },
    {
      $group: {
        _id: null,
        totalRatings: { $sum: 1 },
        averageRating: { $avg: '$rating.score' },
        ratingDistribution: {
          $push: '$rating.score'
        },
        fiveStarRatings: {
          $sum: { $cond: [{ $eq: ['$rating.score', 5] }, 1, 0] }
        },
        oneStarRatings: {
          $sum: { $cond: [{ $eq: ['$rating.score', 1] }, 1, 0] }
        }
      }
    }
  ]);
};

module.exports = mongoose.model('ChatSession', chatSessionSchema);